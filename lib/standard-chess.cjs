const { Chess } = require('chess.js');
const square = index => 'abcdefgh'[index % 8] + (8 - Math.floor(index / 8));
const index = square => (8 - Number(square[1])) * 8 + 'abcdefgh'.indexOf(square[0]);
const pieces = { p: 1, r: 2, n: 3, b: 4, q: 5, k: 6 };
class StandardChess {
  constructor() { this.chess = new Chess(); }
  get turn() { return this.chess.turn() === 'w' ? 1 : -1; }
  get half() { return Number(this.chess.fen().split(' ')[4]); }
  key() { return this.chess.fen().split(' ').slice(0, 4).join(' '); }
  legalMoves() { return this.chess.moves({ verbose: true }).map(m => ({ from: index(m.from), to: index(m.to), promo: pieces[m.promotion] || 0, uci: m.from + m.to + (m.promotion || '') })); }
  make(move) { return this.chess.move({ from: square(move.from), to: square(move.to), promotion: Object.keys(pieces).find(p => pieces[p] === move.promo) }); }
  inCheck() { return this.chess.isCheck(); }
  insufficientMaterial() { return this.chess.isInsufficientMaterial(); }
}
module.exports = StandardChess;
