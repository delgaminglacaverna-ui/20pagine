const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rules = require('../lib/coach-rules.cjs');
const { context, explain } = require('../lib/coach.cjs');
function body() {
  const { rr } = rules(), pos = new rr(), moves = pos.legalMoves();
  return { moves: [moves[0]], alternative: moves[1], french: false, loss: 150, depth: 2 };
}
test('coach API validates legal moves and supplies concrete played and better squares without an API key', async () => {
  const data = body(), facts = context(data);
  const result = await explain(data, 'test', { env: {} });
  assert.equal(result.source, 'engine');
  assert(result.comment.includes(facts.played.notation));
  assert(result.comment.includes(facts.alternative.notation));
  assert(result.comment.includes('1.50'));
  assert.throws(() => context({ ...data, moves: [{ from: -1, to: 999 }] }));
  assert.throws(() => context({ ...data, alternative: { from: 0, to: 99 } }));
});
test('optional AI explanation uses fixed provider, bounded facts and durable limits, falls back on failure', async () => {
  let calls = 0;
  const options = { env: { OPENAI_API_KEY: 'test-key' }, store: { limit: async () => true }, request: async (url, request) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const payload = JSON.parse(request.body); assert.equal(payload.messages.length, 2);
    assert(JSON.parse(payload.messages[1].content).played.notation);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Spiegazione di prova.' } }] }) };
  } };
  assert.equal((await explain(body(), 'test', options)).source, 'ai'); assert.equal(calls, 1);
  assert.equal((await explain(body(), 'test', { ...options, store: { limit: async () => false } })).source, 'engine'); assert.equal(calls, 1);
  assert.equal((await explain(body(), 'test', { ...options, request: async () => { throw Error('offline'); } })).source, 'engine');
});
test('endpoint rejects cross-origin, oversized and malformed requests', async () => {
  const handler = require('../api/coach.js');
  async function call(req) {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler(req, res); return res;
  }
  const headers = { host: 'site.test', origin: 'https://site.test', 'content-type': 'application/json' };
  assert.equal((await call({ method: 'GET', headers })).code, 405);
  assert.equal((await call({ method: 'POST', headers: { ...headers, origin: 'https://evil.test' }, body: body() })).code, 403);
  assert.equal((await call({ method: 'POST', headers, body: '{bad' })).code, 400);
  assert.equal((await call({ method: 'POST', headers: { ...headers, 'content-length': '999999' }, body: body() })).code, 413);
});
test('known opening prefixes are Theory and deviations are not, including loaded openings', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const c = vm.createContext({ self: {}, RISIO_MODE: false });
  vm.runInContext(fs.readFileSync('assets/coach-worker.js', 'utf8'), c);
  vm.runInContext(html.slice(html.indexOf('const Kf ='), html.indexOf('function $h(')), c);
  vm.runInContext(html.slice(html.indexOf('const Ih ='), html.indexOf('function Ph(')), c);
  assert.equal(vm.runInContext('openingTheory([])', c), null);
  vm.runInContext(`const game = kh(); const first = game.pos.legalMoves().find(m => Ge(m.from) + Ge(m.to) === 'f2f4'); Iu(game, first, true);`, c);
  assert.equal(vm.runInContext('game.notes[0].review.symbol', c), '📖');
  assert.equal(vm.runInContext('game.notes[0].review.label', c), 'Theory');
  assert.equal(vm.runInContext("openingTheory([{ from: nr('f2'), to: nr('f3') }])", c), null);
});
test('browser requests explanations from same-origin API and preserves local fallback on network errors', async () => {
  let requested;
  const c = vm.createContext({ AbortController, setTimeout, clearTimeout, fetch: async (url, options) => {
    requested = { url, options };
    return { ok: true, json: async () => ({ comment: 'Meglio f2–f4.', source: 'engine' }) };
  } });
  vm.runInContext(fs.readFileSync('assets/move-coach.js', 'utf8'), c);
  const data = body();
  const result = await new Promise(resolve => c.MoveCoach.explain(data.moves, false, data, resolve));
  assert.equal(requested.url, '/api/coach');
  assert.equal(result.comment, 'Meglio f2–f4.');
  assert.equal(result.explanationSource, 'engine');
  assert(!requested.options.headers.Authorization);
  c.fetch = async () => { throw Error('offline'); };
  assert.equal(await new Promise(resolve => c.MoveCoach.explain(data.moves, false, data, resolve)), null);
});
test('explanation follows the supplied searched line and never selects an unrelated capture', () => {
  const data = body(), { rr } = rules();
  function line(initial) {
    const p = new rr(); p.make(p.legalMoves().find(m => m.from === initial.from && m.to === initial.to));
    const reply = p.legalMoves()[0];
    return [initial, { from: reply.from, to: reply.to, promo: reply.promo }];
  }
  data.playedLine = line(data.moves[0]); data.alternativeLine = line(data.alternative); data.depth = 4;
  const facts = context(data), { fallback } = require('../lib/coach.cjs');
  const comment = fallback(facts);
  assert(comment.includes('risposta prevista dalla ricerca è ' + facts.playedLine[1].notation));
  assert(comment.includes('Variante calcolata:'));
  assert(!('possibleCapture' in facts.played));
  assert(!comment.includes('possibilità legale'));
  assert.throws(() => context({ ...data, playedLine: [data.moves[0], { from: 0, to: 99 }] }));
  assert.throws(() => context({ ...data, playedLine: [data.alternative] }));
});
