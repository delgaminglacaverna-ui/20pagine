const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { Chess } = require('chess.js');
const StandardChess = require('../lib/standard-chess.cjs');
test('standard adapter has 20 initial moves, 400 replies and correct promotion/castling', () => {
  const p = new StandardChess(); assert.equal(p.legalMoves().length,20);
  let count = 0;
  for (const m of p.legalMoves()) { const q = new StandardChess(); q.make(m); count += q.legalMoves().length; }
  assert.equal(count,400);
  p.chess.load('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  assert.deepEqual(p.legalMoves().filter(m => m.from === 8).map(m => m.promo).sort(),[2,3,4,5]);
  p.make(p.legalMoves().find(m => m.promo === 5)); assert.equal(p.chess.get('a8').type,'q');
  p.chess.load('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert(p.legalMoves().some(m => m.uci === 'e1g1')); p.make(p.legalMoves().find(m => m.uci === 'e1g1'));
  assert.equal(p.chess.get('f1').type,'r'); assert.equal(p.turn,-1);
});
test('boring browser renders 64 squares, legal moves, real openings and private reviews', async () => {
  const dom = new JSDOM(fs.readFileSync('boring.html','utf8'),{ url:'https://example.org/boring', runScripts:'outside-only' });
  const w = dom.window, calls = [];
  w.Chess = Chess;
  w.StockfishClient = class { async search(fen) { calls.push(fen); return { score:0,depth:8,bestmove:'e2e4' }; } };
  w.fetch = async () => ({ json:async () => JSON.parse(fs.readFileSync('assets/classical-openings.json','utf8')) });
  w.MoveCoach = { evaluation:() => '0.00', classify:() => ({ symbol:'V',label:'Decente',comment:'Test' }) };
  const source = fs.readFileSync('assets/boring.js','utf8').replace(/^import .*;\n/gm,'');
  try {
    w.eval(source + '\nwindow.harness = { game, enter, reviewMove, version: () => generation };');
    const tick = () => new Promise(resolve => setImmediate(resolve));
    await tick();
    assert.equal(w.document.querySelectorAll('#board button').length,64);
    const mode = w.document.getElementById('mode'); mode.value = 'pvp'; mode.onchange();
    w.document.querySelector('[aria-label="e2 pedone bianco"]').click();
    assert.equal(w.document.querySelectorAll('.target').length,2);
    w.document.querySelector('[aria-label="e4 vuota"]').click(); await tick();
    assert.equal(w.harness.game.history()[0],'e4'); assert.equal(calls.length,2);
    assert.match(w.document.getElementById('review').textContent,/Decente/);
    assert.equal(w.document.getElementById('opening').textContent,'Apertura di re');
    mode.value = 'online'; mode.onchange();
    w.harness.enter({ id:'30000001',mode:'boring',color:-1,token:'abc',status:'active',moves:['52,36,0'],version:1 });
    await tick(); assert.equal(calls.length,2,'Black must not review White move');
    const enemy = new Chess().move('d4');
    await w.harness.reviewMove(enemy,1,w.harness.version()); assert.equal(calls.length,2);
    const position = new Chess(); position.move('e4'); const black = position.move('e5'); w.harness.game.move('e5');
    await w.harness.reviewMove(black,2,w.harness.version()); assert.equal(calls.length,4);
    assert.match(w.document.getElementById('review').textContent,/Decente/);

  } finally { dom.window.close(); }
});
test('boring route is isolated and ships only the small single-thread Stockfish build', () => {
  const page = fs.readFileSync('boring.html','utf8');
  for (const forbidden of ['entry-gate','enfosi','game-archive','site-ads','Ripassa','boi battler','Estremo']) assert(!page.includes(forbidden));
  const config = JSON.parse(fs.readFileSync('vercel.json','utf8'));
  assert(config.rewrites.some(r => r.source === '/boring' && r.destination === '/boring.html'));
  assert(!fs.readFileSync('index.html','utf8').includes('href: "/boring"'));
  const build = fs.readFileSync('scripts/build.cjs','utf8'); assert(build.includes('stockfish-18-lite-single'));
});
test('bundled real Stockfish WASM runs UCI and finds a legal move', { timeout:20000 }, async () => {
  const { spawn } = require('node:child_process');
  const child = spawn(process.execPath,['node_modules/stockfish/bin/stockfish-18-lite-single.js'],{ stdio:['pipe','pipe','pipe'] });
  try {
    const text = await new Promise((resolve,reject) => {
      let text = '', sent = false;
      child.on('error',reject);
      child.stdout.on('data',chunk => {
        text += chunk;
        if (!sent && text.includes('readyok')) { sent = true; child.stdin.write('position startpos\ngo depth 4\n'); }
        if (/bestmove [a-h][1-8][a-h][1-8]/.test(text)) resolve(text);
      });
      child.on('exit',() => reject(Error('Stockfish exited before producing a move: '+text)));
      child.stdin.write('uci\nisready\n');
    });
    assert.match(text,/Stockfish 18/); assert.match(text,/score cp/);
    const uci = text.match(/bestmove (\S+)/)[1];
    assert.doesNotThrow(() => new Chess().move({ from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4] }));
  } finally { child.kill(); }
});
