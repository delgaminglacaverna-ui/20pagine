const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
test('AI vs player rates both sides but requests explanations only for human moves', () => {
  let analyses = 0, explanations = 0;
  const o = { notes: [] }, R = { hist: [] };
  const c = vm.createContext({ o, R, RISIO_MODE: false, FRENCH_MODE: false, z: 'pvc', f() {},
    Iu: (state, move) => { state.notes.push({}); R.hist.push({ move }); },
    window: { MoveCoach: {
      analyze(moves, french, callback) { analyses++; callback({ symbol: 'V' }); },
      explain(moves, french, review, callback) { explanations++; callback({ comment: 'Test' }); },
    } },
  });
  vm.runInContext(html.slice(html.indexOf('  function liveRisioMove('), html.indexOf('  function re(')), c);
  c.liveRisioMove({ piece: 1, from: 1, to: 2 });
  assert.equal(analyses, 1); assert.equal(explanations, 1);
  c.liveRisioMove({ piece: -1, from: 3, to: 4 });
  assert.equal(analyses, 2); assert.equal(explanations, 1);
  assert.equal(o.notes[1].review.symbol, 'V');
  c.z = 'pvp'; c.liveRisioMove({ piece: -1 }); assert.equal(analyses, 3);
  c.z = 'cvc'; c.liveRisioMove({ piece: -1 }); assert.equal(analyses, 4);
});
test('after the AI reply commentary stays on the player while score and badge use the latest move', () => {
  const c = vm.createContext({ o: { notes: [{ review: { symbol: 'V' } }, { review: { symbol: 'X', whiteScore: -150 } }] }, R: { hist: [{ move: { piece: 1, to: 42 } }, { move: { piece: -1, to: 71 } }] }, RISIO_MODE: false, z: 'pvc', hr: () => 0 });
  vm.runInContext(html.slice(html.indexOf('  let coachIndex ='), html.indexOf('  const en =')), c);
  assert.equal(vm.runInContext('coachIndex', c), 0);
  assert.equal(vm.runInContext('lastCoachReview.symbol', c), 'V');
  assert.equal(vm.runInContext('positionReview.symbol', c), 'X');
  assert.equal(vm.runInContext('positionScore', c), -150);
  assert(html.includes('R.hist[R.hist.length - 1]?.move.to, review: positionReview'));
});

test('position evaluation has a labeled static fallback while search is pending', () => {
  const c = vm.createContext({ o: { notes: [{ review: { pending: true } }] }, R: { hist: [{ move: { piece: 1 } }] }, RISIO_MODE: false, z: 'pvc', hr: () => 225 });
  vm.runInContext(html.slice(html.indexOf('  let coachIndex ='), html.indexOf('  const en =')), c);
  assert.equal(vm.runInContext('positionScore', c), 225);
  assert(html.includes('stima statica (analisi non ancora disponibile)'));
});
