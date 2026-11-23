const { createHash } = require('node:crypto');
const rules = require('./coach-rules.cjs');
const { createRedis } = require('./redis.cjs');
const fail = () => { throw Object.assign(Error('Dati della mossa non validi.'), { status: 400 }); };
function context(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.moves) || !body.moves.length || body.moves.length > 600 || typeof body.french !== 'boolean' || !Number.isFinite(body.loss) || body.loss < 0 || body.loss > 2000000 || ![1, 2, 3, 4].includes(body.depth)) fail();
  const valid = move => move && Number.isInteger(move.from) && move.from >= 0 && move.from < 100 && Number.isInteger(move.to) && move.to >= 0 && move.to < 100 && (move.promo == null || Number.isInteger(move.promo) && move.promo >= 0 && move.promo <= 7);
  if (!body.moves.every(valid) || !valid(body.alternative)) fail();
  const { rr, Ge } = rules(body.french), pos = new rr();
  const find = code => pos.legalMoves().find(move => move.from === code.from && move.to === code.to && (move.promo || 0) === (code.promo || 0));
  for (const code of body.moves.slice(0, -1)) { const move = find(code); if (!move) fail(); pos.make(move); }
  const chosen = find(body.moves.at(-1)), alternative = find(body.alternative);
  if (!chosen || !alternative) fail();
  const names = body.french ? ['', 'pion', 'cavalier', 'fou', 'tour', 'dame', 'roi', 'extrême'] : ['', 'pedone', 'cavallo', 'alfiere', 'torre', 'donna', 're', "estremo"];
  const continuation = (line, initial) => {
    if (line == null) return [];
    if (!Array.isArray(line) || !line.length || line.length > body.depth || !line.every(valid) || line[0].from !== initial.from || line[0].to !== initial.to || (line[0].promo || 0) !== (initial.promo || 0)) fail();
    const facts = []; let count = 0;
    try {
      for (const code of line) {
        const move = find(code); if (!move) fail();
        facts.push({ notation: Ge(move.from) + '–' + Ge(move.to), piece: names[Math.abs(move.piece)], capture: move.captured ? names[Math.abs(move.captured)] : null });
        pos.make(move); count++;
      }
    } finally { while (count-- > 0) pos.unmake(); }
    return facts;
  };
  const playedLine = continuation(body.playedLine, chosen), alternativeLine = continuation(body.alternativeLine, alternative);
  const describe = move => {
    const notation = Ge(move.from) + '–' + Ge(move.to) + (move.promo ? '=' + names[move.promo] : '');
    pos.make(move);
    const replies = pos.legalMoves(), check = pos.inCheck();
    const facts = {
      notation, piece: names[Math.abs(move.piece)], capture: move.captured ? names[Math.abs(move.captured)] : null,
      castle: move.flag === 3 || move.flag === 4, check, mate: check && replies.length === 0,
    };
    pos.unmake(); return facts;
  };
  return { french: body.french, playedLine, alternativeLine, played: describe(chosen), alternative: describe(alternative), same: chosen.from === alternative.from && chosen.to === alternative.to && chosen.promo === alternative.promo, loss: body.loss, depth: body.depth };
}
function fallback(facts) {
  if (facts.french) {
    const p = facts.played, a = facts.alternative;
    let text = `Vous avez joué ${p.notation} avec la pièce ${p.piece}. `;
    if (p.mate) text += 'Vous avez donné échec et mat. ';
    else if (p.check) text += 'Vous avez donné échec. ';
    if (p.capture) text += `Pièce capturée : ${p.capture}. `;
    text += facts.same ? 'C’est aussi le meilleur coup trouvé par le moteur. ' : `Le moteur préférait ${a.notation}${a.capture ? `, avec capture de la pièce ${a.capture}` : ''}${a.mate ? ', qui donne mat' : ''}. Écart estimé : ${(facts.loss / 100).toFixed(2)} pions (recherche courte). `;
    if (facts.playedLine.length > 1) {
      const reply = facts.playedLine[1];
      text += `La réponse prévue est ${reply.notation}, pièce ${reply.piece}${reply.capture ? `, avec capture de la pièce ${reply.capture}` : ''}. Variante calculée : ${facts.playedLine.map(s => s.notation).join(' → ')}. `;
    } else if (!p.mate) text += 'La recherche ne fournit pas de continuation suffisante pour attribuer un plan. ';
    if (!facts.same && facts.alternativeLine.length > 1) text += `Variante alternative : ${facts.alternativeLine.map(s => s.notation).join(' → ')}. `;
    return text + 'C’est une prévision de la recherche, pas une séquence garantie.';
  }
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
  if (facts.playedLine.length > 1) {
    const reply = facts.playedLine[1];
    text += `La risposta prevista dalla ricerca è ${reply.notation} con il ${reply.piece}${reply.capture ? `, catturando un ${reply.capture}` : ''}. `;
    text += `Variante calcolata: ${facts.playedLine.map(step => step.notation).join(' → ')}. `;
  } else if (!played.mate) text += 'La ricerca non fornisce una continuazione sufficiente per attribuire un piano. ';
  if (!facts.same && facts.alternativeLine.length > 1) text += `Variante alternativa: ${facts.alternativeLine.map(step => step.notation).join(' → ')}. `;
  text += 'È una previsione della ricerca, non una sequenza garantita.';
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
          { role: 'system', content: (body.french ? 'Réponds exclusivement en français, jamais en italien. ' : '') + "Sei boi battler, un commentatore scacchistico italiano. Spiega in massimo 4 frasi la mossa giocata e l'alternativa indicata, usando SOLO i fatti JSON forniti. Variante 10x10 con estremo: non applicare la teoria standard 8x8. I punteggi provengono da ricerca breve, non da analisi definitiva. Usa SOLO playedLine e alternativeLine per descrivere continuazioni. La prima risposta prevista è playedLine[1], mai una cattura selezionata da altre mosse legali. Queste linee sono previsioni della ricerca, non intenzioni certe né sequenze forzate. Non inventare piani, combinazioni, case, pezzi o varianti. Se non è dimostrato perché una mossa sia peggiore, ammettilo. Non cambiare valutazioni o proporre mosse diverse. Nessun markdown." },
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
