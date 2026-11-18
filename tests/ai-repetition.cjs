const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
for (const french of [false, true]) {
  const context = vm.createContext({ URLSearchParams, location: { search: french ? '?version=french' : '' }, document: { documentElement: {} }, v: { jsx: (type, props) => ({type, props}), jsxs: (type, props) => ({type, props}) } });
  vm.runInContext(html.slice(html.indexOf('const Ht ='), html.indexOf('function wh(')) + '\nglobalThis.api = { rr, sr, gr, searchPosition, Ff };', context);
  const { rr, sr, gr, searchPosition, Ff } = context.api;
  const pos = new rr(), key = pos.key();
  const baseline = sr(pos, 1);
  assert(baseline.move);
  assert.equal(pos.key(), key);
  assert.equal(pos.hist.length, 0);
  // All alternatives would complete a threefold repetition, except the best move.
  const history = [key];
  for (const move of pos.legalMoves()) {
    if (move.from === baseline.move.from && move.to === baseline.move.to) continue;
    pos.make(move);
    history.push(pos.key(), pos.key());
    pos.unmake();
  }
  const snapshot = history.slice();
  const result = sr(pos, 2, 1000, history);
  assert.equal(result.move.from, baseline.move.from);
  assert.equal(result.move.to, baseline.move.to);
  assert.deepEqual(history, snapshot);
  assert.equal(pos.key(), key);
  assert.equal(pos.hist.length, 0);
  const state = { repetitions: new Map([[key, 2]]), nodes: 0 };
  assert.equal(gr(pos, 2, -1e9, 1e9, 0, state), 0, 'third occurrence is a draw');
  assert.equal(state.repetitions.get(key), 2);
  state.repetitions.clear();
  assert.throws(() => searchPosition(pos, state, () => { throw Error('test'); }));
  assert.equal(state.repetitions.size, 0, 'branch counters restored even after errors');
  const piece = Ff({ code: 1 });
  assert.equal(piece.props.className.includes('french-piece'), french);
  assert.equal(Array.isArray(piece.props.children), french);
  for (const code of [1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4, -5, -6, -7]) {
    const rendered = Ff({ code });
    if (french) {
      assert.equal(rendered.props.children.length, 2, 'only piece and cigarette');
      const cigarette = rendered.props.children[1];
      assert.equal(cigarette.props.className, 'french-cigarette');
      assert.equal(cigarette.props['aria-hidden'], true);
      assert.equal(cigarette.props.children, undefined, 'no smoky emoji');
    } else assert.equal(typeof rendered.props.children, 'string');
  }
  assert(!html.includes('french-smoke'));
  assert(!html.includes('french-stink'));
  assert(!html.includes('french-waft'));
}
console.log('AI repetition avoidance, history restoration, draw scoring, and French effects passed.');
