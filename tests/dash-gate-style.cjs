const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
test('GD heading and control styles do not leak into the homework clock screen', () => {
  const gateCss = fs.readFileSync('assets/entry-gate.css','utf8');
  const dashCss = fs.readFileSync('assets/dash-theme.css','utf8');
  const dom = new JSDOM(`<html class="dash-theme"><head><style>${gateCss}</style><style>${dashCss}</style></head><body><div id="root"><div class="entry-gate"><section class="entry-card"><h1 id="question">Somma gli orologi</h1><button id="answer">XII</button></section></div></div><div class="dash-game"><h1 id="game-title">Chessometry Dash</h1></div></body></html>`);
  try {
    const w = dom.window;
    assert(!w.getComputedStyle(w.document.getElementById('question')).fontFamily.includes('Impact'));
    assert(w.getComputedStyle(w.document.getElementById('game-title')).fontFamily.includes('Impact'));
    assert.equal(w.getComputedStyle(w.document.getElementById('answer')).borderTopColor,'rgb(100, 116, 139)');
    assert(!dashCss.includes('.dash-theme h1'));
    assert(!dashCss.includes('#root > div'));
    assert(fs.readFileSync('index.html','utf8').includes('(DASH_MODE ? " dash-game" : "")'));
  } finally { dom.window.close(); }
});
