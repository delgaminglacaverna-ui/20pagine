const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const script = fs.readFileSync('assets/dash-theme.js','utf8');
function load(path) { const classes=[];const c=vm.createContext({location:{pathname:path},document:{documentElement:{classList:{add:v=>classes.push(v)}}}});vm.runInContext(script,c);return { c,classes }; }
test('Dash has the 22 classic levels in order with factual metadata and scoped presentation', () => {
  const {c,classes}=load('/dash');const levels=c.DashTheme.levels;
  assert.equal(levels.length,22);assert.equal(levels[0].name,'Stereo Madness');assert.equal(levels[21].name,'Dash');
  assert.equal(levels[13].name,'Clubstep');assert.equal(levels[13].difficulty,'Demon');
  assert.equal(levels[19].stars,15);assert.equal(levels[19].artist,'F-777');
  assert.equal(levels[21].artist,'MDK');assert.equal(levels[21].stars,12);
  assert.deepEqual(classes,['dash-theme']);
  assert.deepEqual(load('/french').classes,[]);assert.deepEqual(load('/').classes,[]);
  assert.equal(c.DashTheme.text('Attacco dell\'Estremo'),'Blast Processing');
  assert.equal(c.DashTheme.text('Reset estremo'),'NEW ATTEMPT');
  assert.equal(c.DashTheme.text('a2a4'),'a2a4');
  for(const level of levels) {assert(/^#[a-f0-9]{6}$/.test(level.color));assert(level.stars>0);}
});
test('Dash has no stage selector, ad or Ripassa, but requires homework', () => {
  const html=fs.readFileSync('index.html','utf8');
  assert(!html.includes('DashLevelPanel'));
  assert(!html.includes('SELECT LEVEL'));
  assert(!html.includes('setProperty("--dash-accent"'));
  assert(html.includes('!DASH_MODE && v.jsx(i1, {})'));
  assert(!html.includes('if (RISIO_MODE || DASH_MODE) { mountSite(); return; }'));
  assert(html.includes('if (await EntryGate.start({ french: FRENCH_MODE })) mountSite();'));
  assert(html.includes('!RISIO_MODE && !DASH_MODE && v.jsx("footer"'));
  assert(html.includes('if (RISIO_MODE || DASH_MODE || reviewActive || historyPaused || typeof EntryGate'));
  assert(!fs.readFileSync('assets/dash-theme.css','utf8').includes('.dash-level-panel'));
});
