(function (root) {
  'use strict';
  const descriptions = {
    '!!': ['Brillante', 'Un sacrificio di materiale che la ricerca considera solido e nettamente preferibile alle alternative.'],
    '!': ['Ottima', 'Hai trovato una delle continuazioni migliori.'],
    '=': ['Buona', 'La posizione resta vicina alla migliore continuazione trovata.'],
    '?!': ['Imprecisione', 'Questa scelta concede un piccolo vantaggio rispetto alla migliore alternativa.'],
    '?': ['Errore', 'Questa mossa perde un vantaggio significativo. Cerca di proteggere i pezzi e controllare le minacce.'],
    '??': ['Grave errore', 'La ricerca vede una perdita importante rispetto alla migliore continuazione.'],
  };
  function classify({ best, played, second, sacrifice = false, bestMove = false }) {
    const loss = Math.max(0, best - played);
    const symbol = loss >= 250 ? '??' : loss >= 120 ? '?' : loss >= 50 ? '?!'
      : sacrifice && bestMove && loss <= 15 && best - second >= 80 && played >= -50 ? '!!'
      : loss <= 15 ? '!' : '=';
    return { symbol, label: descriptions[symbol][0], comment: descriptions[symbol][1], loss: Math.round(loss) };
  }
  function risio(mode, piece) {
    const symbol = mode === 'cvc' ? '67' : mode === 'pvp' ? '??' : piece > 0 ? '??' : '!!';
    return { symbol, label: symbol, comment: 'bip bup', parody: true };
  }
  function analyze(moves, french, callback) {
    if (typeof root.Worker !== 'function') { callback({ unavailable: true }); return () => {}; }
    let worker, timer, done = false;
    const finish = result => {
      if (done) return; done = true;
      root.clearTimeout(timer); worker?.terminate(); callback(result);
    };
    try {
      worker = new root.Worker('/assets/coach-worker.js');
      worker.onmessage = event => finish(event.data.error ? { unavailable: true } : { ...classify(event.data), depth: event.data.depth, whiteScore: event.data.whiteScore });
      worker.onerror = () => finish({ unavailable: true });
      timer = root.setTimeout(() => finish({ unavailable: true }), 2500);
      worker.postMessage({ moves, french });
    } catch { finish({ unavailable: true }); }
    return () => { done = true; root.clearTimeout(timer); worker?.terminate(); };
  }
  function evaluation(score) {
    if (!Number.isFinite(score)) return '—';
    if (Math.abs(score) > 999000) return score > 0 ? 'Matto per il Bianco' : 'Matto per il Nero';
    const value = score / 100;
    return (value > 0 ? '+' : '') + value.toFixed(2);
  }
  root.MoveCoach = { classify, risio, analyze, evaluation };
})(typeof globalThis !== 'undefined' ? globalThis : window);
