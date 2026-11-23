const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/entry-gate.js', 'utf8');
function harness(french = false, { storage = new Map(), at = Date.parse('2026-07-01T12:00:00Z'), storageBlocked = false, audioMode } = {}) {
  let time = at, nextTimer = 0, closeCalls = 0, destination;
  const timers = new Map(), played = [], audioClips = [], tabUpdates = [];
  let tabMode = 'chess';
  class AudioMock {
    constructor(src) { this.src = src; this.events = {}; audioClips.push(this); }
    addEventListener(name, fn) { this.events[name] = fn; }
    removeEventListener(name) { delete this.events[name]; }
    end() { this.events.ended?.(); }
    error() { this.events.error?.(); }
    play() { played.push(this.src); return audioMode === 'blocked' ? Promise.reject(Error('Autoplay denied')) : Promise.resolve(); }
    pause() {}
  }
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.attrs = {}; this.events = {}; this.textContent = ''; }
    append(...nodes) { nodes.forEach(node => { node.parent = this; this.children.push(node); }); }
    replaceChildren(...nodes) { this.children.forEach(node => { node.parent = null; }); this.children = []; this.append(...nodes); }
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener(name, fn) { this.events[name] = fn; }
    removeEventListener(name) { delete this.events[name]; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null; }
    querySelectorAll(selector) {
      const matches = node => selector.startsWith('.') ? node.className?.split(' ').includes(selector.slice(1)) : node.tag === 'button' && !node.disabled;
      return this.children.flatMap(node => [...(matches(node) ? [node] : []), ...node.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0]; }
    focus() { doc.activeElement = this; }
    get firstElementChild() { return this.children[0]; }
    click() { this.events.click?.(); }
  }
  const root = new Element('div'), body = new Element('body'); body.append(root);
  const doc = { body, activeElement: root, createElement: tag => new Element(tag), getElementById: () => root };
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [time])); } static now() { return time; } }
  const addTimer = (fn, delay, repeat) => { const id = ++nextTimer; timers.set(id, { fn, at: time + delay, delay, repeat }); return id; };
  const context = vm.createContext({
    TabState: { set: mode => { tabMode = mode; tabUpdates.push(mode); }, get: () => tabMode },
    Date: ClockDate, Intl, document: doc, Audio: audioMode ? AudioMock : undefined,
    localStorage: {
      getItem: key => { if (storageBlocked) throw Error('Storage blocked'); return storage.get(key); },
      setItem: (key, value) => { if (storageBlocked) throw Error('Storage blocked'); storage.set(key, value); },
      removeItem: key => { if (storageBlocked) throw Error('Storage blocked'); storage.delete(key); },
    },
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
    const target = all('entry-clock', all('entry-equation')[0]).reduce((sum, node) => sum + minute(node), 0) % 12;
    const choice = all('entry-choice').find(node => (minute(node) === target) === correct);
    assert(choice); choice.click();
  }
  return { gate: context.EntryGate, root, body, doc, storage, timers, played, audioClips, tabUpdates, advance, all, answer,
    get now() { return time; },
    begin: (options = {}) => context.EntryGate.start({ container: root, french, ...options }),
    get closeCalls() { return closeCalls; }, get destination() { return destination; } };
}

test('Italian time follows Europe/Rome in winter, summer and DST transition', () => {
  const { gate } = harness();
  assert.equal(gate.italyTime(new Date('2026-01-15T12:34:56Z')).label, '13:34');
  assert.equal(gate.italyTime(new Date('2026-07-15T12:34:56Z')).label, '14:34');
  assert.equal(gate.italyTime(new Date('2026-03-29T00:59:59Z')).label, '01:59');
  assert.equal(gate.italyTime(new Date('2026-03-29T01:00:00Z')).label, '03:00');
  assert.equal(gate.italyTime(new Date('2026-07-01T22:00:00Z')).label, '00:00');
});
test('questions contain two clocks, four unique options and modulo-12 arithmetic', () => {
  const { gate } = harness(); let seed = 42;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < 1000; i++) {
    const question = gate.makeQuestion(random);
    assert.equal(question.clocks.length, 2); assert.equal(question.options.length, 4);
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
    assert.equal(h.storage.has('20pagine.chronos.pass.v3'), false); assert.equal(h.timers.size, 0);
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
test('three correct answers save a browser pass, in Italian and French', async () => {
  for (const french of [false, true]) {
    const h = harness(french), result = h.begin();
    assert.equal(h.all('entry-live')[0].attrs['aria-label'], french ? 'Heure italienne : 14:00' : 'Ora italiana: 14:00');
    assert(h.all('entry-card')[0].children.some(node => node.textContent.includes(french ? 'DEVOIRS' : 'COMPITI')));
    h.all('entry-yes')[0].click();
    for (let i = 0; i < 3; i++) { h.advance(1000); h.answer(); }
    assert.equal(await result, true); assert.equal(h.closeCalls, 0); assert.equal(h.timers.size, 0);
    assert.equal(h.root.children.length, 0);
    assert.equal(await h.begin(), true);
  }
});
test('minimal entrance, unnumbered clocks, Roman answers and two-clock equations', async () => {
  const h = harness(), result = h.begin();
  assert.equal(h.all('entry-yes')[0].textContent, 'SÌ');
  assert.equal(h.all('entry-no')[0].textContent, 'NO');
  assert.equal(h.all('entry-stage')[0].children.length, 1, 'welcome contains only the buttons');
  assert.equal(h.all('entry-second').length, 0);
  assert.equal(h.all('entry-digital').length, 0);
  assert.equal(h.all('entry-zone').length, 0);
  assert.equal(h.all('entry-roman').length, 0, 'clockfaces have no Roman numerals');
  h.all('entry-yes')[0].click();
  assert.equal(h.all('entry-italy')[0].hidden, true, 'live clock hidden during the quiz');
  assert(h.all('entry-card')[0].children.some(node => node.textContent === 'RISPONDI'));
  assert.equal(h.all('entry-equation')[0].children.filter(node => node.className?.split(' ').includes('entry-clock')).length, 2);
  assert.equal(h.all('entry-progress')[0].textContent, 'I / III');
  h.advance(1000);
  assert.deepEqual(h.all('entry-answer-letter').map(node => node.textContent), ['I', 'II', 'III', 'IV']);
  assert.equal(h.all('entry-countdown')[0].textContent, 'XII');
  h.advance(1000); assert.equal(h.all('entry-countdown')[0].textContent, 'XI');
  assert.equal(h.all('entry-second').length, 0);
  h.answer(false); assert.equal(await result, false);
});
test('a complete pass lasts exactly 24 hours across tabs and does not renew on access', async () => {
  const h = harness(), result = h.begin(); h.all('entry-yes')[0].click();
  for (let i = 0; i < 2; i++) {
    h.advance(1000); h.answer(); assert.equal(h.storage.size, 0, 'partial success is not remembered');
  }
  h.advance(1000); h.answer(); assert.equal(await result, true);
  assert.equal(h.storage.size, 1);
  const original = [...h.storage.values()][0], pass = JSON.parse(original);
  assert.equal(pass.passedAt, h.now);
  assert.equal(pass.expiresAt - pass.passedAt, 86400000);
  const otherTab = harness(true, { storage: h.storage, at: pass.expiresAt - 1 });
  assert.equal(await otherTab.begin(), true);
  assert.equal(otherTab.root.children.length, 0); assert.equal(otherTab.timers.size, 0);
  assert.equal([...h.storage.values()][0], original, 'reading does not prolong the pass');
  const expired = harness(false, { storage: h.storage, at: pass.expiresAt });
  const expiredResult = expired.begin();
  assert.equal(expired.all('entry-yes').length, 1, 'quiz returns exactly at expiry');
  assert.equal(h.storage.size, 0);
  expired.all('entry-no')[0].click(); assert.equal(await expiredResult, false);
  const anotherBrowser = harness(false, { at: pass.passedAt + 1 });
  const freshResult = anotherBrowser.begin();
  assert.equal(anotherBrowser.all('entry-yes').length, 1, 'different browser has no pass');
  anotherBrowser.all('entry-no')[0].click(); assert.equal(await freshResult, false);
});
test('blocked storage, malformed data and future-dated passes cannot bypass the quiz', async () => {
  const blocked = harness(false, { storageBlocked: true }), result = blocked.begin();
  blocked.all('entry-yes')[0].click();
  for (let i = 0; i < 3; i++) { blocked.advance(1000); blocked.answer(); }
  assert.equal(await result, true, 'passing still works without storage'); assert.equal(blocked.storage.size, 0);
  const now = Date.parse('2026-07-01T12:00:00Z');
  for (const raw of ['bad json', 'null', '"yes"', '{}', JSON.stringify({ passedAt: now + 1000, expiresAt: now + 86401000 }), JSON.stringify({ passedAt: now, expiresAt: now + 999999999 })]) {
    const h = harness(false, { storage: new Map([['20pagine.chronos.pass.v3', raw]]), at: now });
    const result = h.begin(); assert.equal(h.all('entry-yes').length, 1);
    h.all('entry-no')[0].click(); assert.equal(await result, false);
  }
});
test('decorative eyes use all four original frames and stay behind the controls', async () => {
  const h = harness(), result = h.begin();
  assert.equal(h.all('entry-eyes')[0].attrs['aria-hidden'], 'false');
  assert.equal(h.all('entry-eye').length, 8);
  for (const eye of h.all('entry-eye')) {
    assert.equal(eye.children.length, 4);
    eye.children.forEach((image, index) => {
      assert.equal(image.src, `/assets/eyes/frame-${index + 1}.webp`);
      assert(fs.existsSync(image.src.slice(1)));
      assert.equal(image.alt, ''); assert.equal(image.draggable, false);
    });
  }
  const css = fs.readFileSync('assets/entry-gate.css', 'utf8');
  assert(css.includes('pointer-events: none'));
  assert(css.includes('@keyframes entry-eye-sketch'));
  assert(css.includes('.entry-eye-frame { animation: none; opacity: 0; }'));
  assert.equal(h.all('entry-roman').length, 0);
  h.all('entry-no')[0].click(); assert.equal(await result, false);
});
test('defeat detection distinguishes losers, winners, draws, spectators and AI-only games', () => {
  const { isDefeat } = harness().gate;
  assert(isDefeat({ mode: 'pvc', kind: 'mate', turn: 1 }));
  assert(!isDefeat({ mode: 'pvc', kind: 'mate', turn: -1 }));
  assert(!isDefeat({ mode: 'pvp', kind: 'mate', turn: 1 }));
  assert(!isDefeat({ mode: 'pvp', kind: 'mate', turn: -1 }));
  assert(!isDefeat({ mode: 'cvc', kind: 'mate', turn: 1 }));
  for (const kind of ['none', 'check', 'stalemate', 'insufficient', 'repetition', 'fifty']) assert(!isDefeat({ mode: 'pvc', kind, turn: 1 }));
  for (const color of [1, -1]) {
    const online = { status: 'over', reason: 'mate', color, winner: color === 1 ? 'black' : 'white' };
    assert(isDefeat({ mode: 'online', online }));
    assert(isDefeat({ mode: 'online', online: { ...online, reason: 'resign' } }));
    assert(!isDefeat({ mode: 'online', online: { ...online, winner: color === 1 ? 'white' : 'black' } }));
    assert(!isDefeat({ mode: 'online', online: { ...online, color: 0 } }));
    assert(!isDefeat({ mode: 'online', online: { ...online, winner: 'draw', reason: 'repetition' } }));
    assert(!isDefeat({ mode: 'online', online: { ...online, reason: 'cancel' } }));
    assert(!isDefeat({ mode: 'online', online: { ...online, status: 'active' } }));
  }
});
test('punishment questions add fifteen clocks modulo twelve with one correct answer', () => {
  const h = harness(); let seed = 123;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < 500; i++) {
    const question = h.gate.makeQuestion(random, 15);
    assert.equal(question.clocks.length, 15);
    assert.equal(question.options[question.correctIndex].minute, question.clocks.reduce((sum, clock) => sum + clock.minute, 0) % 12);
    assert.equal(new Set(question.options.map(clock => clock.minute)).size, 4);
  }
  for (const invalid of [0, 16, 1.5]) assert.throws(() => h.gate.makeQuestion(random, invalid));
});
test('eye taunt precedes all 300 questions, ignoring but preserving the daily entrance pass', async () => {
  const at = Date.parse('2026-07-01T12:00:00Z'), existing = JSON.stringify({ passedAt: at, expiresAt: at + 86400000 });
  const storage = new Map([['20pagine.chronos.pass.v3', existing]]);
  const h = harness(false, { storage, at }), result = h.begin({ punishment: true });
  assert(h.all('entry-card')[0].children.some(node => node.textContent === 'BROO'));
  assert.equal(h.all('entry-big-eye')[0].children.length, 3);
  assert.equal(h.all('entry-choice').length, 0);
  h.advance(16000);
  for (let i = 0; i < 300; i++) {
    assert.equal(h.all('entry-term').length, 15);
    assert.equal(h.all('entry-progress')[0].attrs['aria-label'], `Domanda ${i + 1} di 300`);
    if (i === 299) assert.equal(h.all('entry-progress')[0].textContent, 'CCC / CCC');
    h.advance(1000); h.answer();
  }
  assert.equal(await result, true); assert.equal(h.timers.size, 0);
  assert.equal(h.storage.get('20pagine.chronos.pass.v3'), existing);
  assert.equal(h.closeCalls, 0);
});
test('punishment dismissal preserves the pass, but errors and timeouts revoke it and exit', async () => {
  for (const mode of ['abort', 'wrong', 'timeout']) {
    const h = harness(), controller = new AbortController();
    h.storage.set('20pagine.chronos.pass.v3', 'existing'); h.storage.set('unrelated', 'keep');
    const result = h.begin({ punishment: true, signal: controller.signal });
    if (mode === 'abort') controller.abort();
    else {
      h.advance(17000);
      if (mode === 'wrong') h.answer(false); else h.advance(12000);
      assert(!h.all('entry-card')[0].children.some(node => node.textContent === 'CHRONOS HA VINTO.'));
      h.advance(900);
      assert.equal(h.timers.size, 0);
    }
    assert.equal(await result, false); assert.equal(h.timers.size, 0); assert.equal(h.closeCalls, ['wrong', 'timeout'].includes(mode) ? 1 : 0);
    assert.equal(h.destination, ['wrong', 'timeout'].includes(mode) ? 'about:blank' : undefined);
    assert.equal(h.storage.has('20pagine.chronos.pass.v3'), !['wrong', 'timeout'].includes(mode));
    assert.equal(h.storage.get('unrelated'), 'keep');
  }
});
test('loss overlay has no exit button or Escape shortcut and restores interaction on abort', async () => {
  const h = harness(), controller = new AbortController();
  h.body.style.overflow = 'auto'; h.root.inert = false;
  const result = h.gate.punish({ signal: controller.signal });
  const overlay = h.body.children.find(node => node.className === 'entry-defeat-overlay');
  assert(overlay); assert.equal(h.root.inert, true); assert.equal(h.body.style.overflow, 'hidden');
  assert.equal(overlay.attrs['role'], 'dialog');
  assert.equal(overlay.querySelector('.entry-exit'), undefined);
  overlay.events.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(h.root.inert, true);
  controller.abort();
  assert.equal(await result, false);
  assert.equal(h.root.inert, false); assert.equal(h.body.style.overflow, 'auto');
  assert(!h.body.children.includes(overlay)); assert.equal(h.timers.size, 0);
  assert.equal(h.tabUpdates.at(-1), 'chess');
});
test('jumpscare dialogue plays in order then starts automatically in both languages', async () => {
  for (const french of [false, true]) {
    const h = harness(french), controller = new AbortController();
    const result = h.begin({ punishment: true, signal: controller.signal });
    const words = h.gate.TEXT[french ? 'fr' : 'it'];
    const heading = () => h.all('entry-card')[0].children.find(node => node.tag === 'h1');
    assert.equal(heading().textContent, 'BROO');
    assert.equal(h.all('entry-jumpscare').length, 1);
    assert.equal(h.all('entry-punishment-begin').length, 0);
    h.advance(1200);
    for (let i = 1; i <= 6; i++) {
      assert.equal(heading().textContent, words['speech' + i]);
      assert.equal(h.all('entry-term').length, 0);
      h.advance(i === 3 ? 3800 : 2200);
    }
    assert.equal(h.all('entry-jumpscare').length, 0);
    assert.equal(h.all('entry-term').length, 15);
    controller.abort(); assert.equal(await result, false); assert.equal(h.timers.size, 0);
    h.advance(30000); assert.equal(h.all('entry-choice').length, 0);
  }
});
test('blocked storage cannot prevent punishment failure from exiting', async () => {
  const h = harness(false, { storageBlocked: true }), result = h.begin({ punishment: true });
  h.advance(17000); h.answer(false); h.advance(900);
  assert.equal(await result, false); assert.equal(h.closeCalls, 1);
  assert.equal(h.destination, 'about:blank'); assert.equal(h.timers.size, 0);
});
test('feedback waits for ended events and locks repeated clicks until audio completes', async () => {
  const h = harness(false, { audioMode: 'allowed' }), result = h.begin();
  h.all('entry-yes')[0].click(); h.advance(1000);
  h.audioClips.at(-1).end();
  h.answer();
  assert.equal(h.played.at(-1), '/assets/sounds/Chronos_Clock_Question_Correct.mp3.MPEG');
  const correct = h.audioClips.at(-1), playedCount = h.played.length;
  h.answer(); h.advance(5000);
  assert.equal(h.played.length, playedCount);
  correct.end();
  assert.equal(h.played.at(-1), '/assets/sounds/chronos_math_sound.mp3.MPEG');
  h.advance(1000); h.answer(false);
  assert.equal(h.all('entry-wrong-frame').length, 9);
  h.all('entry-wrong-frame').forEach(node => assert(fs.existsSync(node.src.slice(1))));
  assert.equal(h.played.at(-1), '/assets/sounds/Chronos_Clock_Question_Incorrect.mp3.MPEG');
  h.advance(5000); assert.equal(h.closeCalls, 0);
  h.audioClips.at(-1).end();
  assert.equal(await result, false); assert.equal(h.closeCalls, 1);
  assert.equal(h.timers.size, 0);
});
test('blocked or failed feedback audio does not leave the quiz stuck', async () => {
  for (const audioMode of ['blocked', 'allowed']) {
    const h = harness(false, { audioMode }), result = h.begin({ punishment: true });
    h.advance(17000); h.answer();
    if (audioMode === 'allowed') h.audioClips.at(-1).error();
    await Promise.resolve(); await Promise.resolve();
    h.advance(1000); h.answer(false);
    if (audioMode === 'allowed') h.audioClips.at(-1).error();
    await Promise.resolve();
    assert.equal(await result, false); assert.equal(h.closeCalls, 1);
    assert.equal(h.timers.size, 0);
  }
});
test('the final correct clip finishes before entrance access is granted', async () => {
  const h = harness(false, { audioMode: 'allowed' }), result = h.begin();
  h.all('entry-yes')[0].click();
  for (let i = 0; i < 3; i++) {
    h.advance(1000); h.answer();
    assert.equal(h.storage.size, 0);
    h.audioClips.at(-1).end();
  }
  assert.equal(await result, true); assert.equal(h.storage.size, 1);
  assert.equal(h.timers.size, 0);
});

test('all referenced quiz sound files are bundled MP3 assets', () => {
  for (const name of ['chronos_math_sound', 'Chronos_Clock_Question_Correct', 'Chronos_Clock_Question_Incorrect']) {
    const bytes = fs.readFileSync(`assets/sounds/${name}.mp3.MPEG`);
    assert(bytes.length > 1000);
    assert(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
  }
});

test('chess defeat shows mouths throughout the introduction and questions', async () => {
  const h = harness(), result = h.begin({ punishment: true });
  assert.equal(h.all('entry-mouth-frame').length, 27);
  assert.equal(h.all('entry-eye-frame').length, 0);
  h.advance(17000);
  assert.equal(h.all('entry-mouth-frame').length, 27);
  h.answer(false);
  assert.equal(h.all('entry-eye-frame').length, 0);
  const frames = h.all('entry-mouth-frame');
  assert.equal(frames.length, 27);
  for (const node of frames) assert(fs.existsSync(node.src.slice(1)));
  assert.equal(h.all('entry-big-eye')[0].hidden, true);
  h.advance(900); assert.equal(await result, false);
});

test('normal entrance keeps eyes until homework failure', async () => {
  const h = harness(), result = h.begin();
  assert.equal(h.all('entry-eye-frame').length, 32);
  assert.equal(h.all('entry-mouth-frame').length, 0);
  h.all('entry-yes')[0].click(); h.advance(1000);
  assert.equal(h.all('entry-eye-frame').length, 32);
  h.answer(false);
  assert.equal(h.all('entry-eye-frame').length, 0);
  assert.equal(h.all('entry-mouth-frame').length, 24);
  assert.equal(await result, false);
});
test('quiz clocks contain all three drawings with explicit equal animation phases', () => {
  const h = harness(); h.begin(); h.all('entry-yes')[0].click(); h.advance(1000);
  for (const clock of h.all('entry-clock')) {
    const frames = clock.children.filter(node => node.className?.startsWith('entry-clock-face '));
    assert.equal(frames.length, 3);
    frames.forEach((node, index) => assert.equal(node.src, `/assets/clock/face-${index + 1}.png`));
  }
  const css = fs.readFileSync('assets/entry-gate.css', 'utf8');
  for (let i = 1; i <= 3; i++) assert(css.includes(`@keyframes entry-clock-frame-${i}`));
  assert(css.includes('.entry-clock-face-2 { animation-name: entry-clock-frame-2; }'));
  assert(css.includes('.entry-clock-face-3 { animation-name: entry-clock-frame-3; }'));
  assert(css.includes('33.333% { opacity: 1; } 66.666% { opacity: 0; }'));
  assert(css.includes('.entry-clock-face-1 { opacity: 1; }'));
});
test('aborting during correct or wrong feedback cancels pending continuation', async () => {
  for (const correct of [true, false]) {
    const h = harness(false, { audioMode: 'allowed' }), controller = new AbortController();
    const result = h.begin({ signal: controller.signal });
    h.all('entry-yes')[0].click(); h.advance(1000); h.answer(correct);
    const clip = h.audioClips.at(-1);
    controller.abort(); assert.equal(await result, false);
    clip.end(); h.advance(70000);
    assert.equal(h.closeCalls, 0); assert.equal(h.timers.size, 0);
  }
});

test('wrong feedback closes at sixty percent rather than waiting for ended', async () => {
  const h = harness(false, { audioMode: 'allowed' }), result = h.begin();
  h.all('entry-yes')[0].click(); h.advance(1000); h.answer(false);
  const wrong = h.audioClips.at(-1);
  wrong.duration = 10; wrong.currentTime = 5.9; wrong.events.timeupdate();
  assert.equal(h.closeCalls, 0);
  wrong.currentTime = 6; wrong.events.timeupdate();
  assert.equal(await result, false); assert.equal(h.closeCalls, 1);
  assert.equal(h.timers.size, 0);
});
test('wrong-answer X marks all three incorrect clocks but leaves the correct one clear', async () => {
  const h = harness(false, { audioMode: 'allowed' }), result = h.begin();
  h.all('entry-yes')[0].click(); h.advance(1000); h.answer(false);
  assert.equal(h.all('entry-choice').length, 4);
  assert.equal(h.all('entry-choice').filter(button => h.all('entry-wrong', button).length).length, 3);
  const marked = h.all('entry-choice').find(button => h.all('entry-wrong', button).length);
  assert.equal(h.all('entry-wrong', h.all('entry-clock', marked)[0]).length, 1);
  h.audioClips.at(-1).end(); assert.equal(await result, false);
});
test('eyes give cumulative hints immediately without bypassing entrance', async () => {
  const h = harness(), result = h.begin();
  const eyes = h.all('entry-hint-eye'); assert.equal(eyes.length, 8);
  eyes[0].click(); eyes[0].click(); eyes[1].click();
  assert.equal(h.all('entry-closed-frame').length, 6);
  assert.equal(h.storage.size, 0);
  h.all('entry-yes')[0].click(); h.advance(1000);
  assert.equal(h.all('entry-choice').filter(node => node.disabled).length, 0);
  eyes[2].click();
  assert.equal(h.all('entry-choice').filter(node => node.disabled).length, 1);
  for (let i = 3; i < 6; i++) eyes[i].click();
  assert.equal(h.all('entry-choice').filter(node => node.disabled).length, 2);
  eyes[6].click(); eyes[7].click();
  assert.equal(h.all('entry-choice').filter(node => node.disabled).length, 3);
  assert.equal(h.all('entry-wrong-frame').length, 9);
  for (let i = 0; i < 3; i++) {
    h.answer();
    if (i < 2) { h.advance(1000); assert.equal(h.all('entry-choice').filter(node => node.disabled).length, 3); }
  }
  assert.equal(await result, true);
});

test('mouth frames run at 240ms each while eye speed remains unchanged', async () => {
  const h = harness(), controller = new AbortController();
  const result = h.begin({ punishment: true, signal: controller.signal });
  const frames = h.all('entry-big-eye')[0].children;
  assert.equal(frames.length, 3);
  frames.forEach((node, i) => {
    assert.equal(node.src, `/assets/mouths/frame-${i + 1}.webp`);
    assert.equal(node.style.animationDelay, `${-i * 0.24}s`);
  });
  const css = fs.readFileSync('assets/entry-gate.css', 'utf8');
  assert(css.includes('animation: entry-mouth-sketch .72s step-end infinite'));
  assert(css.includes('animation: entry-eye-sketch .72s step-end infinite'));
  assert(css.includes('.entry-mouth-frame { animation: none; opacity: 0; }'));
  controller.abort(); assert.equal(await result, false);
});

test('15-clock wrong answers and timeouts close immediately without another Chronos reveal', async () => {
  for (const timeout of [false, true]) {
    const h = harness(false, { audioMode: 'allowed' }), result = h.begin({ punishment: true });
    h.advance(17000);
    const big = h.all('entry-big-eye')[0]; assert.equal(big.hidden, true);
    if (timeout) h.advance(12000); else h.answer(false);
    assert.equal(await result, false); assert.equal(h.closeCalls, 1);
    assert.equal(h.destination, 'about:blank'); assert.equal(big.hidden, true);
    assert.equal(h.all('entry-failed').length, 0);
    assert.equal(h.played.some(src => src.includes('Incorrect')), false);
    assert.equal(h.timers.size, 0);
  }
});
function launchPractice(h) {
  h.all('entry-practice-setup')[0].events.submit({ preventDefault() {} });
}
function closePracticeEyes(h) {
  for (const eye of h.all('entry-hint-eye')) {
    if (eye.attrs['aria-pressed'] === 'false') eye.click();
  }
}
test('practice setup defaults, validation, settings and exit preserve the daily pass', async () => {
  const storage = new Map([['20pagine.chronos.pass.v3', 'unchanged']]);
  const h = harness(false, { storage }), result = h.begin({ practice: true });
  assert.equal(h.all('entry-setting-seconds')[0].value, '12');
  assert.equal(h.all('entry-setting-clocks')[0].value, '2');
  assert.equal(h.all('entry-closed-frame').length, 24);
  assert.equal(h.all('entry-eye-frame').length, 0);
  for (const value of ['0', '121', '2.5', 'abc']) {
    h.all('entry-setting-seconds')[0].value = value; launchPractice(h);
    assert.equal(h.all('entry-term').length, 0);
  }
  h.all('entry-setting-seconds')[0].value = '5';
  h.all('entry-setting-clocks')[0].value = '16'; launchPractice(h);
  assert.equal(h.all('entry-term').length, 0);
  h.all('entry-setting-clocks')[0].value = '7'; launchPractice(h);
  assert.equal(h.all('entry-clock', h.all('entry-equation')[0]).length, 7);
  h.advance(1000); assert.equal(h.all('entry-countdown')[0].textContent, 'V');
  h.all('entry-practice-exit')[0].click();
  assert.equal(await result, false); assert.equal(h.timers.size, 0);
  assert.equal(storage.get('20pagine.chronos.pass.v3'), 'unchanged');
});
test('practice continues past three questions and resets streak on wrong answers and timeout', async () => {
  const h = harness(), result = h.begin({ practice: true }); launchPractice(h);
  for (let i = 0; i < 8; i++) {
    h.advance(1000); closePracticeEyes(h); h.answer();
    assert.equal(h.all('entry-progress')[0].textContent, `Streak: ${i + 1}`);
  }
  h.advance(1000); closePracticeEyes(h); h.answer(false);
  assert.equal(h.all('entry-progress')[0].textContent, 'Streak: 0');
  assert.equal(h.closeCalls, 0);
  for (let i = 0; i < 13; i++) { h.advance(1000); closePracticeEyes(h); }
  assert.equal(h.all('entry-progress')[0].textContent, 'Streak: 0');
  assert.equal(h.closeCalls, 0); assert.equal(h.storage.size, 0);
  h.all('entry-practice-exit')[0].click(); assert.equal(await result, false);
});
test('practice eyes open one by one, can be closed repeatedly, and catch after four seconds', async () => {
  const h = harness(), result = h.begin({ practice: true }); launchPractice(h);
  h.advance(4999); assert.equal(h.all('entry-eye-frame').length, 0);
  h.advance(1); assert.equal(h.all('entry-eye-frame').length, 4);
  const open = h.all('entry-hint-eye').find(eye => eye.attrs['aria-pressed'] === 'false');
  open.click(); assert.equal(h.all('entry-eye-frame').length, 0);
  h.advance(4999); assert.equal(h.all('entry-eye-frame').length, 0);
  h.advance(1); assert.equal(h.all('entry-eye-frame').length, 4);
  h.advance(3999); assert.equal(h.closeCalls, 0);
  h.advance(1);
  assert.equal(h.all('entry-mouth-frame').length, 24);
  assert.equal(h.all('entry-caught').length, 1);
  assert(h.all('entry-card')[0].children.some(node => node.textContent === 'PERCHè è TUTTO BLUE?!?!'));
  h.advance(499); assert.equal(h.closeCalls, 0);
  h.advance(1); assert.equal(await result, false); assert.equal(h.closeCalls, 1);
  assert.equal(h.destination, 'about:blank'); assert.equal(h.timers.size, 0);
});
test('practice can be aborted during caught message without closing later', async () => {
  const h = harness(), controller = new AbortController();
  const result = h.begin({ practice: true, signal: controller.signal }); launchPractice(h);
  h.advance(9000); assert.equal(h.all('entry-caught').length, 1);
  controller.abort(); assert.equal(await result, false);
  h.advance(1000); assert.equal(h.closeCalls, 0); assert.equal(h.timers.size, 0);
});
test('default review uses the entrance quiz layout rather than punishment grid', async () => {
  const h = harness(), result = h.begin({ practice: true }); launchPractice(h);
  assert.equal(h.all('entry-punishment').length, 0);
  const equation = h.all('entry-equation')[0];
  assert.equal(h.all('entry-clock', equation).length, 2);
  assert.equal(h.all('entry-term', equation).length, 0);
  assert.equal(h.all('entry-plus', equation).length, 2);
  assert.equal(h.all('entry-equation-many').length, 0);
  const css = fs.readFileSync('assets/entry-gate.css', 'utf8');
  assert(!css.includes('.entry-practice .entry-card'));
  assert(!css.includes('.entry-practice .entry-eye:nth-child'));
  h.all('entry-practice-exit')[0].click(); assert.equal(await result, false);
});

test('practice closed eyes use three distinct phases without double animation delays', async () => {
  const h = harness(), result = h.begin({ practice: true });
  function verifyClosed() {
    const frames = h.all('entry-closed-frame'); assert.equal(frames.length, 24);
    for (const frame of frames) assert.equal(frame.style.animationDelay, undefined);
    for (const eye of h.all('entry-hint-eye')) {
      assert.equal(eye.children.length, 3);
      eye.children.forEach((frame, index) => assert.equal(frame.src, `/assets/closed-eyes/frame-${index + 1}.webp`));
    }
  }
  verifyClosed(); launchPractice(h); h.advance(5000);
  closePracticeEyes(h); verifyClosed();
  const css = fs.readFileSync('assets/entry-gate.css', 'utf8');
  assert(css.includes('.entry-closed-frame-2 { animation-name: entry-clock-frame-2; }'));
  assert(css.includes('.entry-closed-frame-3 { animation-name: entry-clock-frame-3; }'));
  h.all('entry-practice-exit')[0].click(); assert.equal(await result, false);
});
test('review eyes alternate single and double speed upgrades with a safe floor', () => {
  const interval = harness().gate.practiceSpawnInterval;
  for (const [streak, expected] of [[0, 5000], [4, 5000], [5, 4750], [9, 4750], [10, 4250], [14, 4250], [15, 3875], [20, 3125], [25, 2562.5], [30, 1500], [35, 1500], [40, 1500], [45, 1500], [49, 1500], [50, 1500], [500, 1500]]) {
    assert.equal(interval(streak), expected);
  }
});
test('review spawn schedule resets to five seconds after streak loss', async () => {
  const h = harness(), result = h.begin({ practice: true }); launchPractice(h);
  for (let i = 0; i < 10; i++) { h.advance(1000); closePracticeEyes(h); h.answer(); }
  assert.equal(h.all('entry-progress')[0].textContent, 'Streak: 10');
  h.advance(1000); closePracticeEyes(h); h.answer(false);
  assert.equal(h.all('entry-progress')[0].textContent, 'Streak: 0');
  h.advance(4999); assert.equal(h.all('entry-eye-frame').length, 0);
  h.advance(1); assert.equal(h.all('entry-eye-frame').length, 4);
  h.all('entry-practice-exit')[0].click(); assert.equal(await result, false);
});
test('review preserves configured clock count past streak ten and after failure', async () => {
  for (const initial of [1, 2, 3, 5]) {
    const h = harness(), result = h.begin({ practice: true });
    h.all('entry-setting-clocks')[0].value = String(initial); launchPractice(h);
    const clocks = () => h.all('entry-clock', h.all('entry-equation')[0]).length;
    for (let i = 0; i < 10; i++) {
      assert.equal(clocks(), initial);
      h.advance(1000); closePracticeEyes(h); h.answer();
    }
    assert.equal(clocks(), initial);
    h.advance(1000); closePracticeEyes(h); h.answer(false);
    assert.equal(clocks(), initial);
    h.all('entry-practice-exit')[0].click(); assert.equal(await result, false);
  }
});

test('quiz, review and Chronos events update browser tab state', async () => {
  const h = harness(), result = h.begin();
  assert.equal(h.tabUpdates.at(-1), 'compiti');
  h.all('entry-yes')[0].click(); h.advance(1000); h.answer(false);
  assert.equal(await result, false); assert.equal(h.tabUpdates.at(-1), 'enraged');
  const review = harness(), controller = new AbortController();
  const pending = review.begin({ practice: true, signal: controller.signal });
  assert.equal(review.tabUpdates.at(-1), 'review'); launchPractice(review);
  review.advance(9000); assert.equal(review.tabUpdates.at(-1), 'enraged');
  controller.abort(); assert.equal(await pending, false);
  const loss = harness(), stop = new AbortController();
  const punishment = loss.begin({ punishment: true, signal: stop.signal });
  assert.equal(loss.tabUpdates.at(-1), 'enraged'); stop.abort(); await punishment;
});
