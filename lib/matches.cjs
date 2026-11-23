const { randomBytes, createHash } = require('node:crypto');
const Chess = require('./chess.cjs');
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message, state) => { throw Object.assign(Error(message), { status, state }); };
function colorOf(match, token) {
  if (!token || typeof token !== 'string' || token.length > 128) return 0;
  const digest = hash(token);
  return digest === match.white ? 1 : digest === match.black ? -1 : 0;
}
const variantsOf = match => match.variants || { white: 'normal', black: 'normal' };
const sidesOf = variants => [variants.white === 'french' ? 1 : 0, variants.black === 'french' ? -1 : 0].filter(Boolean);
function selectedVariant(body) {
  const value = body.variant || 'normal';
  if (!['normal', 'french', 'risio'].includes(value)) fail(400, 'Versione non valida.');
  return value;
}
function view(match, token) {
  const { id, version, status, moves, winner, reason } = match;
  return { id, version, status, moves, winner, reason, variants: variantsOf(match), frenchSides: sidesOf(variantsOf(match)), color: colorOf(match, token) };
}
function replay(moves, variants = {}) {
  const pos = new Chess();
  pos.frenchSides = sidesOf(variants);
  const keys = [pos.key()];
  for (const code of moves) {
    const move = findMove(pos, code);
    if (!move) throw Error('Invalid stored match');
    pos.make(move); keys.push(pos.key());
  }
  return { pos, keys };
}
function findMove(pos, code) {
  if (typeof code !== 'string' || !/^\d{1,2},\d{1,2},[0-7]$/.test(code)) return null;
  const [from, to, promo] = code.split(',').map(Number);
  return pos.legalMoves().find(m => m.from === from && m.to === to && (m.promo || 0) === promo);
}
function finish(match, pos, keys) {
  let reason;
  if (!pos.legalMoves().length) reason = pos.inCheck() ? 'mate' : 'stalemate';
  else if (pos.insufficientMaterial()) reason = 'insufficient';
  else if (keys.filter(key => key === pos.key()).length >= 3) reason = 'repetition';
  else if (pos.half >= 100) reason = 'fifty';
  if (reason) {
    match.status = 'over'; match.reason = reason;
    match.winner = reason === 'mate' ? (pos.turn === 1 ? 'black' : 'white') : 'draw';
  }
}
function createService(store) {
  return async ({ method, id, action, token, body = {}, ip = 'unknown' }) => {
    const create = !id && !action;
    if ((create && method !== 'POST') || (!create && method !== (action ? 'POST' : 'GET'))) fail(405, 'Metodo non consentito.');
    if (action && !['join', 'move', 'resign'].includes(action)) fail(404, 'Endpoint non trovato.');
    if (!create && !/^[A-Z0-9]{8}$/.test(id || '')) fail(400, 'Codice partita non valido.');
    const category = create ? 'create' : action === 'join' ? 'join' : action ? 'write' : 'read';
    const maxima = { create: 10, join: 30, write: 120, read: 300 };
    if (!await store.limit(`${category}:${hash(ip)}`, maxima[category])) fail(429, 'Troppe richieste. Riprova tra un minuto.');
    if (create) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const id = randomBytes(5).toString('hex').slice(0, 8).toUpperCase();
        const token = randomBytes(32).toString('hex');
        const match = { id, variants: { white: selectedVariant(body), black: null }, version: 0, status: 'waiting', moves: [], white: hash(token), black: null, winner: null, reason: null };
        if (await store.create(id, JSON.stringify(match))) return { ...view(match, token), token };
      }
      fail(503, 'Impossibile creare la partita. Riprova.');
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const raw = await store.get(id);
      if (!raw) fail(404, 'Partita non trovata o scaduta (24 ore senza aggiornamenti).');
      const match = JSON.parse(raw), color = colorOf(match, token);
      if (!action) return view(match, token);
      if (action === 'join') {
        if (color) return { ...view(match, token), token };
        if (match.status !== 'waiting' || match.black) fail(409, 'La lobby è piena o terminata.');
        const newToken = randomBytes(32).toString('hex');
        match.variants = { ...variantsOf(match), black: selectedVariant(body) };
        match.black = hash(newToken); match.status = 'active'; match.version++;
        if (await store.cas(id, raw, JSON.stringify(match))) return { ...view(match, newToken), token: newToken };
        continue;
      }
      if (!color) fail(401, 'Token giocatore non valido. Rientra nella partita dallo stesso browser.');
      const state = () => view(match, token);
      if (action === 'resign') {
        if (match.status === 'over') return state();
        match.reason = match.status === 'waiting' ? 'cancel' : 'resign';
        match.winner = match.status === 'waiting' ? null : color === 1 ? 'black' : 'white';
        match.status = 'over';
      } else {
        // A retry after a lost response must not append the move twice.
        if (Number.isInteger(body.ply) && body.ply === match.moves.length - 1 && match.moves[body.ply] === body.move && color === (body.ply % 2 ? -1 : 1)) return state();
        if (match.status !== 'active') fail(409, 'La partita non è in corso.', state());
        if (!Number.isInteger(body.ply) || body.ply !== match.moves.length) fail(409, 'Partita aggiornata: risincronizzazione necessaria.', state());
        if (color !== (match.moves.length % 2 ? -1 : 1)) fail(409, 'Non è il tuo turno.', state());
        const { pos, keys } = replay(match.moves, variantsOf(match)), move = findMove(pos, body.move);
        if (!move) fail(400, 'Mossa non valida.', state());
        pos.make(move); match.moves.push(`${move.from},${move.to},${move.promo || 0}`); keys.push(pos.key());
        finish(match, pos, keys); // Never trust a client-supplied end/result.
      }
      match.version++;
      if (await store.cas(id, raw, JSON.stringify(match))) return view(match, token);
    }
    fail(409, 'Partita modificata contemporaneamente. Riprova.');
  };
}
module.exports = { createService, replay, finish };
