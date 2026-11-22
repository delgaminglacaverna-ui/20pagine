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
    ['compiti', 'HAI FATTO I COMPITI???', '/assets/eyes/frame-1.webp'],
    ['chess', 'TEMPO ESTREMO COME IL DIH', '/assets/tabs/pawn.svg'],
    ['french', '(gbfjkdfugyfhdjk)/', '/assets/tabs/cigarette.svg'],
    ['review', 'NON SI FANNO I COMPITI IN CLASSE!!', '/assets/closed-eyes/frame-1.webp'],
    ['enraged', 'IO SAREI MORTIFICATO, NON PROVI VERGOGNA', '/assets/mouths/frame-1.webp'],
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
    ['review', 'perchè è tutto blanc', '/assets/closed-eyes/frame-1.webp'],
    ['enraged', 'los tempos es bellos hahahas', '/assets/mouths/frame-1.webp'],
    ['french', '(gbfjkdfugyfhdjk)/', '/assets/tabs/cigarette.svg'],
    ['compiti', "MIO FIGLIO HA STUDIATO L'INGLESE E LAVORA IN FRANCIA", '/assets/eyes/frame-1.webp'],
  ]) {
    context.TabState.set(mode); assert.equal(document.title, title); assert.equal(icon.href, image);
  }
});
