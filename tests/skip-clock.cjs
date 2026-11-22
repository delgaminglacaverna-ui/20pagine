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
  let skipped = 0;
  const clock = context.api.SkipClock({ remaining, onSkip: () => skipped++ });
  assert.equal(clock.type, 'button');
  assert.equal(clock.props['aria-disabled'], true);
  clock.props.onClick(); assert.equal(skipped, 0, 'cannot skip before deadline');
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
  const ready = context.api.SkipClock({ remaining, onSkip: () => skipped++ });
  assert.equal(ready.type, 'button');
  assert.equal(ready.props['aria-disabled'], false);
  assert(ready.props.className.includes('skip-clock-ready'));
  assert.equal(ready.props.role, undefined, 'ready clock has native button semantics');
  assert.equal(ready.props['aria-label'], french ? 'Passer la vidéo' : 'Salta video');
  assert.equal(ready.props.children[3].props.style.transform, 'rotate(360deg)');
  assert.equal(ready.props.children.filter(child => child.props.className?.startsWith('skip-clock-cross')).length, 3);
  ready.props.onClick(); assert.equal(skipped, 1);
  const restarted = context.api.SkipClock({ remaining: 30, onSkip: () => skipped++ });
  assert.equal(restarted.props['aria-disabled'], true);
  assert(!restarted.props.className.includes('skip-clock-ready'));
  assert.equal(restarted.props.children[3].props.style.transform, 'rotate(0deg)');
  cleanup();
  assert.equal(cleared, 2);
  context.api.startSkipCountdown(value => { remaining = value; });
  assert.equal(remaining, 30, 'new video restarts the timer');
}
assert(!html.includes('children: b > 0 ? `Salta tra'));
assert(!html.includes('b > 0 ? v.jsx(SkipClock'));
assert(!html.includes('.skip-clock-ready { background: #16a34a;'));
assert(html.includes('.skip-clock-cross'));
assert(html.includes('.skip-clock-ready .skip-clock-face { animation: none; opacity: 0; }'));
assert(html.includes('.skip-clock-ready .skip-clock-face-1 { opacity: 1; }'));
console.log('Clock assets, hand angle, translations, deadline, cleanup and restart passed.');

const easterContext = vm.createContext({
  FRENCH_MODE: false,
  v: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
});
vm.runInContext(html.slice(html.indexOf('const dr = 30'), html.indexOf('function i1()')) + '\nglobalThis.api = { createEnfosiTrigger, SkipClock, ENFOSI_MEDIA };', easterContext);
const { createEnfosiTrigger, SkipClock, ENFOSI_MEDIA } = easterContext.api;
let trigger = createEnfosiTrigger();
assert.equal(trigger(0), false); assert.equal(trigger(5000), false); assert.equal(trigger(10000), true);
assert.equal(trigger(11000), false, 'trigger clears history after success');
trigger = createEnfosiTrigger();
assert.equal(trigger(0), false); assert.equal(trigger(5000), false); assert.equal(trigger(10001), false);
assert.equal(trigger(14000), true, 'only timestamps inside the rolling window count');
let activated = 0, skips = 0;
const countdownClock = SkipClock({ remaining: 20, onClockTap: () => { activated++; return true; }, onSkip: () => skips++ });
countdownClock.props.onClick(); assert.equal(activated, 1); assert.equal(skips, 0);
const readyTrigger = SkipClock({ remaining: 0, onClockTap: () => true, onSkip: () => skips++ });
readyTrigger.props.onClick(); assert.equal(skips, 0, 'activation click must not skip away');
const smiley = SkipClock({ remaining: 20, enfosi: true });
assert.equal(smiley.props.children[0].props.src, '/assets/enfosi/smiley.png');
assert(smiley.props.className.includes('enfosi-clock'));
assert.equal(ENFOSI_MEDIA.filter(media => media.type === 'gif').length, 11);
assert.equal(ENFOSI_MEDIA.filter(media => media.type === 'video').length, 1);
assert.equal(new Set(ENFOSI_MEDIA.map(media => media.src)).size, 12);
assert(html.includes('enfosi-spin 15s linear infinite'));
for (const file of ['smiley.png', 'risio.mp3', 'rushing.mp4']) assert(fs.statSync(`assets/enfosi/${file}`).size > 1000);
assert(fs.readFileSync('assets/enfosi/rushing.mp4').subarray(4, 8).toString() === 'ftyp');
assert(html.indexOf('className: "review-footer"') > html.indexOf('Modalità di gioco estremo'));
assert.equal((html.match(/className: "review-launch"/g) || []).length, 1);
