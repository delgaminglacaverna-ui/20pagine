(function (root) {
  'use strict';
  const descriptions = {
    '!!': ['Brillante', 'Un sacrificio di materiale che la ricerca considera solido e nettamente preferibile alle alternative.'],
    '!': ['Eccezionale', 'Una scelta decisiva: la ricerca la trova nettamente superiore a tutte le alternative.'],
    '👑': ['Migliore', 'La migliore mossa trovata dalla ricerca, o una mossa a pari merito.'],
    '✓✓': ['Buona', 'Una buona continuazione, molto vicina alla migliore trovata.'],
    'V': ['Decente', 'Una continuazione giocabile, anche se si poteva ottenere qualcosa in più.'],
    '?!': ['Imprecisione', 'Una piccola occasione persa: la posizione peggiora senza una perdita grave secondo la ricerca.'],
    'X': ['Errore / occasione mancata', 'Hai mancato una continuazione sensibilmente migliore. Controlla minacce e pezzi indifesi.'],
    '??': ['Grave errore', 'La ricerca vede una perdita molto grave, equivalente ad almeno un pezzo minore o a una conseguenza decisiva.'],
  };
  function classify({ best, played, second, sacrifice = false, bestMove = false, depth = 0 }) {
    const loss = Math.max(0, best - played), gap = best - second;
    const exceptional = bestMove && loss === 0 && depth >= 2 && played >= -50;
    const symbol = loss >= 300 ? '??' : loss >= 150 ? 'X' : loss >= 80 ? '?!'
      : exceptional && sacrifice && gap >= 80 ? '!!'
      : exceptional && gap >= 150 ? '!'
      : bestMove && loss === 0 ? '👑'
      : loss <= 25 ? '✓✓' : 'V';
    return { symbol, label: descriptions[symbol][0], comment: descriptions[symbol][1], loss: Math.round(loss) };
  }
  function risio(mode, piece) {
    const symbol = mode === 'cvc' ? '67' : mode === 'pvp' ? '??' : piece > 0 ? '??' : '!!';
    return { symbol, label: symbol, comment: 'bip bup', parody: true };
  }
  function analyze(moves, french, callback, targetDepth = 3, frenchSides = null) {
    targetDepth = targetDepth === 4 ? 4 : 3;
    if (typeof root.Worker !== 'function') { callback({ unavailable: true }); return () => {}; }
    let worker, timer, done = false;
    const finish = result => {
      result = root.CoachI18n?.review(result, french) || result;
      if (done) return; done = true;
      root.clearTimeout(timer); worker?.terminate(); callback(result);
    };
    try {
      worker = new root.Worker('/assets/coach-worker.js');
      worker.onmessage = event => finish(event.data.error ? { unavailable: true } : { ...classify(event.data), depth: event.data.depth, whiteScore: event.data.whiteScore, alternative: event.data.alternative, playedLine: event.data.playedLine, alternativeLine: event.data.alternativeLine, targetDepth });
      worker.onerror = () => finish({ unavailable: true });
      timer = root.setTimeout(() => finish({ unavailable: true }), 6500);
      worker.postMessage({ moves, french, frenchSides, targetDepth: targetDepth === 4 ? 4 : 3 });
    } catch { finish({ unavailable: true }); }
    return () => { done = true; root.clearTimeout(timer); worker?.terminate(); };
  }
  function explain(moves, french, review, callback) {
    if (typeof root.fetch !== 'function' || !review.alternative) { callback(null); return; }
    const controller = new AbortController();
    const timer = root.setTimeout(() => controller.abort(), 9000);
    root.fetch('/api/coach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ moves, french, alternative: review.alternative, loss: review.loss, depth: review.depth, playedLine: review.playedLine, alternativeLine: review.alternativeLine }),
    }).then(response => response.ok ? response.json() : null).then(data => {
      callback(data && typeof data.comment === 'string' && data.comment.length <= 1600 ? { comment: data.comment, language: french ? 'fr' : 'it', explanationSource: data.source === 'ai' ? 'ai' : 'engine' } : null);
    }).catch(() => callback(null)).finally(() => root.clearTimeout(timer));
  }
  function evaluation(score, french = false) {
    if (!Number.isFinite(score)) return '—';
    if (Math.abs(score) > 999000) return french ? (score > 0 ? 'Mat en faveur des Blancs' : 'Mat en faveur des Noirs') : (score > 0 ? 'Matto per il Bianco' : 'Matto per il Nero');
    const value = score / 100;
    return (value > 0 ? '+' : '') + value.toFixed(2);
  }
  root.MoveCoach = { classify, risio, analyze, explain, evaluation };
})(typeof globalThis !== 'undefined' ? globalThis : window);
