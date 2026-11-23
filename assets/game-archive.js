(function (root) {
  'use strict';
  const french = typeof root.URLSearchParams === 'function' && new root.URLSearchParams(root.location?.search || '').get('version') === 'french' && !/^\/risio\/?$/.test(root.location?.pathname || '');
  const t = value => root.CoachI18n?.text(value, french) ?? value;
  const KEY = '20pagine.games.v1', MAX = 50;
  let storageError = false, stopAnalysis = null, replay = null;
  const newId = () => root.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  const validMove = m => m && Number.isInteger(m.from) && m.from >= 0 && m.from < 100 && Number.isInteger(m.to) && m.to >= 0 && m.to < 100;
  function read() {
    try {
      const games = JSON.parse(root.localStorage.getItem(KEY) || '[]');
      return Array.isArray(games) ? games.filter(g => g && typeof g.id === 'string' && ['normal', 'french', 'risio'].includes(g.variant) && ['pvc', 'pvp', 'cvc', 'online'].includes(g.mode) && Array.isArray(g.moves) && g.moves.length <= 600 && g.moves.every(validMove)).slice(0, MAX) : [];
    } catch { storageError = true; return []; }
  }
  function write(games) {
    try { root.localStorage.setItem(KEY, JSON.stringify(games.slice(0, MAX))); storageError = false; return true; }
    catch { storageError = true; return false; }
  }
  function save(snapshot) {
    if (!snapshot.moves?.length || snapshot.moves.length > 600) return;
    const games = read(), old = games.find(g => g.id === snapshot.id);
    // Whitelist fields: never persist online tokens, passwords or user IPs.
    const game = { id: snapshot.id, createdAt: old?.createdAt || Date.now(), updatedAt: Date.now(), variant: snapshot.variant, mode: snapshot.mode,
      frenchSides: Array.isArray(snapshot.frenchSides) ? snapshot.frenchSides.filter(side => side === 1 || side === -1) : null,
      result: String(snapshot.result || 'none').slice(0, 30), turn: snapshot.turn,
      moves: snapshot.moves.map(m => ({ from: m.from, to: m.to, promo: m.promo, piece: m.piece })),
      notes: (snapshot.notes || []).map((n, i) => {
        const same = old?.moves?.[i]?.from === snapshot.moves[i]?.from && old?.moves?.[i]?.to === snapshot.moves[i]?.to && (old?.moves?.[i]?.promo || 0) === (snapshot.moves[i]?.promo || 0);
        const previous = same ? old?.notes?.[i]?.review : null;
        const fresh = n.review && !n.review.pending ? n.review : null;
        return { san: String(n.san || '').slice(0, 40), review: previous?.targetDepth === 4 && !previous.unavailable ? previous : fresh || previous || null };
      }),
    };
    write([game, ...games.filter(g => g.id !== game.id)]);
  }
  function remove(id) { write(read().filter(g => g.id !== id)); }
  const square = i => String.fromCharCode(97 + i % 10) + (10 - Math.floor(i / 10));
  const notation = m => square(m.from) + '–' + square(m.to);
  function open() {
    document.querySelector('.game-archive')?.remove();
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div'); overlay.className = 'game-archive';
    const panel = document.createElement('section'); panel.className = 'game-archive-panel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', t('Le tue partite')); panel.tabIndex = -1;
    overlay.appendChild(panel); document.body.appendChild(overlay);
    function el(tag, text, parent = panel) { const node = document.createElement(tag); if (text != null) node.textContent = t(text); parent.appendChild(node); return node; }
    function button(text, action, parent = panel) { const b = el('button', text, parent); b.type = 'button'; b.onclick = action; return b; }
    function cancel() { stopAnalysis?.(); stopAnalysis = null; }
    function close() { cancel(); replay?.unmount(); replay = null; document.removeEventListener('keydown', keys); overlay.remove(); previousFocus?.focus?.(); }
    function keys(event) {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const items = [...panel.querySelectorAll('button:not(:disabled)')];
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', keys);
    function header() { replay?.unmount(); replay = null; panel.replaceChildren(); el('h2', 'Le tue partite'); button('Chiudi', close); }
    function list() {
      cancel(); header();
      el('p', 'Salvate solo in questo browser, senza IP o account. Ultime 50 partite.');
      const games = read();
      if (storageError) el('p', 'Memoria locale non disponibile o piena: il salvataggio potrebbe non riuscire.');
      if (!games.length) el('p', 'Nessuna partita salvata. Inizia a giocare: le mosse vengono salvate automaticamente.');
      for (const game of games) {
        const row = el('article');
        const modes = { pvc: 'Giocatore vs IA', pvp: 'Giocatore vs giocatore', cvc: 'IA vs IA', online: 'Online' };
        const results = { none: 'In corso / interrotta', check: 'In corso · scacco', mate: game.turn === 1 ? 'Vince il Nero' : 'Vince il Bianco', stalemate: 'Patta · stallo', repetition: 'Patta · ripetizione', insufficient: 'Patta · materiale', fifty: 'Patta · 50 mosse', resign: 'Terminata per abbandono', onlineOver: 'Terminata online' };
        el('h3', new Date(game.createdAt).toLocaleString(french ? 'fr-FR' : undefined) + ' · ' + t(game.variant), row);
        el('p', `${t(modes[game.mode])} · ${t(results[game.result] || 'Terminata')} · ${game.moves.length} semimosse`, row);
        button('Apri e analizza', () => detail(game.id), row);
        button('Elimina', () => { remove(game.id); list(); }, row);
      }
    }
    function detail(id) {
      cancel(); header(); button('← Elenco', list);
      const game = read().find(g => g.id === id); if (!game) { list(); return; }
      el('p', 'Analisi locale fino a 4 semimosse, senza chiamate AI a pagamento. È una stima, non un verdetto.');
      const status = el('p', 'Puoi interrompere e riprendere l’analisi.'); status.setAttribute('role', 'status');
      const boardHost = el('div');
      replay = root.GameReplay?.mount(boardHost, game);
      const rows = el('ol');
      function renderRows(g) {
        rows.replaceChildren();
        g.moves.forEach((move, index) => {
          const note = g.notes?.[index], review = root.CoachI18n?.review(note?.review, french) || note?.review;
          const row = el('li', null, rows);
          button(`${index + 1}. ${note?.san || notation(move)} ${review?.symbol || ''}`, () => replay?.go(index + 1), row);
          if (review?.unavailable) el('p', 'Analisi non disponibile: puoi ritentare.', row);
          if (review?.comment) el('p', review.comment, row);
          if (Number.isFinite(review?.whiteScore)) el('p', `Evaluation: ${root.MoveCoach.evaluation(review.whiteScore, french)} · profondità ${review.depth}/${review.targetDepth || 4}`, row);
          if (review?.playedLine?.length) el('p', 'Variante prevista: ' + review.playedLine.map(notation).join(' → '), row);
        });
      }
      renderRows(game);
      let running = false, cancelWorker;
      const start = button('Analizza / riprendi', async () => {
        if (running) return; running = true; start.disabled = true;
        stopAnalysis = () => { running = false; cancelWorker?.(); start.disabled = false; status.textContent = t('Analisi interrotta. I risultati completati sono salvati.'); };
        for (let i = 0; i < game.moves.length && running; i++) {
          if (game.notes?.[i]?.review && !game.notes[i].review.unavailable && (game.notes[i].review.parody || game.notes[i].review.targetDepth === 4)) continue;
          status.textContent = t(`Analisi ${i + 1}/${game.moves.length}…`);
          replay?.go(i + 1);
          const result = game.variant === 'risio' ? root.MoveCoach.risio(game.mode, game.moves[i].piece) : await new Promise(resolve => {
            const stop = root.MoveCoach.analyze(game.moves.slice(0, i + 1), game.variant === 'french', resolve, 4, game.frenchSides);
            cancelWorker = () => { stop(); resolve(null); };
          });
          if (!running || !result) break;
          // Merge into the latest saved record: a live game may have advanced meanwhile.
          const games = read(), current = games.find(g => g.id === id); if (!current) break;
          if (JSON.stringify(current.moves.slice(0, i + 1)) !== JSON.stringify(game.moves.slice(0, i + 1))) break;
          current.notes ||= []; current.notes[i] ||= {};
          const theory = current.notes[i].review?.theory ? current.notes[i].review : null;
          current.notes[i].review = { ...result, targetDepth: 4, ...(theory ? { symbol: theory.symbol, label: theory.label, comment: theory.comment, theory: true } : {}) };
          game.notes = current.notes;
          write(games); replay?.update(current); renderRows(current);
        }
        if (running) { status.textContent = t('Analisi completata. Le mosse non analizzabili sono indicate come tali e possono essere ritentate.'); start.disabled = false; running = false; stopAnalysis = null; }
      });
      button('Interrompi analisi', cancel);
    }
    list(); panel.focus();
  }
  root.GameArchive = { newId, save, read, remove, open };
})(window);
