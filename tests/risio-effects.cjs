const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('Risio head and jumpscare are route-isolated, clean up and redirect after 900ms', () => {
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
  window.RisioEffects.start(); window.RisioEffects.scare(); assert.equal(children.length, 0);
  window.location.pathname = '/risio';
  window.RisioEffects.start(); window.RisioEffects.start(); assert.equal(children.length, 1);
  const cleanup = window.RisioEffects.scare(); assert.equal(children.length, 2);
  assert.equal(delay, 900); assert.equal(destination, undefined);
  callback(); assert.equal(destination, 'https://sites.google.com/view/enphosoweb?pli=1&authuser=0');
  cleanup(); assert.equal(cleared, 42); assert.equal(children.length, 1);
  const css = fs.readFileSync('assets/risio.css', 'utf8');
  assert(css.includes('(pointer: coarse)')); assert(css.includes('pointer-events: none'));
  const html = fs.readFileSync('index.html', 'utf8');
  assert(html.includes('!RISIO_MODE || reviewActive || z !== "pvc" || V.kind !== "mate" || R.turn !== 1'));
  assert(!html.includes('toggleMusic')); assert(html.includes("window.removeEventListener('pointerdown', startMusic)"));
});
