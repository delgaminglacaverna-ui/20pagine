const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const engine = html.slice(html.indexOf('const Ht ='), html.indexOf('function ir('));
function load(french) {
  const context = vm.createContext({ URLSearchParams, location: { search: french ? '?version=french' : '' }, document: { documentElement: {} }, v: { jsx() {}, jsxs() {} } });
  vm.runInContext(engine + '\nglobalThis.Engine = rr;', context);
  return new context.Engine();
}
for (const french of [false, true]) {
  const game = load(french);
  for (const color of [1, -1]) {
    game.turn = color;
    const moves = game.legalMoves();
    assert(moves.length > 0);
    assert.equal(moves.some(m => m.to % 10 < m.from % 10), !french);
  }
  // Every piece, isolated: attacks and generated moves must agree on direction.
  for (let piece = 1; piece <= 7; piece++) {
    game.b.fill(0);
    game.b[44] = piece;
    game.turn = 1;
    game.castling = 0;
    const moves = game.pseudo();
    if (french) assert(moves.every(m => m.to % 10 >= 4));
    for (const target of [23, 33, 43, 53, 63]) {
      game.b[target] = -6;
      if (french) assert.equal(game.attacked(target, 1), false);
      game.b[target] = 0;
    }
    assert.equal(game.turn, 1, 'attack detection preserves turn');
  }
  game.setup();
  const before = game.key();
  const move = game.legalMoves()[0];
  game.make(move);
  game.unmake();
  assert.equal(game.key(), before);
}
console.log('French and Italian move generation, attacks, and undo passed.');
