const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Chess = require('../lib/chess.cjs');
test('asymmetric French attacks restrict only the selected attacker', () => {
  const p = new Chess(); p.b.fill(0); p.castling = 0; p.frenchSides = [1];
  p.b[44] = 4; p.b[64] = -4;
  assert.equal(p.attacked(43, 1), false);
  assert.equal(p.attacked(63, -1), true);
  p.frenchSides = [-1];
  assert.equal(p.attacked(43, 1), true);
  assert.equal(p.attacked(63, -1), false);
});
test('personal match URLs preserve variant before the match parameter', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const source = html.slice(html.indexOf('function onlVariant('), html.indexOf('const ONL_KEY ='));
  for (const [RISIO_MODE, FRENCH_MODE, expected] of [[false, false, '/?partita=ABCD1234'], [false, true, '/french?partita=ABCD1234'], [true, false, '/risio?partita=ABCD1234']]) {
    const c = vm.createContext({ DASH_MODE: false, RISIO_MODE, FRENCH_MODE, URLSearchParams });
    vm.runInContext(source, c); assert.equal(c.onlPageUrl('ABCD1234'), expected);
    assert.equal(c.onlPageUrl().includes('partita'), false);
  }
  assert(!html.includes('disabled: FRENCH_MODE && B === "online"'));
  assert(!html.includes('RISIO_MODE && B === "online" ? null'));
});
test('online retrospective reviews run only for the local color with mixed rules, never call API', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const source = html.slice(html.indexOf('  function reviewPlayedNote('), html.indexOf('  function re(B, I)'));
  for (const color of [1, -1]) {
    const own = { piece: color, from: 1, to: 2 }, enemy = { piece: -color, from: 3, to: 4 };
    const notes = [{}, {}], calls = [];
    const ctx = vm.createContext({ RISIO_MODE: false, FRENCH_MODE: false, z: 'online', onlRef: { current: { color } },
      R: { hist: [{ move: own }, { move: enemy }], frenchSides: [-1] }, o: { notes }, f() {},
      window: { MoveCoach: { analyze(moves, french, cb, depth, sides) { calls.push({ moves, depth, sides }); cb({ symbol: 'V', comment: 'test' }); }, explain() { throw Error('online must not call explanatory API'); } } } });
    vm.runInContext(source, ctx);
    ctx.reviewPlayedNote(notes[1], enemy, 2, true);
    assert.equal(notes[1].review, undefined);
    ctx.reviewPlayedNote(notes[0], own, 1, true);
    assert.equal(notes[0].review.symbol, 'V');
    assert.equal(calls.length, 1); assert.equal(calls[0].moves.length, 1);
    assert.equal(calls[0].depth, 3); assert.deepEqual(calls[0].sides, [-1]);
  }
});
test('joining from another UI looks up authoritative shared mode with GET before joining', async () => {
  const html = fs.readFileSync('index.html','utf8');
  const source = html.slice(html.indexOf('  async function onlJoin('),html.indexOf('  async function onlSend('));
  for (const [mode,path] of [['french','/french?partita=10000001'],['risio','/risio?partita=10000001'],['boring','/boring?partita=10000001'],['dash','/dash?partita=10000001']]) {
    const calls = [], navigations = [];
    const c = vm.createContext({ URLSearchParams, String, setOnlBusy() {}, onlTokens:() => ({}), onlVariant:() => 'normal', location:{ assign:p => navigations.push(p) },
      onlApi:async (...args) => { calls.push(args); return { ok:true,data:{ mode } }; }, $l:message => { throw Error(message); } });
    vm.runInContext(source,c); await c.onlJoin('10000001');
    assert.equal(calls.length,1); assert.equal(calls[0][3],'GET'); assert.deepEqual(navigations,[path]);
  }
});
