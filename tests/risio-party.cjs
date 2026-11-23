const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('Risio has no comment popup but both castling flags still celebrate', () => {
  const children = [], timers = new Map(); let id = 0;
  const document = {
    querySelector: selector => children.find(node => '.' + node.className === selector),
    body: { appendChild: node => children.push(node) },
    createElement: () => ({ style: {}, children: [], setAttribute() {}, appendChild(node) { this.children.push(node); }, remove() { const i = children.indexOf(this); if (i >= 0) children.splice(i, 1); } }),
  };
  const window = { location: { pathname: '/' }, setTimeout: (fn, ms) => { timers.set(++id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id) };
  vm.runInNewContext(fs.readFileSync('assets/risio-effects.js', 'utf8'), { window, document });
  window.RisioEffects.move({ flag: 3 }); assert.equal(children.length, 0);
  window.location.pathname = '/risio';
  window.RisioEffects.move({ flag: 0 }); assert.equal(children.length, 0);
  for (const flag of [3, 4]) {
    window.RisioEffects.move({ flag });
    assert.equal(children.length, 1);
    const party = children.find(node => node.className === 'risio-castle-party');
    assert.equal(party.children.length, 18);
  }
  for (const timer of timers.values()) timer.fn();
  assert.equal(children.length, 0);
  const html = fs.readFileSync('index.html', 'utf8');
  assert(html.includes('liveRisioMove(_l.move)'));
  assert(html.includes('liveRisioMove(_l[0])'));
  assert(html.includes('window.RisioEffects?.move(move)'));
  assert(html.includes('window.MoveCoach.risio(online ? "pvp" : z, move.piece)'));
});
