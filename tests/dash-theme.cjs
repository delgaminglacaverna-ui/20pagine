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
test('level selector changes the theme color without changing the chess position', () => {
  const {c}=load('/dash');let chosen=0;const colors=[];
  c.window={DashTheme:c.DashTheme};c.document.documentElement.style={setProperty:(key,value)=>colors.push([key,value]),removeProperty(){}};
  c.ul={useState:()=>[chosen,v=>chosen=v],useEffect:fn=>fn()};
  c.v={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  const html=fs.readFileSync('index.html','utf8');
  vm.runInContext(html.slice(html.indexOf('function DashLevelPanel()'),html.indexOf('function a1()')),c);
  const panel=c.DashLevelPanel();const select=panel.props.children.find(node=>node.type==='select');
  assert.equal(select.props.children.length,22);select.props.onChange({target:{value:'19'}});
  const updated=c.DashLevelPanel();assert.equal(chosen,19);
  assert.equal(updated.props.children.find(node=>node.type==='h2').props.children,'Deadlocked');
  assert.equal(colors.at(-1)[1],c.DashTheme.levels[19].color);
});
