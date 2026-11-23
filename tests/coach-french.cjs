const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const i18n = require('../assets/coach-i18n.js');
const { context, fallback, explain } = require('../lib/coach.cjs');
const rules = require('../lib/coach-rules.cjs');
test('coach UI, progress and saved reviews have French translations', () => {
  assert.equal(i18n.text('boi battler dice:'), 'boi battler dit :');
  assert.equal(i18n.text('Analisi 3/20…'), 'Analyse 3/20…');
  assert.equal(i18n.text('Evaluation: +1.00 · profondità 3/4'), 'Évaluation : +1.00 · profondeur 3/4');
  assert.equal(i18n.text('Le tue partite'), 'Vos parties');
  assert.equal(i18n.review({ label: 'Grave errore', comment: 'Italian legacy', explanationSource: 'engine', symbol: '??' }, true).label, 'Gaffe');
  assert(!i18n.review({ label: 'Grave errore', comment: 'Italian legacy', explanationSource: 'engine', symbol: '??' }, true).comment.includes('Italian'));
  assert.equal(i18n.text('boi battler dice:', false), 'boi battler dice:');
});
test('French coach API fallback and optional model instruction use French', async () => {
  const { rr } = rules(true), p = new rr(), moves = p.legalMoves();
  const body = { moves: [moves[0]], alternative: moves[1], french: true, loss: 150, depth: 3 };
  const facts = context(body), text = fallback(facts);
  assert(text.includes('Vous avez joué')); assert(text.includes('Le moteur préférait'));
  assert(!text.includes('Hai giocato')); assert.equal(facts.french, true);
  await explain(body, 'test', { env: { OPENAI_API_KEY: 'test' }, store: { limit: async () => true }, request: async (url, options) => {
    assert(JSON.parse(options.body).messages[0].content.startsWith('Réponds exclusivement en français'));
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Un coup correct.' } }] }) };
  } });
});
test('French analysis grades get localized before reaching UI', () => {
  let worker, result;
  class Worker { constructor() { worker = this; } postMessage() {} terminate() {} }
  const c = vm.createContext({ Worker, CoachI18n: i18n, setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext(fs.readFileSync('assets/move-coach.js', 'utf8'), c);
  c.MoveCoach.analyze([], true, value => { result = value; });
  worker.onmessage({ data: { best: 300, played: 0, second: 100, depth: 3 } });
  assert.equal(result.label, 'Gaffe'); assert(result.comment.startsWith('La recherche'));
});
