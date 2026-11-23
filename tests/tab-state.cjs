const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
test('tab title and favicon follow each mode and reuse one icon link', () => {
  let icon, added = 0;
  const document = {
    title: '', getElementById: id => id === 'tab-icon' ? icon : undefined,
    createElement: () => ({}), head: { appendChild: node => { icon = node; added++; } },
  };
  const context = vm.createContext({ document });
  vm.runInContext(fs.readFileSync('assets/tab-state.js', 'utf8'), context);
  const api = context.TabState;
  const cases = [
    ['compiti', 'HAI FATTO I COMPITI???', '/assets/tabs/chronos-eye.png'],
    ['chess', 'TEMPO ESTREMO COME IL DIH', '/assets/tabs/pawn.svg'],
    ['french', '(gbfjkdfugyfhdjk)/', '/assets/tabs/cigarette.svg'],
    ['review', 'NON SI FANNO I COMPITI IN CLASSE!!', '/assets/tabs/chronos-closed-eye.png'],
    ['enraged', 'IO SAREI MORTIFICATO, NON PROVI VERGOGNA', '/assets/tabs/chronos-mouth.png'],
    ['chess', 'TEMPO ESTREMO COME IL DIH', '/assets/tabs/pawn.svg'],
  ];
  for (const [mode, title, path] of cases) {
    api.set(mode); assert.equal(api.get(), mode);
    assert.equal(document.title, title); assert.equal(icon.href, path);
    assert(fs.existsSync(path.slice(1)));
  }
  api.set('__proto__'); assert.equal(api.get(), 'chess'); assert.equal(added, 1);
});

test('French version uses exact alternate titles while preserving mode icons and chess title', () => {
  const icon = {};
  const document = { title: '', getElementById: () => icon };
  const context = vm.createContext({ document, URLSearchParams, location: { search: '?version=french' } });
  vm.runInContext(fs.readFileSync('assets/tab-state.js', 'utf8'), context);
  assert.equal(document.title, "MIO FIGLIO HA STUDIATO L'INGLESE E LAVORA IN FRANCIA");
  for (const [mode, title, image] of [
    ['review', 'perchè è tutto blanc', '/assets/tabs/chronos-closed-eye.png'],
    ['enraged', 'los tempos es bellos hahahas', '/assets/tabs/chronos-mouth.png'],
    ['french', '(gbfjkdfugyfhdjk)/', '/assets/tabs/cigarette.svg'],
    ['compiti', "MIO FIGLIO HA STUDIATO L'INGLESE E LAVORA IN FRANCIA", '/assets/tabs/chronos-eye.png'],
  ]) {
    context.TabState.set(mode); assert.equal(document.title, title); assert.equal(icon.href, image);
  }
});

test('Risio has its own tab immediately, independently of the French query flag', () => {
  const icon = {}, document = { title: '', getElementById: () => icon };
  const context = vm.createContext({ document, URLSearchParams, location: { pathname: '/risio', search: '?version=french' } });
  vm.runInContext(fs.readFileSync('assets/tab-state.js', 'utf8'), context);
  assert.equal(context.TabState.get(), 'risio'); assert.equal(document.title, 'RISIO');
  assert.equal(icon.href, '/assets/enfosi/smiley.png');
});

test('Chronos favicons use tinted PNG assets without replacing in-page frames', () => {
  for (const name of ['chronos-eye', 'chronos-closed-eye', 'chronos-mouth']) {
    const bytes = fs.readFileSync(`assets/tabs/${name}.png`);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  }
  const html = fs.readFileSync('index.html', 'utf8');
  assert(html.includes('rel="icon" type="image/png" href="/assets/tabs/chronos-eye.png"'));
  for (const folder of ['eyes', 'closed-eyes', 'mouths']) assert(fs.existsSync(`assets/${folder}/frame-1.webp`));
});
