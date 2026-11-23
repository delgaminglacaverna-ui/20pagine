const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
test('AI vs player analyzes and requests explanations only for human moves', () => {
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
  assert.equal(analyses, 1); assert.equal(explanations, 1);
  assert.equal(o.notes[1].review, undefined);
  c.z = 'pvp'; c.liveRisioMove({ piece: -1 }); assert.equal(analyses, 2);
  c.z = 'cvc'; c.liveRisioMove({ piece: -1 }); assert.equal(analyses, 3);
});
test('after the AI reply the selected coach note and badge still belong to the player', () => {
  const c = vm.createContext({ o: { notes: [{ review: { symbol: 'V' } }, {}] }, R: { hist: [{ move: { piece: 1, to: 42 } }, { move: { piece: -1, to: 71 } }] }, RISIO_MODE: false, z: 'pvc' });
  vm.runInContext(html.slice(html.indexOf('  let coachIndex ='), html.indexOf('  const en =')), c);
  assert.equal(vm.runInContext('coachIndex', c), 0);
  assert.equal(vm.runInContext('lastCoachReview.symbol', c), 'V');
  assert(html.includes('R.hist[coachIndex]?.move.to, review: lastCoachReview'));
});
