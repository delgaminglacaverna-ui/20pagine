const { createHash } = require('node:crypto');
const rules = require('./coach-rules.cjs');
const { createRedis } = require('./redis.cjs');
const fail = () => { throw Object.assign(Error('Dati della mossa non validi.'), { status: 400 }); };
function context(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.moves) || !body.moves.length || body.moves.length > 600 || typeof body.french !== 'boolean' || !Number.isFinite(body.loss) || body.loss < 0 || body.loss > 2000000 || ![1, 2].includes(body.depth)) fail();
  const valid = move => move && Number.isInteger(move.from) && move.from >= 0 && move.from < 100 && Number.isInteger(move.to) && move.to >= 0 && move.to < 100 && (move.promo == null || Number.isInteger(move.promo) && move.promo >= 0 && move.promo <= 7);
  if (!body.moves.every(valid) || !valid(body.alternative)) fail();
  const { rr, Ge, Vf } = rules(body.french), pos = new rr();
  const find = code => pos.legalMoves().find(move => move.from === code.from && move.to === code.to && (move.promo || 0) === (code.promo || 0));
  for (const code of body.moves.slice(0, -1)) { const move = find(code); if (!move) fail(); pos.make(move); }
  const chosen = find(body.moves.at(-1)), alternative = find(body.alternative);
  if (!chosen || !alternative) fail();
  const names = ['', 'pedone', 'cavallo', 'alfiere', 'torre', 'donna', 're', "estremo"];
  const describe = move => {
    const notation = Ge(move.from) + '–' + Ge(move.to) + (move.promo ? '=' + names[move.promo] : '');
    pos.make(move);
    const replies = pos.legalMoves(), check = pos.inCheck();
    const capture = replies.filter(reply => reply.captured).sort((a, b) => Vf[Math.abs(b.captured)] - Vf[Math.abs(a.captured)])[0];
    const facts = {
      notation, piece: names[Math.abs(move.piece)], capture: move.captured ? names[Math.abs(move.captured)] : null,
      castle: move.flag === 3 || move.flag === 4, check, mate: check && replies.length === 0,
      possibleCapture: capture ? `${Ge(capture.from)}–${Ge(capture.to)} (${names[Math.abs(capture.captured)]})` : null,
    };
    pos.unmake(); return facts;
  };
  return { played: describe(chosen), alternative: describe(alternative), same: chosen.from === alternative.from && chosen.to === alternative.to && chosen.promo === alternative.promo, loss: body.loss, depth: body.depth };
}
function fallback(facts) {
  const played = facts.played, best = facts.alternative;
  let text = `Hai giocato ${played.notation} con il ${played.piece}. `;
  if (played.mate) text += 'Hai dato scacco matto. ';
  else if (played.check) text += 'Hai dato scacco. ';
  if (played.capture) text += `Hai catturato un ${played.capture}. `;
  if (facts.same) text += 'È anche la migliore mossa trovata dal motore. ';
  else {
    text += `Il motore preferiva ${best.notation}`;
    text += best.mate ? ', che dà matto. ' : best.capture ? `, che cattura un ${best.capture}. ` : best.check ? ', che dà scacco. ' : '. ';
    text += `Differenza stimata: ${(facts.loss / 100).toFixed(2)} pedoni (ricerca breve). `;
  }
  if (played.possibleCapture) text += `Dopo la tua mossa l'avversario può rispondere con la cattura ${played.possibleCapture}; è una possibilità legale, non necessariamente una vittoria forzata.`;
  return text.trim();
}
async function explain(body, ip, { env = process.env, request = fetch, store } = {}) {
  const facts = context(body), basic = { comment: fallback(facts), source: 'engine' };
  if (!env.OPENAI_API_KEY) return basic;
  try {
    const limiter = store || createRedis(env, request);
    const key = createHash('sha256').update(String(ip)).digest('hex');
    // Fail closed for billable calls if durable rate limiting is unavailable.
    if (!await limiter.limit('coach-global', 100) || !await limiter.limit('coach:' + key, 8)) return basic;
    const response = await request('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ model: env.COACH_MODEL || 'gpt-4.1-mini', max_completion_tokens: 350,
        messages: [
          { role: 'system', content: "Sei boi battler, un commentatore scacchistico italiano. Spiega in massimo 4 frasi la mossa giocata e l'alternativa indicata, usando SOLO i fatti JSON forniti. Variante 10x10 con estremo: non applicare la teoria standard 8x8. I punteggi provengono da ricerca breve, non da analisi definitiva. Una cattura possibile NON dimostra una perdita forzata. Non inventare piani, combinazioni, case, pezzi o varianti. Se non è dimostrato perché una mossa sia peggiore, ammettilo. Non cambiare valutazioni o proporre mosse diverse. Nessun markdown." },
          { role: 'user', content: JSON.stringify(facts) },
        ],
      }),
    });
    if (!response.ok) return basic;
    const data = await response.json(), comment = data.choices?.[0]?.message?.content;
    if (typeof comment !== 'string' || !comment.trim() || comment.length > 1600) return basic;
    return { comment: comment.trim(), source: 'ai' };
  } catch { return basic; }
}
module.exports = { context, fallback, explain };
