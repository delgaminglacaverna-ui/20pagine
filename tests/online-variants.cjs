const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Chess = require('../lib/chess.cjs');
test('asymmetric French attacks restrict only the selected attacker', () => {
  const p = new Chess(); p.b.fill(0); p.castling = 0; p.frenchSides = [1];
  p.b[44] = 4; p.b[64] = -4;
  assert.equal(p.attacked(43, 1), false);
  assert.equal(p.attacked(63, -1), true);
  p.frenchSides = [-1];
  assert.equal(p.attacked(43, 1), true);
  assert.equal(p.attacked(63, -1), false);
});
test('personal match URLs preserve variant before the match parameter', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const source = html.slice(html.indexOf('function onlVariant('), html.indexOf('const ONL_KEY ='));
  for (const [RISIO_MODE, FRENCH_MODE, expected] of [[false, false, '/?partita=ABCD1234'], [false, true, '/?version=french&partita=ABCD1234'], [true, false, '/risio?partita=ABCD1234']]) {
    const c = vm.createContext({ RISIO_MODE, FRENCH_MODE, URLSearchParams });
    vm.runInContext(source, c); assert.equal(c.onlPageUrl('ABCD1234'), expected);
    assert.equal(c.onlPageUrl().includes('partita'), false);
  }
  assert(!html.includes('disabled: FRENCH_MODE && B === "online"'));
  assert(!html.includes('RISIO_MODE && B === "online" ? null'));
});
