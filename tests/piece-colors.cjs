const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
for (const french of [false, true]) {
  const context = vm.createContext({
    URLSearchParams, location: { search: french ? '?version=french' : '' },
    document: { documentElement: {} },
    v: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  });
  vm.runInContext(html.slice(html.indexOf('const Ht ='), html.indexOf('function wh(')) + '\nglobalThis.renderPiece = Ff;', context);
  for (let type = 1; type <= 7; type++) {
    const sources = [];
    for (const side of [1, -1]) {
      const piece = context.renderPiece({ code: side * type });
      const image = french ? piece.props.children[0] : piece.props.children;
      assert.equal(image.type, 'img', 'piece colors must be image content, not auto-recolored text');
      assert.equal(image.props.draggable, false);
      assert.equal(image.props['data-darkreader-ignore'], true);
      const svg = decodeURIComponent(image.props.src.split(',').slice(1).join(','));
      assert(svg.includes(`fill="${side > 0 ? '#ffffff' : '#111111'}"`));
      assert(svg.includes(`stroke="${side > 0 ? '#111111' : '#d8d8d8'}"`));
      assert(!svg.includes('currentColor'));
      assert(svg.includes('viewBox="0 0 100 100"'));
      sources.push(image.props.src);
    }
    assert.notEqual(sources[0], sources[1]);
  }
}
assert(html.includes('<meta name="darkreader-lock" />'));
assert(html.includes(':root { color-scheme: light; color-scheme: only light; }'));
assert(html.includes('backgroundImage: `linear-gradient(${$}, ${$})`'));
console.log('Fixed white/black image colors for every piece in both variants passed.');
