const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
for (const french of [false, true]) {
  let now = 0, tick, cleared = 0;
  const context = vm.createContext({
    FRENCH_MODE: french, Date: { now: () => now },
    window: { setInterval: fn => { tick = fn; return 7; }, clearInterval: id => { assert.equal(id, 7); cleared++; } },
    v: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  });
  vm.runInContext(html.slice(html.indexOf('const dr = 30'), html.indexOf('function i1()')) + '\nglobalThis.api = { startSkipCountdown, SkipClock };', context);
  let remaining;
  const cleanup = context.api.startSkipCountdown(value => { remaining = value; });
  assert.equal(remaining, 30);
  now = 15000; tick();
  assert.equal(remaining, 15);
  const clock = context.api.SkipClock({ remaining });
  assert.equal(clock.props.role, 'timer');
  assert.equal(clock.props['aria-label'], french ? 'Passer dans 15 secondes' : 'Salta tra 15 secondi');
  assert.equal(clock.props.children[3].props.style.transform, 'rotate(180deg)');
  for (const image of clock.props.children.slice(0, 3)) {
    assert(fs.existsSync(image.props.src));
    assert.equal(image.props.alt, '');
  }
  // Catch up after background-tab throttling instead of counting interval ticks.
  now = 42000; tick();
  assert.equal(remaining, 0);
  assert.equal(cleared, 1);
  cleanup();
  assert.equal(cleared, 2);
  context.api.startSkipCountdown(value => { remaining = value; });
  assert.equal(remaining, 30, 'new video restarts the timer');
}
assert(!html.includes('children: b > 0 ? `Salta tra'));
console.log('Clock assets, hand angle, translations, deadline, cleanup and restart passed.');
