const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const auth = require('../lib/panel.cjs');

test('sessions are signed, expire and are revoked by configuration changes', () => {
  assert.throws(() => auth.config({}), e => e.status === 503);
  const settings = auth.config({ PANEL_PASSWORD: 'test-only-password', PANEL_SESSION_SECRET: 'a'.repeat(40) });
  const session = auth.session(settings.secret, 1000);
  assert(auth.authenticated('panel_session=' + session, settings.secret, 2000));
  assert(!auth.authenticated('panel_session=' + session, settings.secret, 1000 + 8 * 3600000));
  assert(!auth.authenticated('panel_session=' + session + 'x', settings.secret, 2000));
  assert(!auth.authenticated('panel_session=' + session, Buffer.from('different'), 2000));
  const rotated = auth.config({ PANEL_PASSWORD: 'new-test-password', PANEL_SESSION_SECRET: 'a'.repeat(40) });
  assert(!auth.authenticated('panel_session=' + session, rotated.secret, 2000));
  const cookie = auth.cookie(session, { headers: { 'x-forwarded-proto': 'https' } });
  for (const flag of ['HttpOnly', 'SameSite=Strict', 'Secure', 'Path=/api/panel']) assert(cookie.includes(flag));
  assert(!cookie.includes('test-only-password'));
});

test('text validation preserves placeholders, limits sizes and rejects prototype keys', () => {
  assert.equal(auth.validateOverrides({ Hello: '<script>alert(1)</script>' }).Hello, '<script>alert(1)</script>', 'stored as plain text, never executable HTML');
  assert.deepEqual(Object.keys(auth.validateOverrides({ Hello: 'Hello' })), []);
  assert.throws(() => auth.validateOverrides({ 'Turn {0}': 'Turn' }), e => e.status === 400);
  assert.throws(() => auth.validateOverrides(JSON.parse('{"__proto__":"bad"}')), e => e.status === 400);
  assert.throws(() => auth.validateOverrides({ A: 'x'.repeat(6001) }), e => e.status === 400);
  assert.equal(auth.validateOverrides({ 'Turn {0}': '{0} plays' })['Turn {0}'], '{0} plays');
});

test('content presentation supports literals, empty values, templates and regex metacharacters', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync('assets/site-text.js', 'utf8'), context);
  context.SiteText.set({ Hello: '<b>Hi</b>', Hide: '', 'Turn ({0})?': 'Player: {0}', 'Score {0} / {1}': '{1}: {0}' });
  assert.equal(context.SiteText.text('Hello'), '<b>Hi</b>');
  assert.equal(context.SiteText.text('Hide'), '');
  assert.equal(context.SiteText.text('Turn (Black)?'), 'Player: Black');
  assert.equal(context.SiteText.text('Score 2 / 9'), '9: 2');
  assert.equal(context.SiteText.text('Score 9'), 'Score 9');
  assert.equal(context.SiteText.text(12), 12);
});

test('catalog includes both languages, dynamic templates and updated turn message', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const catalog = require('../scripts/text-catalog.cjs')(html);
  for (const key of ['Il Bianco sta prendendo il suo tempo', 'Les Blancs prennent leur temps', 'Stai prendendo il tuo tempo', 'Tu prends ton temps', 'HAI FATTO I COMPITI???']) assert(catalog.includes(key), key);
  assert(!catalog.includes('pvc'));
  assert(!catalog.some(value => value.includes('PANEL_PASSWORD')));
  assert(!html.includes('20 Pagine (${zc(R.turn)}) si prende il suo tempo'));
});

test('HTTP login, protected save, CSRF checks, conflict, public reading, logout and rate limits', async () => {
  const envNames = ['PANEL_PASSWORD', 'PANEL_SESSION_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
  const saved = envNames.map(key => process.env[key]), savedFetch = global.fetch;
  Object.assign(process.env, { PANEL_PASSWORD: 'test-only-password', PANEL_SESSION_SECRET: 'a'.repeat(40), UPSTASH_REDIS_REST_URL: 'https://example.test', UPSTASH_REDIS_REST_TOKEN: 'test-only-token' });
  const values = new Map(); let attempts = 0;
  global.fetch = async (_, options) => {
    const args = JSON.parse(options.body); let result;
    if (args[0] === 'GET') result = values.get(args[1]) || null;
    else if (args[0] === 'EVAL' && args[1].includes('INCR')) result = ++attempts;
    else if (args[0] === 'EVAL') {
      const old = values.get(args[3]) || '';
      result = old === args[4] ? 1 : 0;
      if (result) values.set(args[3], args[5]);
    } else throw Error('Unexpected Redis command');
    return { ok: true, json: async () => ({ result }) };
  };
  const handler = require('../api/panel.js'), content = require('../api/content.js');
  async function call(method, body, cookie = '', origin = 'https://site.test', endpoint = handler) {
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(value) { this.data = value; return this; } };
    await endpoint({ method, body, headers: { host: 'site.test', origin, cookie, 'content-type': 'application/json', 'x-forwarded-proto': 'https' } }, response);
    return response;
  }
  try {
    assert.equal((await call('GET')).code, 401);
    assert.equal((await call('POST', { action: 'save', overrides: {}, version: 0 })).code, 401);
    assert.equal((await call('POST', { action: 'login', password: 'bad' })).code, 401);
    const login = await call('POST', { action: 'login', password: 'test-only-password' });
    assert.equal(login.code, 200);
    assert(!JSON.stringify(login.data).includes('password'));
    const cookie = login.headers['Set-Cookie'];
    const initial = await call('GET', null, cookie); assert.equal(initial.data.version, 0);
    assert.equal((await call('POST', { action: 'save', version: 0, overrides: {} }, cookie, 'https://evil.test')).code, 403);
    const saved = await call('POST', { action: 'save', version: 0, overrides: { Hello: 'New text' } }, cookie);
    assert.equal(saved.code, 200); assert.equal(saved.data.version, 1);
    assert.equal((await call('POST', { action: 'save', version: 0, overrides: {} }, cookie)).code, 409);
    const publicData = await call('GET', null, '', '', content);
    assert.equal(publicData.data.overrides.Hello, 'New text'); assert(!JSON.stringify(publicData.data).includes('test-only'));
    const logout = await call('POST', { action: 'logout' }, cookie);
    assert.equal(logout.code, 200); assert(logout.headers['Set-Cookie'].includes('Max-Age=0'));
    for (let i = 0; i < 4; i++) await call('POST', { action: 'login', password: 'bad' });
    assert.equal((await call('POST', { action: 'login', password: 'test-only-password' })).code, 429);
  } finally {
    global.fetch = savedFetch;
    envNames.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
  }
});
