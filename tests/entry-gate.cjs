const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/entry-gate.js', 'utf8');
function harness(french = false) {
  let time = Date.parse('2026-07-01T12:00:00Z'), nextTimer = 0, closeCalls = 0, destination;
  const timers = new Map(), storage = new Map();
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.attrs = {}; this.events = {}; this.textContent = ''; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener(name, fn) { this.events[name] = fn; }
    focus() {}
    get firstElementChild() { return this.children[0]; }
    click() { this.events.click?.(); }
  }
  const root = new Element('div');
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [time])); } static now() { return time; } }
  const addTimer = (fn, delay, repeat) => { const id = ++nextTimer; timers.set(id, { fn, at: time + delay, delay, repeat }); return id; };
  const context = vm.createContext({
    Date: ClockDate, Intl, document: { createElement: tag => new Element(tag), getElementById: () => root },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout: (fn, delay) => addTimer(fn, delay, false), clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => addTimer(fn, delay, true), clearInterval: id => timers.delete(id),
    addEventListener() {}, removeEventListener() {}, close: () => closeCalls++, closed: false,
    location: { replace: value => { destination = value; } },
  });
  vm.runInContext(source, context);
  function advance(ms) {
    const target = time + ms;
    while (true) {
      const pending = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!pending) break;
      const [id, timer] = pending; time = timer.at;
      if (timer.repeat) timer.at += timer.delay; else timers.delete(id);
      timer.fn();
    }
    time = target;
  }
  function all(className, node = root) {
    return [...(node.className?.split(' ').includes(className) ? [node] : []), ...node.children.flatMap(child => all(className, child))];
  }
  const minute = node => parseFloat(all('entry-minute', node)[0].style.transform.slice(7)) / 30;
  function answer(correct = true) {
    const target = all('entry-equation')[0].children.filter(node => node.className?.includes('entry-clock')).reduce((sum, node) => sum + minute(node), 0) % 12;
    const choice = all('entry-choice').find(node => (minute(node) === target) === correct);
    assert(choice); choice.click();
  }
  return { gate: context.EntryGate, root, storage, timers, advance, all, answer,
    begin: () => context.EntryGate.start({ container: root, french }),
    get closeCalls() { return closeCalls; }, get destination() { return destination; } };
}

test('Italian time follows Europe/Rome in winter, summer and DST transition', () => {
  const { gate } = harness();
  assert.equal(gate.italyTime(new Date('2026-01-15T12:34:56Z')).label, '13:34:56');
  assert.equal(gate.italyTime(new Date('2026-07-15T12:34:56Z')).label, '14:34:56');
  assert.equal(gate.italyTime(new Date('2026-03-29T00:59:59Z')).label, '01:59:59');
  assert.equal(gate.italyTime(new Date('2026-03-29T01:00:00Z')).label, '03:00:00');
  assert.equal(gate.italyTime(new Date('2026-07-01T22:00:00Z')).label, '00:00:00');
});
test('questions contain three clocks, four unique options and modulo-12 arithmetic', () => {
  const { gate } = harness(); let seed = 42;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < 1000; i++) {
    const question = gate.makeQuestion(random);
    assert.equal(question.clocks.length, 3); assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map(clock => clock.minute)).size, 4);
    const sum = question.clocks.reduce((total, clock) => total + clock.minute, 0) % 12;
    assert.equal(question.options[question.correctIndex].minute, sum);
    for (const clock of [...question.clocks, ...question.options]) for (const hand of ['minute', 'hour']) assert(clock[hand] >= 0 && clock[hand] < 12);
  }
  const zero = gate.makeQuestion(() => 0);
  assert.equal(zero.options[zero.correctIndex].minute, 0);
});
test('No and wrong answers exit the site, clean up timers and never grant access', async () => {
  for (const wrongAnswer of [false, true]) {
    const h = harness(), result = h.begin();
    if (wrongAnswer) { h.all('entry-yes')[0].click(); h.advance(1000); h.answer(false); }
    else h.all('entry-no')[0].click();
    assert.equal(await result, false); assert.equal(h.closeCalls, 1); assert.equal(h.destination, 'about:blank');
    assert.equal(h.storage.size, 0); assert.equal(h.timers.size, 0);
  }
});
test('one second preview, twelve second limit and no automatic pass on timeout', async () => {
  const h = harness(), result = h.begin(); h.all('entry-yes')[0].click();
  h.advance(999); assert.equal(h.all('entry-choice').length, 0);
  h.advance(1); assert.equal(h.all('entry-choice').length, 4);
  h.advance(11999); assert.equal(h.closeCalls, 0);
  h.advance(1); assert.equal(await result, false); assert.equal(h.destination, 'about:blank');
  assert.equal(h.timers.size, 0);
});
test('three correct answers unlock only this tab session, in Italian and French', async () => {
  for (const french of [false, true]) {
    const h = harness(french), result = h.begin();
    assert.equal(h.all('entry-digital')[0].textContent, '14:00:00');
    assert(h.all('entry-card')[0].children.some(node => node.textContent.includes(french ? 'DEVOIRS' : 'COMPITI')));
    h.all('entry-yes')[0].click();
    for (let i = 0; i < 3; i++) { h.advance(1000); h.answer(); }
    assert.equal(await result, true); assert.equal(h.closeCalls, 0); assert.equal(h.timers.size, 0);
    assert.equal(h.root.children.length, 0);
    assert.equal(await h.begin(), true);
  }
});
