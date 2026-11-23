const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('Risio jumpscare is route-isolated, clean up and redirect after 900ms', () => {
  const children = []; let callback, delay, destination, cleared;
  const document = {
    querySelector: selector => children.find(node => '.' + node.className === selector),
    body: { appendChild: node => children.push(node) },
    createElement: () => ({ setAttribute() {}, appendChild() {}, remove() { children.splice(children.indexOf(this), 1); } }),
  };
  const window = {
    location: { pathname: '/', assign: value => { destination = value; } },
    setTimeout: (fn, ms) => { callback = fn; delay = ms; return 42; },
    clearTimeout: id => { cleared = id; },
  };
  vm.runInNewContext(fs.readFileSync('assets/risio-effects.js', 'utf8'), { window, document });
  assert.equal(window.RisioEffects.start, undefined);
  assert.equal(children.length, 0);
  window.RisioEffects.scare(); assert.equal(children.length, 0);
  window.location.pathname = '/risio';
  const cleanup = window.RisioEffects.scare(); assert.equal(children.length, 1);
  assert.equal(delay, 900); assert.equal(destination, undefined);
  callback(); assert.equal(destination, 'https://sites.google.com/view/enphosoweb?pli=1&authuser=0');
  cleanup(); assert.equal(cleared, 42); assert.equal(children.length, 0);
  const css = fs.readFileSync('assets/risio.css', 'utf8');
  assert(!css.includes('risio-roam'));
  assert(css.includes('.risio-jumpscare'));
  const html = fs.readFileSync('index.html', 'utf8');
  assert(html.includes('!RISIO_MODE || reviewActive || z !== "pvc" || V.kind !== "mate" || R.turn !== 1'));
  assert(!html.includes('toggleMusic')); assert(html.includes("window.removeEventListener('pointerdown', startMusic)"));
});
