const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
test('time navigation steps one ply through either side and keeps AI paused', () => {
  const context = vm.createContext({ self: {}, RISIO_MODE: false, d: false, z: 'pvc',
    q() {}, K() {}, f() {}, $l() {}, setHistoryPaused(value) { context.paused = value; },
  });
  vm.runInContext(fs.readFileSync('assets/coach-worker.js', 'utf8'), context);
  vm.runInContext(html.slice(html.indexOf('const Kf ='), html.indexOf('function Fh(')), context);
  vm.runInContext(html.slice(html.indexOf('const Ih ='), html.indexOf('function Ph(')), context);
  vm.runInContext('const o = kh(), R = o.pos; for(let i=0;i<4;i++) Iu(o, R.legalMoves()[0], true);', context);
  vm.runInContext(html.slice(html.indexOf('  function Pa()'), html.indexOf('  let Bt;')), context);
  const state = () => vm.runInContext('[R.hist.length, R.turn, o.notes.length, o.redo.length].join(",")', context);
  assert.equal(state(), '4,1,4,0');
  context.Pa(); assert.equal(state(), '3,-1,3,1'); assert.equal(context.paused, true);
  context.Pa(); assert.equal(state(), '2,1,2,2');
  context.lu(); assert.equal(state(), '3,-1,3,1');
  context.lu(); assert.equal(state(), '4,1,4,0'); assert.equal(context.paused, true);
  context.lu(); assert.equal(state(), '4,1,4,0');
  for(let i=0;i<5;i++) context.Pa();
  assert.equal(state(), '0,1,0,4');
  assert(html.includes('d = !historyPaused && !reviewActive && !V.over'));
  assert(html.includes('reviewActive || historyPaused || V.over'));
  assert(html.includes('o.redo = []; setHistoryPaused(false); f();'));
});
