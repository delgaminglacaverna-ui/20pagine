const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('assets/game-archive.js', 'utf8');
function harness(store = new Map()) {
  const localStorage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) };
  const window = { localStorage };
  vm.runInNewContext(code, { window });
  return { api: window.GameArchive, store };
}
function snapshot(id = 'game-1') {
  return { id, variant: 'normal', mode: 'pvc', result: 'none', turn: -1, moves: [{ from: 85, to: 65, piece: 1 }], notes: [{ san: 'f4', review: { symbol: 'V', whiteScore: 20 } }], token: 'must-not-save', ip: 'must-not-save' };
}
test('games persist across visits in the same browser without IP or credentials', () => {
  const { api, store } = harness();
  api.save(snapshot());
  const again = harness(store).api;
  assert.equal(again.read().length, 1);
  assert.equal(again.read()[0].moves[0].to, 65);
  assert.equal(again.read()[0].notes[0].review.symbol, 'V');
  assert(![...store.values()][0].includes('must-not-save'));
  again.save({ ...snapshot(), result: 'mate' }); assert.equal(again.read().length, 1);
  assert.equal(again.read()[0].result, 'mate');
  again.save(snapshot('branch')); assert.equal(again.read().length, 2);
  again.remove('game-1'); assert.equal(again.read().length, 1);
});
test('archive bounds storage, ignores empty games and survives corrupt or blocked storage', () => {
  const { api, store } = harness();
  api.save({ ...snapshot(), moves: [] }); assert.equal(api.read().length, 0);
  for (let i = 0; i < 60; i++) api.save(snapshot('g' + i));
  assert.equal(api.read().length, 50); assert.equal(api.read()[0].id, 'g59');
  store.set('20pagine.games.v1', '{broken'); assert.equal(api.read().length, 0);
  const window = { localStorage: { getItem() { throw Error(); }, setItem() { throw Error(); } } };
  vm.runInNewContext(code, { window });
  assert.doesNotThrow(() => window.GameArchive.save(snapshot()));
});
test('pending live analysis does not erase an existing archived result', () => {
  const { api } = harness(); api.save(snapshot());
  api.save({ ...snapshot(), notes: [{ san: 'f4', review: { pending: true } }] });
  assert.equal(api.read()[0].notes[0].review.symbol, 'V');
});
test('game save wiring skips history browsing and forks on explicit resume', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert(html.includes('if (historyPaused || !R.hist.length) return;'));
  assert(html.includes('archiveId.current = window.GameArchive?.newId(); o.redo = []'));
  assert(html.includes('Le tue partite · Analisi'));
});
test('archive dialog lists a saved game and sequentially analyzes missing moves', async () => {
  class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.textContent = ''; }
    appendChild(node) { this.children.push(node); node.parent = this; }
    replaceChildren() { this.children = []; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
    setAttribute() {}
    focus() {}
    querySelectorAll() { return []; }
  }
  const body = new Node('body');
  const all = node => [node, ...node.children.flatMap(all)];
  const document = { body, activeElement: null, createElement: tag => new Node(tag), addEventListener() {}, removeEventListener() {}, querySelector: selector => all(body).find(n => '.' + n.className === selector) };
  let calls = 0;
  const store = new Map();
  const window = { localStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) }, MoveCoach: {
    evaluation: score => (score / 100).toFixed(2),
    analyze(moves, french, callback, target) { assert.equal(target, 4); calls++; callback({ symbol: 'V', whiteScore: 10, depth: 4, comment: 'Analisi di prova' }); return () => {}; },
  } };
  vm.runInNewContext(code, { window, document });
  window.GameArchive.save({ ...snapshot(), moves: [...snapshot().moves, { from: 15, to: 35, piece: -1 }], notes: [{ san: 'f4', review: { symbol: 'V', depth: 3, targetDepth: 3 } }, { san: 'f7', review: { symbol: 'V', depth: 3, targetDepth: 3 } }] });
  window.GameArchive.open();
  const findButton = label => all(body).find(n => n.tag === 'button' && n.textContent === label);
  findButton('Apri e analizza').onclick();
  await findButton('Analizza / riprendi').onclick();
  assert.equal(calls, 2);
  assert.equal(window.GameArchive.read()[0].notes[0].review.depth, 4);
  assert.equal(window.GameArchive.read()[0].notes[1].review.targetDepth, 4);
  assert(all(body).some(n => n.textContent === 'Analisi di prova'));
  findButton('Chiudi').onclick(); assert.equal(body.children.length, 0);
});
test('live saves cannot downgrade an archived full-depth review to a quick one', () => {
  const { api } = harness();
  api.save({ ...snapshot(), notes: [{ san: 'f4', review: { symbol: 'V', targetDepth: 4, depth: 4 } }] });
  api.save({ ...snapshot(), notes: [{ san: 'f4', review: { symbol: 'X', targetDepth: 3, depth: 3 } }] });
  assert.equal(api.read()[0].notes[0].review.targetDepth, 4);
});
