const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const html = fs.readFileSync('index.html', 'utf8');
function renderContext(pathname, search = '') {
  const context = vm.createContext({
    URLSearchParams, location: { pathname, search }, document: { documentElement: {} },
    v: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  });
  vm.runInContext(html.slice(html.indexOf('const Ht ='), html.indexOf('function wh(')) + '\nglobalThis.api = { Ff, RISIO_MODE, FRENCH_MODE, risioText };', context);
  return context.api;
}
test('Risio uses the supplied images for every piece and inverts/rotates only black', () => {
  const expected = ['smiley.png', 'Kruzzit3.webp', 'Yippeeyay3.webp', 'Glogga3.webp', 'Floopfang3.webp', 'Zorker2.webp', 'Blepzo3.webp'];
  const api = renderContext('/risio', '?version=french&partita=12345678');
  assert.equal(api.RISIO_MODE, true); assert.equal(api.FRENCH_MODE, false);
  for (let i = 1; i <= 7; i++) for (const side of [1, -1]) {
    const piece = api.Ff({ code: i * side });
    assert.equal(piece.type, 'img'); assert(piece.props.src.endsWith(expected[i - 1]));
    assert(fs.existsSync(piece.props.src.slice(1)));
    assert.equal(piece.props.style.transform, side === 1 ? 'none' : 'rotate(180deg)');
    assert.equal(piece.props.style.filter, side === 1 ? 'none' : 'invert(1)');
    assert.equal(piece.props.draggable, false);
    assert(piece.props.alt);
  }
  assert.equal(api.Ff({ code: 1, size: '2rem' }).props.style.width, '2rem');
});
test('normal routes retain text pieces and French behavior without Risio styling', () => {
  for (const path of ['/', '/other', '/risio-other']) {
    const api = renderContext(path);
    assert.equal(api.RISIO_MODE, false); assert.equal(api.Ff({ code: 1 }).type, 'span');
  }
  assert.equal(renderContext('/risio/').RISIO_MODE, true);
  assert.equal(renderContext('/', '?version=french').FRENCH_MODE, true);
  assert(html.includes('if (RISIO_MODE) { mountSite(); return; }'));
  assert(html.includes('if (RISIO_MODE || reviewActive || historyPaused || typeof EntryGate'));
  assert(!html.includes('RISIO_MODE && B === "online" ? null'));
  assert(html.includes('!RISIO_MODE && v.jsx("footer"'));
  assert(html.includes('href: "/", className: "rounded border px-3 py-1 text-sm", children: "Torna alla normalità"'));
  assert(html.includes('code && onlJoin(code)'));
  const css = fs.readFileSync('assets/risio.css', 'utf8');
  assert(css.includes('.risio-page > *'));
  assert(css.includes('prefers-reduced-motion'));
  const routes = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).rewrites;
  for (const path of ['/risio', '/risio/']) assert(routes.some(route => route.source === path && route.destination === '/index.html'));
});

test('Risio-only labels rename the AI and special piece without changing the other variants', () => {
  const risio = renderContext('/risio'), normal = renderContext('/');
  for (const [before, after] of [
    ['Giocatore vs 20 Pagine', 'Giocatore vs RISIO'],
    ['20 Pagine vs 20 Pagine', 'RISIO vs RISIO'],
    ['Statistiche di 20 Pagine', 'Statistiche di RISIO'],
    ["Il nuovo pezzo: L'estremo (X)", "Il nuovo pezzo: L'enfoso (X)"],
    ["Attacco dell'Estremo", "Attacco dell'Enfoso"],
  ]) {
    assert.equal(risio.risioText(before), after);
    assert.equal(normal.risioText(before), before);
  }
  const css = fs.readFileSync('assets/risio.css', 'utf8');
  assert(css.includes('scale(1.025, .94)'));
  assert(css.includes('scale(.98, 1.045)'));
  assert(css.includes('prefers-reduced-motion'));
});

test('all ten opening names are themed in Risio only', () => {
  const labels = [...html.slice(html.indexOf('const Ih = ['), html.indexOf('function Ph(')).matchAll(/label: "([^"]+)"/g)].map(match => match[1]);
  assert.equal(labels.length, 10);
  const risio = renderContext('/risio'), normal = renderContext('/');
  for (const label of labels) {
    assert.notEqual(risio.risioText(label), label);
    assert.equal(normal.risioText(label), label);
  }
});

test('Risio openings use the supplied Enfosi names rather than Smiley', () => {
  const risio = renderContext('/risio');
  const labels = [...html.slice(html.indexOf('const Ih = ['), html.indexOf('function Ph(')).matchAll(/label: "([^"]+)"/g)].map(match => risio.risioText(match[1]));
  for (const name of ['Giggler', 'Gazo', 'Gloober', 'Gembo', 'Cheerer', 'Gleeber', 'Glaaber']) {
    assert(labels.some(label => label.includes(name)), name);
  }
  assert(!labels.some(label => /smiley/i.test(label)));
});

test('Risio page dance adds a gentle sideways hop without restoring a roaming head', () => {
  const css = fs.readFileSync('assets/risio.css', 'utf8');
  assert(css.includes('translate(4px, -6px)'));
  assert(css.includes('translate(-4px, -6px)'));
  assert(css.includes('translate(0, 2px)'));
  assert(css.includes('animation: risio-dance 3.6s ease-in-out infinite'));
  assert(css.includes('@media (prefers-reduced-motion: reduce) { .risio-page > * { animation: none; } }'));
  assert(!css.includes('risio-roaming-head'));
});

test('Risio side names are Bianco Glaggles and Nero Enfosi only in the variant', () => {
  const risio = renderContext('/risio'), normal = renderContext('/');
  for (const [before, after] of [
    ['Bianco', 'Bianco Glaggles'], ['Nero', 'Nero Enfosi'],
    ['Profondità Bianco', 'Profondità Bianco Glaggles'],
    ['Il Nero sta prendendo il suo tempo', 'Il Nero Enfosi sta prendendo il suo tempo'],
    ['Vince il Bianco', 'Vince il Bianco Glaggles'],
    ['nero e bianco', 'nero enfosi e bianco glaggles'],
  ]) {
    assert.equal(risio.risioText(before), after);
    assert.equal(normal.risioText(before), before);
  }
});
