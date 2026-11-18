const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
for (const french of [false, true]) {
  for (const resizeObserver of [false, true]) {
    let onResize, disconnected = false;
    const context = vm.createContext({
      URLSearchParams, location: { search: french ? '?version=french' : '' },
      document: { documentElement: {} },
      v: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      window: { addEventListener: (_, fn) => { onResize = fn; }, removeEventListener: (_, fn) => { assert.equal(fn, onResize); } },
      ...(resizeObserver ? { ResizeObserver: class { observe() {} disconnect() { disconnected = true; } } } : {}),
    });
    vm.runInContext(html.slice(html.indexOf('const Ht ='), html.indexOf('function wh(')) + '\nglobalThis.api = { frenchText, watchBoardSize, Ff };', context);
    const { frenchText, watchBoardSize, Ff } = context.api;
    for (const seconds of [1, 9, 30]) {
      assert.equal(frenchText(`Salta tra ${seconds}s`), french ? `Passer dans ${seconds} s` : `Salta tra ${seconds}s`);
    }
    assert.equal(frenchText('Salta ⏭'), french ? 'Passer ⏭' : 'Salta ⏭');
    const styles = {};
    const board = { clientWidth: 600, style: { setProperty: (key, value) => { styles[key] = value; } } };
    const cleanup = watchBoardSize(board);
    assert.equal(parseFloat(styles['--chess-piece-size']), 600 * .086);
    board.clientWidth = 1000;
    onResize();
    assert.equal(styles['--chess-piece-size'], '86px');
    assert.equal(styles['--chess-coordinate-size'], '17px');
    assert(!Ff({ code: 1 }).props.style.fontSize.includes('cqw'));
    assert.equal(Ff({ code: 1, size: '2rem' }).props.style.fontSize, '2rem');
    cleanup();
    assert.equal(disconnected, resizeObserver);
  }
}
console.log('Countdown translations and board sizing with/without ResizeObserver passed.');
