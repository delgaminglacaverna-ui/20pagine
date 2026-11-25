const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
for (const french of [false, true]) {
  const context = vm.createContext({
    URLSearchParams, location: { pathname: french ? '/french' : '/', search: '' },
    document: { documentElement: {} },
    v: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  });
  vm.runInContext(html.slice(html.indexOf('const Ht ='), html.indexOf('function wh(')) + '\nglobalThis.renderPiece = Ff;', context);
  for (let type = 1; type <= 7; type++) {
    for (const side of [1, -1]) {
      const piece = context.renderPiece({ code: side * type });
      const glyph = french ? piece.props.children[0] : piece.props.children;
      assert.equal(typeof glyph, 'string', 'pieces must remain text characters');
      assert.equal(piece.props['data-piece-side'], side > 0 ? 'white' : 'black');
      assert.equal(piece.props.style.color, side > 0 ? '#ffffff' : '#111111');
      assert.equal(piece.props.style.WebkitTextFillColor, side > 0 ? '#ffffff' : '#111111');
      assert.equal(piece.props['data-darkreader-ignore'], true);
      assert(piece.props.style.fontFamily.includes(type === 7 ? 'Arial' : 'Chess Symbols'));
      if (type !== 7) assert(glyph.endsWith('\uFE0E'), 'request text rather than emoji presentation');
    }
  }
}
const font = fs.readFileSync('assets/fonts/NotoSansSymbols2-Regular.ttf');
assert.equal(font.readUInt32BE(0), 0x00010000, 'bundled TrueType font');
assert(font.length > 10000);
assert(fs.readFileSync('assets/fonts/OFL.txt', 'utf8').includes('SIL OPEN FONT LICENSE'));
assert(html.includes('font-family: "Chess Symbols"'));
assert(html.includes('font-variant-emoji: text'));
assert(html.includes('-webkit-text-fill-color: #111111 !important'));
assert(html.includes('<meta name="darkreader-lock" />'));
assert(html.includes('backgroundImage: `linear-gradient(${$}, ${$})`'));
console.log('Text pieces, bundled monochrome font, and fixed side colors passed in both variants.');
