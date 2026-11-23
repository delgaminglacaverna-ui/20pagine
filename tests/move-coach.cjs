const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function coach(extra = {}) {
  const context = vm.createContext({ ...extra });
  vm.runInContext(fs.readFileSync('assets/move-coach.js', 'utf8'), context);
  return context.MoveCoach;
}
test('quality scale separates decent, good and best from rare exceptional moves', () => {
  const api = coach();
  for (const [loss, symbol] of [[0, '✓✓'], [25, '✓✓'], [26, 'V'], [79, 'V'], [80, '?!'], [149, '?!'], [150, 'X'], [299, 'X'], [300, '??']]) {
    assert.equal(api.classify({ best: 400, played: 400 - loss, second: 400 }).symbol, symbol);
  }
  assert.equal(api.classify({ best: 100, played: 100, second: 100, bestMove: true, depth: 2 }).symbol, '👑');
  assert.equal(api.classify({ best: 100, played: 100, second: -100, bestMove: true, depth: 1 }).symbol, '👑');
  assert.equal(api.classify({ best: 100, played: 100, second: -100, bestMove: true, depth: 2 }).symbol, '!');
  assert.equal(api.classify({ best: 100, played: 100, second: 0, bestMove: true, sacrifice: true, depth: 2 }).symbol, '!!');
  assert.notEqual(api.classify({ best: -100, played: -100, second: -200, bestMove: true, sacrifice: true, depth: 2 }).symbol, '!!');
  assert.notEqual(api.classify({ best: 100, played: 100, second: 0, bestMove: true, sacrifice: true, depth: 1 }).symbol, '!!');
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

test('evaluation formats signed pawn units and handles missing and mating scores', () => {
  const api = coach();
  assert.equal(api.evaluation(125), '+1.25');
  assert.equal(api.evaluation(-250), '-2.50');
  assert.equal(api.evaluation(0), '0.00');
  assert.equal(api.evaluation(undefined), '—');
  assert.equal(api.evaluation(999999), 'Matto per il Bianco');
  assert.equal(api.evaluation(-999999), 'Matto per il Nero');
});
test('worker evaluations keep white perspective for either moving side', () => {
  let result;
  const context = vm.createContext({ self: { postMessage: value => { result = value; } }, Date, Math });
  vm.runInContext(fs.readFileSync('assets/coach-worker.js', 'utf8'), context);
  const moves = vm.runInContext(`(() => {
    const pos = new rr(), moves = [];
    for (let i = 0; i < 2; i++) {
      const m = pos.legalMoves()[0]; moves.push({from: m.from, to: m.to, promo: m.promo}); pos.make(m);
    }
    return moves;
  })()`, context);
  context.self.onmessage({ data: { moves: moves.slice(0, 1), french: false } });
  assert(!result.error); assert.equal(result.whiteScore, result.played);
  context.self.onmessage({ data: { moves, french: false } });
  assert(!result.error); assert.equal(result.whiteScore, -result.played);
});
test('move badge appears only in destination square, including rotated board and parody symbols', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const context = vm.createContext({
    FRENCH_MODE: false, ca: x => Math.floor(x / 10), ia: x => x % 10,
    watchBoardSize() {}, Ff() {}, qualityMark: symbol => symbol,
    ul: { useRef: () => ({ current: null }), useEffect() {} },
    v: { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }) },
  });
  vm.runInContext(html.slice(html.indexOf('function wh('), html.indexOf('const Kf =')), context);
  for (const flipped of [false, true]) for (const symbol of ['??', '!!', '67', '👑', 'X', 'V']) {
    const props = { cells: Array(100).fill(0), flipped, source: null, targets: new Set(), moveReview: { to: 37, review: { symbol, parody: true } } };
    const squares = context.wh(props).props.children.props.children;
    const marked = squares.filter(square => square.props.children.some(child => child?.props?.className === 'move-quality-badge'));
    assert.equal(marked.length, 1); assert.equal(marked[0].key, 37);
    assert.equal(marked[0].props.children.at(-1).props.children, symbol);
    props.moveReview = null;
    assert(!context.wh(props).props.children.props.children.some(square => square.props.children.some(child => child?.props?.className === 'move-quality-badge')));
  }
  const css = fs.readFileSync('assets/move-coach.css', 'utf8');
  assert(css.includes('pointer-events: none')); assert(css.includes('right: 2%'));
});

test('good-move checks stack vertically and commentator uses requested name', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const context = vm.createContext({ v: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) } });
  vm.runInContext(html.slice(html.indexOf('function qualityMark('), html.indexOf('function wh(')), context);
  const mark = context.qualityMark('✓✓');
  assert.equal(mark.props.className, 'move-quality-double-check');
  assert.equal(mark.props.children.length, 2);
  assert(mark.props.children.every(child => child.props.children === '✓'));
  assert(fs.readFileSync('assets/move-coach.css', 'utf8').includes('flex-direction: column'));
  assert(html.includes('children: "boi battler dice:"'));
});
test('four-ply coach continuation selects the bishop capture and retains a legal PV', () => {
  const c = vm.createContext({ self: {}, Date, Math });
  vm.runInContext(fs.readFileSync('assets/coach-worker.js', 'utf8'), c);
  const result = vm.runInContext(`(() => {
    const p = new rr(); p.b.fill(0);
    p.b[nr('a1')] = Rt; p.b[nr('j10')] = -Rt;
    p.kings = [nr('a1'), nr('j10')]; p.castling = 0; p.ep = -1;
    p.b[nr('d5')] = -_t; p.b[nr('d2')] = Vt; p.b[nr('g5')] = Ht;
    p.turn = -1;
    const initialKey = p.key();
    const result = coachSearch(p, 4, -1e9, 1e9, 0, { deadline: Date.now() + 4000, repetitions: new Map() });
    if (p.key() !== initialKey) throw Error('Search mutated position');
    const notation = result.pv.map(move => Ge(move.from) + Ge(move.to));
    for (const code of result.pv) {
      const move = p.legalMoves().find(m => m.from === code.from && m.to === code.to && (m.promo || 0) === (code.promo || 0));
      if (!move) throw Error('Illegal PV'); p.make(move);
    }
    return notation;
  })()`, c);
  assert.equal(result[0], 'd5d2'); assert.equal(result.length, 4);
});
