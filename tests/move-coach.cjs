const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function coach(extra = {}) {
  const context = vm.createContext({ ...extra });
  vm.runInContext(fs.readFileSync('assets/move-coach.js', 'utf8'), context);
  return context.MoveCoach;
}
test('move quality thresholds and conservative brilliant classification', () => {
  const api = coach();
  for (const [loss, symbol] of [[0, '!'], [15, '!'], [16, '='], [49, '='], [50, '?!'], [120, '?'], [250, '??']]) {
    assert.equal(api.classify({ best: 300, played: 300 - loss, second: 300 }).symbol, symbol);
  }
  assert.equal(api.classify({ best: 100, played: 100, second: 0, bestMove: true, sacrifice: true }).symbol, '!!');
  assert.notEqual(api.classify({ best: -100, played: -100, second: -200, bestMove: true, sacrifice: true }).symbol, '!!');
});
test('Risio grades are parody rules, independent of actual move quality', () => {
  const api = coach();
  for (const [mode, piece, symbol] of [['pvc', 1, '??'], ['pvc', -1, '!!'], ['pvp', 1, '??'], ['pvp', -1, '??'], ['cvc', 1, '67'], ['cvc', -1, '67']]) {
    const review = api.risio(mode, piece); assert.equal(review.symbol, symbol);
    assert.equal(review.comment, 'bip bup'); assert.equal(review.parody, true);
  }
});
test('worker replays 10x10 history and returns scores without changing main-thread game', () => {
  let result;
  const context = vm.createContext({ self: { postMessage: value => { result = value; } }, Date, Math });
  vm.runInContext(fs.readFileSync('assets/coach-worker.js', 'utf8'), context);
  const moves = vm.runInContext('new rr().legalMoves().slice(0, 1).map(m => ({from: m.from, to: m.to, promo: m.promo}))', context);
  context.self.onmessage({ data: { moves, french: false } });
  assert(!result.error); assert(Number.isFinite(result.best)); assert(Number.isFinite(result.played));
  assert(result.depth >= 1); assert(result.best >= result.played);
  context.self.onmessage({ data: { moves: [{ from: -1, to: 1000 }], french: false } });
  assert.equal(result.error, true);
});
test('worker unsupported and worker errors report unavailable rather than invented grades', () => {
  let result;
  coach().analyze([], false, value => { result = value; }); assert(result.unavailable);
  let instance, terminated = 0;
  class Worker {
    constructor() { instance = this; }
    postMessage() {}
    terminate() { terminated++; }
  }
  const api = coach({ Worker, setTimeout: () => 1, clearTimeout() {} });
  const cancel = api.analyze([], false, value => { result = value; });
  instance.onerror(); assert(result.unavailable); assert.equal(terminated, 1);
  let calls = 0;
  const stop = api.analyze([], false, () => calls++);
  stop(); instance.onmessage({ data: { best: 0, played: 0, second: 0 } }); assert.equal(calls, 0);
});
test('notation export remains separate from grades and undo/redo retain review', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const context = vm.createContext({});
  vm.runInContext(html.slice(html.indexOf('function $h('), html.indexOf('function Fh(')), context);
  const review = { symbol: '??' }, move = { from: 1, to: 2 };
  const state = { notes: [{ review }], keys: [1, 2], redo: [], pos: { hist: [{ move }], unmake() {} } };
  context.$h(state); assert.equal(state.redo[0].coachReview, review);
  assert(html.includes('if (h.coachReview) z.review = h.coachReview;'));
  assert(html.includes('const en = oa.map((B) => `${B.n}. ${B.w}${B.b ? " " + B.b : ""}`)'));
});
