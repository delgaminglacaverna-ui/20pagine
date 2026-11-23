const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createService, replay, finish } = require('../lib/matches.cjs');
const { createRedis } = require('../lib/redis.cjs');
function memoryStore() {
  const values = new Map();
  return {
    values, limit: async () => true,
    get: async id => values.get(id) || null,
    create: async (id, value) => { if (values.has(id)) return null; values.set(id, value); return 'OK'; },
    cas: async (id, previous, next) => { if (values.get(id) !== previous) return 0; values.set(id, next); return 1; },
  };
}
const request = (service, method, id, action, token, body) => service({ method, id, action, token, body, ip: 'test' });
const rejects = (promise, status) => assert.rejects(promise, error => error.status === status);
test('create, concurrent join, reconnect, legal move, retry, auth, resignation, expiry', async () => {
  const store = memoryStore(), service = createService(store);
  const white = await request(service, 'POST');
  assert.equal(white.color, 1); assert.equal(white.status, 'waiting');
  assert.match(white.id, /^[A-Z0-9]{8}$/);
  assert(!store.values.get(white.id).includes(white.token), 'only token hashes are stored');
  const joined = await Promise.allSettled([1, 2].map(() => request(service, 'POST', white.id, 'join')));
  assert.equal(joined.filter(x => x.status === 'fulfilled').length, 1);
  const black = joined.find(x => x.status === 'fulfilled').value;
  assert.equal(black.color, -1); assert.equal(black.status, 'active');
  assert.equal((await request(service, 'POST', white.id, 'join', black.token)).token, black.token);
  const spectator = await request(service, 'GET', white.id);
  assert.equal(spectator.color, 0);
  for (const key of ['white', 'black', 'token']) assert(!(key in spectator));
  await rejects(request(service, 'POST', white.id, 'move', undefined, { move: '80,70,0', ply: 0 }), 401);
  await rejects(request(service, 'POST', white.id, 'move', black.token, { move: '10,20,0', ply: 0 }), 409);
  await rejects(request(service, 'POST', white.id, 'move', white.token, { move: '80,0,0', ply: 0 }), 400);
  const moves = await Promise.all([1, 2].map(() => request(service, 'POST', white.id, 'move', white.token, { move: '80,70,0', ply: 0, end: 'mate' })));
  assert.equal(moves[0].moves.length, 1); assert.equal(moves[1].moves.length, 1);
  assert.equal(moves[0].status, 'active', 'ignore forged end claim');
  const second = await request(service, 'POST', white.id, 'move', black.token, { move: '10,20,0', ply: 1 });
  assert.equal(second.moves.length, 2);
  await rejects(request(service, 'POST', white.id, 'move', white.token, { move: '81,71,0', ply: 0 }), 409);
  const resigned = await request(service, 'POST', white.id, 'resign', black.token);
  assert.equal(resigned.winner, 'white'); assert.equal(resigned.reason, 'resign');
  await rejects(request(service, 'POST', white.id, 'move', white.token, { move: '81,71,0', ply: 2 }), 409);
  store.values.delete(white.id);
  await rejects(request(service, 'GET', white.id), 404);
});
test('waiting cancellation, routing/method validation and rate limiting', async () => {
  const store = memoryStore(), service = createService(store);
  await rejects(request(service, 'GET'), 405);
  await rejects(request(service, 'POST', 'BAD', 'join'), 400);
  await rejects(request(service, 'POST', '12345678', 'delete'), 404);
  const white = await request(service, 'POST');
  const cancelled = await request(service, 'POST', white.id, 'resign', white.token);
  assert.equal(cancelled.reason, 'cancel'); assert.equal(cancelled.winner, null);
  store.limit = async () => false;
  await rejects(request(service, 'POST'), 429);
});
test('server detects repetition and fifty-move draw, not client claims', () => {
  const { pos } = replay([]), match = { status: 'active' };
  finish(match, pos, [pos.key(), pos.key(), pos.key()]);
  assert.equal(match.reason, 'repetition'); assert.equal(match.winner, 'draw');
  const fifty = { status: 'active' }; pos.half = 100;
  finish(fifty, pos, [pos.key()]); assert.equal(fifty.reason, 'fifty');
});
test('Upstash adapter configuration, TTL, atomic CAS and error handling', async () => {
  assert.throws(() => createRedis({}), error => error.status === 503);
  const calls = [], env = { UPSTASH_REDIS_REST_URL: 'https://example.test/', UPSTASH_REDIS_REST_TOKEN: 'test-secret' };
  const redis = createRedis(env, async (url, options) => {
    assert.equal(url, 'https://example.test');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    calls.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ result: 1 }) };
  });
  await redis.create('ABC', '{}'); assert.deepEqual(calls[0].slice(-3), ['EX', 86400, 'NX']);
  await redis.cas('ABC', 'old', 'new'); assert.equal(calls[1][0], 'EVAL');
  assert.deepEqual(calls[1].slice(-3), ['old', 'new', 86400]);
  assert.equal(await redis.limit('test', 10), true);
  const broken = createRedis(env, async () => ({ ok: false }));
  await assert.rejects(broken.get('ABC'));
});
test('HTTP function returns useful config errors and rejects malformed input', async () => {
  const handler = require('../api/matches.js');
  const names = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const saved = names.map(name => process.env[name]); names.forEach(name => delete process.env[name]);
  async function call(body) {
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method: 'POST', headers: {}, query: {}, body }, response);
    return response;
  }
  try {
    const missing = await call({}); assert.equal(missing.code, 503); assert.match(missing.data.error, /UPSTASH_REDIS_REST_URL/);
    assert.match(missing.headers['Cache-Control'], /no-store/);
    assert.equal((await call('{bad')).code, 400);
    assert.equal((await call([])).code, 400);
    assert.equal((await call({ huge: 'x'.repeat(2049) })).code, 413);
  } finally { names.forEach((name, i) => { if (saved[i] !== undefined) process.env[name] = saved[i]; }); }
});
test('different simultaneous moves cannot overwrite each other', async () => {
  const store = memoryStore(), service = createService(store);
  const white = await request(service, 'POST');
  await request(service, 'POST', white.id, 'join');
  const responses = await Promise.allSettled(['80,70,0', '81,71,0'].map(move => request(service, 'POST', white.id, 'move', white.token, { move, ply: 0 })));
  assert.equal(responses.filter(x => x.status === 'fulfilled').length, 1);
  const failure = responses.find(x => x.status === 'rejected').reason;
  assert.equal(failure.status, 409); assert.equal(failure.state.moves.length, 1);
  assert.equal(JSON.parse(store.values.get(white.id)).moves.length, 1);
});
test('server adjudicates mate, stalemate and insufficient material', () => {
  for (const reason of ['mate', 'stalemate', 'insufficient']) {
    const match = { status: 'active' };
    const pos = { turn: -1, legalMoves: () => reason === 'insufficient' ? [{}] : [], inCheck: () => reason === 'mate', insufficientMaterial: () => true };
    finish(match, pos, []);
    assert.equal(match.reason, reason); assert.equal(match.status, 'over');
    assert.equal(match.winner, reason === 'mate' ? 'white' : 'draw');
  }
});
test('Vercel routes target the same Node handler and static output includes assets', () => {
  const fs = require('node:fs');
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.equal(config.outputDirectory, 'public');
  assert.equal(config.rewrites.filter(route => route.source.startsWith('/api/matches/')).length, 2);
  assert(config.rewrites.some(route => route.source === '/api/matches/:id/:action' && route.destination === '/api/matches?id=:id&action=:action'));
  assert(config.rewrites.some(route => route.source === '/api/matches/:id' && route.destination === '/api/matches?id=:id'));
  assert(fs.existsSync('api/matches.js'));
});
test('online variants are personal, French restrictions are server-enforced and reconnect cannot change them', async () => {
  const service = createService(memoryStore());
  const white = await request(service, 'POST', undefined, undefined, undefined, { variant: 'french' });
  const black = await request(service, 'POST', white.id, 'join', undefined, { variant: 'risio' });
  assert.deepEqual(black.frenchSides, [1]);
  await rejects(request(service, 'POST', white.id, 'move', white.token, { ply: 0, move: '92,71,0', variant: 'normal' }), 400);
  await request(service, 'POST', white.id, 'move', white.token, { ply: 0, move: '85,65,0' });
  const state = await request(service, 'POST', white.id, 'move', black.token, { ply: 1, move: '2,21,0' });
  assert.equal(state.moves.length, 2, 'normal-rules opponent can move left');
  const reconnect = await request(service, 'POST', white.id, 'join', white.token, { variant: 'normal' });
  assert.equal(reconnect.variants.white, 'french');
  assert.deepEqual(reconnect.frenchSides, [1]);
  const { pos } = replay(state.moves, state.variants);
  assert(pos.legalMoves().every(m => m.to % 10 >= m.from % 10));
  const white2 = await request(service, 'POST', undefined, undefined, undefined, { variant: 'normal' });
  const black2 = await request(service, 'POST', white2.id, 'join', undefined, { variant: 'french' });
  await request(service, 'POST', white2.id, 'move', white2.token, { ply: 0, move: '92,71,0' });
  await rejects(request(service, 'POST', white2.id, 'move', black2.token, { ply: 1, move: '2,21,0' }), 400);
});
test('invalid online variants are rejected without changing an existing seat', async () => {
  const service = createService(memoryStore());
  await rejects(request(service, 'POST', undefined, undefined, undefined, { variant: 'arbitrary' }), 400);
  const white = await request(service, 'POST');
  await rejects(request(service, 'POST', white.id, 'join', undefined, { variant: 'arbitrary' }), 400);
});
