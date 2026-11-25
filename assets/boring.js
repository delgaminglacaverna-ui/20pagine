import { Chess } from './vendor/chess.js';
import { StockfishClient } from './stockfish-client.js';
const $ = id => document.getElementById(id);
const engine = new StockfishClient();
const game = new Chess();
const glyph = { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
const names = { k:'re', q:'donna', r:'torre', b:'alfiere', n:'cavallo', p:'pedone' };
const promo = { n:3, b:4, r:2, q:5 };
const fromIndex = i => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
const index = s => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
const encode = m => `${index(m.from)},${index(m.to)},${promo[m.promotion] || 0}`;
const decode = code => { const [a,b,c] = code.split(',').map(Number); return { from:fromIndex(a), to:fromIndex(b), promotion:Object.keys(promo).find(p => promo[p] === c) }; };
let selected = null, flipped = false, busy = false, generation = 0, online = null, polling = false, openings = {}, reviews = new Map();
fetch('/assets/classical-openings.json').then(r => r.json()).then(data => { openings = data; render(); }).catch(() => {});
function notice(text = '') { $('notice').textContent = text; }
function tokens() { try { return JSON.parse(localStorage.getItem('scacchiEstremi.partite') || '{}'); } catch { return {}; } }
function saveToken(id, token) { try { localStorage.setItem('scacchiEstremi.partite', JSON.stringify({ ...tokens(), [id]: token })); } catch {} }
async function api(path, body, token) {
  const response = await fetch('/api/matches' + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type':'application/json', ...(token ? { Authorization:'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), cache:'no-store' });
  const data = await response.json();
  if (!response.ok) { if (data.state) sync(data.state); throw Error(data.error || 'Richiesta non riuscita.'); }
  return data;
}
function canPlay() { return !busy && !game.isGameOver() && ($('mode').value === 'pvp' || ($('mode').value === 'pvc' && game.turn() === 'w') || ($('mode').value === 'online' && online?.status === 'active' && online.color === (game.turn() === 'w' ? 1 : -1))); }
function own(move) { return $('mode').value !== 'online' || online?.color === (move.color === 'w' ? 1 : -1); }
function render() {
  $('lobby').hidden = $('mode').value !== 'online';
  $('mode').disabled = busy; $('new').disabled = busy;
  $('undo').disabled = busy || $('mode').value === 'online' || !game.history().length;
  $('create').disabled = busy; $('join').querySelector('button').disabled = busy;
  const board = $('board'); board.replaceChildren();
  const targets = selected ? game.moves({ square:selected, verbose:true }).map(m => m.to) : [];
  const history = game.history({ verbose:true }), last = history.at(-1);
  for (let i = 0; i < 64; i++) {
    const cell = flipped ? 63 - i : i, square = fromIndex(cell), piece = game.get(square);
    const button = document.createElement('button'); button.type = 'button';
    button.className = ((Math.floor(cell/8) + cell%8)%2 ? 'dark' : 'light') + (piece ? (piece.color === 'w' ? ' white-piece' : ' black-piece') : '') + (selected === square ? ' selected' : '') + (targets.includes(square) ? ' target' : '') + ([last?.from,last?.to].includes(square) ? ' last' : '');
    button.setAttribute('aria-label', square + (piece ? ` ${names[piece.type]} ${piece.color === 'w' ? 'bianco' : 'nero'}` : ' vuota'));
    button.textContent = piece ? glyph[piece.type] : '';
    if (i >= 56 || i % 8 === 0) { const label = document.createElement('small'); label.textContent = square; button.append(label); }
    button.onclick = () => click(square); board.append(button);
  }
  let status = game.isCheckmate() ? `Scacco matto. Vince il ${game.turn() === 'w' ? 'Nero' : 'Bianco'}.` : game.isDraw() ? 'Patta.' : `Muove il ${game.turn() === 'w' ? 'Bianco' : 'Nero'}${game.isCheck() ? ' · Scacco' : ''}`;
  if ($('mode').value === 'online') status = !online ? 'Crea una partita o inserisci un codice.' : online.status === 'waiting' ? 'In attesa dell’avversario.' : online.status === 'over' ? `Partita terminata: ${online.winner === 'draw' ? 'patta' : online.winner === 'white' ? 'vince il Bianco' : online.winner === 'black' ? 'vince il Nero' : 'annullata'}.` : status;
  $('status').textContent = status + (busy ? ' · Operazione in corso…' : '');
  const moves = $('moves'); moves.replaceChildren();
  for (let i=0;i<history.length;i+=2) { const li = document.createElement('li'); li.textContent = history.slice(i,i+2).map((m,j) => m.san + (reviews.get(i+j+1)?.symbol && own(m) ? ` ${reviews.get(i+j+1).symbol}` : '')).join('  '); moves.append(li); }
  let review = null;
  for (let i=history.length;i>0;i--) if (own(history[i-1]) && reviews.has(i)) { review = reviews.get(i); break; }
  $('review').textContent = review ? review.pending ? 'Analisi della mossa…' : review.error || `${review.symbol} · ${review.label}: ${review.comment} · ${window.MoveCoach.evaluation(review.whiteScore)} (+ Bianco / − Nero; profondità ${review.depth})` : 'Gioca una mossa per ricevere una valutazione.';
  const line = history.map(m => m.san).join(' '); let opening = 'Posizione iniziale', length = 0;
  for (const [sequence,name] of Object.entries(openings)) if ((line === sequence || line.startsWith(sequence+' ')) && sequence.length > length) { opening = name; length = sequence.length; }
  $('opening').textContent = opening;
  $('match').textContent = online ? `Codice ${online.id} · Scacchi 8×8 · Sei il ${online.color === 1 ? 'Bianco' : 'Nero'}` : '';
  $('copy').hidden = !online; $('resign').hidden = !online || online.status === 'over';
}
async function reviewMove(move, ply, version) {
  if (!own(move) || reviews.has(ply)) return;
  reviews.set(ply,{ pending:true }); render();
  try {
    const before = await engine.search(move.before);
    let after;
    const position = new Chess(move.after);
    if (position.isCheckmate()) after = { score:-1000000, depth:before.depth };
    else if (position.isDraw()) after = { score:0, depth:before.depth };
    else after = await engine.search(move.after);
    if (generation !== version) return;
    if (!Number.isFinite(before.score) || !Number.isFinite(after.score)) throw Error('Valutazione Stockfish non disponibile.');
    const playedUci = move.from+move.to+(move.promotion || '');
    const result = window.MoveCoach.classify({ best:before.score, played:-after.score, second:before.score, bestMove:before.bestmove === playedUci, depth:Math.min(before.depth,after.depth) });
    reviews.set(ply,{ ...result, whiteScore: -after.score * (move.color === 'w' ? 1 : -1), depth:Math.min(before.depth,after.depth) });
  } catch(error) { if (generation === version) reviews.set(ply,{ error:error.message }); }
  if (generation === version) render();
}
async function click(square) {
  if (!canPlay()) return;
  const piece = game.get(square);
  if (piece?.color === game.turn()) { selected = square; render(); return; }
  if (!selected) return;
  const legal = game.moves({ square:selected, verbose:true }).filter(m => m.to === square);
  if (!legal.length) { selected = null; render(); return; }
  let promotion;
  if (legal.some(m => m.promotion)) {
    promotion = prompt('Promozione: q donna, r torre, b alfiere, n cavallo', 'q')?.toLowerCase();
    if (!['q','r','b','n'].includes(promotion)) return;
  }
  const move = game.move({ from:selected, to:square, promotion }); selected = null;
  const version = generation, ply = game.history().length;
  notice();
  if ($('mode').value === 'online') {
    busy = true; render();
    try { const state = await api(`/${online.id}/move`, { ply:ply-1, move:encode(move) }, online.token); sync(state); await reviewMove(move,ply,version); }
    catch(error) { notice(error.message); try { sync(await api('/'+online.id,undefined,online.token)); } catch {} }
    finally { busy = false; render(); }
    return;
  }
  busy = true; render(); await reviewMove(move,ply,version);
  if (generation !== version) return;
  if ($('mode').value === 'pvc' && !game.isGameOver() && game.turn() === 'b') {
    try {
      const result = await engine.search(game.fen()); if (generation !== version) return;
      const uci = result.bestmove;
      const reply = game.move({ from:uci.slice(0,2), to:uci.slice(2,4), promotion:uci[4] });
      await reviewMove(reply,ply+1,version);
    } catch(error) { notice(error.message); }
  }
  if (generation === version) { busy = false; render(); }
}
function reset() { generation++; game.reset(); reviews.clear(); selected = null; busy = false; online = null; notice(); history.replaceState(null,'','/boring'); render(); }
function route(mode,id) { return (mode === 'risio' ? '/risio?' : mode === 'boring' ? '/boring?' : '/?' + (mode === 'french' ? 'version=french&' : '')) + 'partita=' + encodeURIComponent(id); }
function sync(state) {
  if (state.mode && state.mode !== 'boring') { location.assign(route(state.mode,state.id)); return; }
  const local = game.history({verbose:true}).map(encode), codes = state.moves || [];
  if (local.length !== codes.length || local.some((code,i) => code !== codes[i])) {
    game.reset();
    for (const code of codes) game.move(decode(code));
    for (const ply of reviews.keys()) if (ply > codes.length) reviews.delete(ply);
  }
  online = { ...online, ...state, token:state.token || online?.token || tokens()[state.id] };
  render();
}
function enter(state) {
  generation++; game.reset(); reviews.clear(); online = state; selected = null;
  if (state.token) saveToken(state.id,state.token);
  $('mode').value = 'online'; flipped = state.color === -1;
  history.replaceState(null,'',route('boring',state.id)); sync(state);
  const moves = game.history({verbose:true});
  for (let i=moves.length-1;i>=0;i--) if (own(moves[i])) { reviewMove(moves[i],i+1,generation); break; }
}
async function join(code) {
  code = code.trim().toUpperCase(); if (!/^[A-Z0-9]{8}$/.test(code)) { notice('Codice non valido.'); return; }
  try {
    const state = await api('/'+code,undefined,tokens()[code]);
    if (state.mode !== 'boring') { location.assign(route(state.mode,code)); return; }
    enter(await api('/'+code+'/join',{ variant:'boring' },tokens()[code]));
  } catch(error) { notice(error.message); }
}
$('mode').onchange = reset;
$('new').onclick = () => { if (!online || confirm('Lasciare questa scacchiera? La partita online resta aperta.')) reset(); };
$('flip').onclick = () => { flipped = !flipped; render(); };
$('undo').onclick = () => { if (busy || $('mode').value === 'online') return; game.undo(); if ($('mode').value === 'pvc' && game.turn() === 'b') game.undo(); for (const ply of reviews.keys()) if (ply > game.history().length) reviews.delete(ply); selected=null; render(); };
$('create').onclick = async () => { try { enter(await api('',{ variant:'boring' })); } catch(error) { notice(error.message); } };
$('join').onsubmit = event => { event.preventDefault(); join($('code').value); };
$('copy').onclick = () => navigator.clipboard.writeText(location.origin+route('boring',online.id)).then(() => notice('Invito copiato.')).catch(() => notice(location.origin+route('boring',online.id)));
$('resign').onclick = async () => { if (online && confirm('Abbandonare la partita?')) try { sync(await api('/'+online.id+'/resign',{},online.token)); } catch(error) { notice(error.message); } };
setInterval(async () => {
  if (!online || online.status === 'over' || polling || busy) return;
  const id = online.id, version = generation; polling = true;
  try { const state = await api('/'+id,undefined,online.token); if (generation === version && online?.id === id) sync(state); }
  catch(error) { if (generation === version) notice(error.message); } finally { polling = false; }
},1500);
render();
const code = new URLSearchParams(location.search).get('partita'); if (code) join(code);
