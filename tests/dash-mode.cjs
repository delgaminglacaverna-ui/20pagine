const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html','utf8');
function load(pathname) {
  const c = vm.createContext({ location:{ pathname,search:'' },URLSearchParams,document:{documentElement:{}},v:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})} });
  vm.runInContext(html.slice(html.indexOf('const Ht ='),html.indexOf('function wh('))+';globalThis.api={Ff,DASH_MODE,FRENCH_MODE,rr};',c);
  return c.api;
}
test('Dash uses the exact seven supplied icons and normal legal rules', () => {
  const api = load('/dash'); assert.equal(api.DASH_MODE,true); assert.equal(api.FRENCH_MODE,false);
  const files = ['Cube001','Ball001','Robot001','Cube408','UFO001','Ship001','Wave001'];
  for (let piece=1;piece<=7;piece++) for (const side of [1,-1]) {
    const result = api.Ff({code:side*piece});
    assert.equal(result.type,'img'); assert.equal(result.props.src,`/assets/dash/${files[piece-1]}.webp`);
    assert.equal(result.props.draggable,false);
    assert.equal(fs.readFileSync(result.props.src.slice(1)).toString('ascii',0,4),'RIFF');
    assert.equal(result.props.style.filter,side===1?'none':'invert(1)');
  }
  assert(new api.rr().legalMoves().some(m => m.to%10 < m.from%10));
  assert.equal(load('/').Ff({code:1,variant:'dash'}).type,'img','archive explicit skin works outside Dash');
  assert.equal(api.Ff({code:1,variant:'normal'}).type,'span','normal replay stays normal');
  assert.equal(load('/dash/').DASH_MODE,true);
  assert.equal(load('/french').FRENCH_MODE,true);
});
test('French legacy bookmarks normalize without losing match or hash', () => {
  const navigations=[];
  const c = vm.createContext({URL,location:{href:'https://example.org/?version=french&partita=12345678#board',replace:p=>navigations.push(p)}});
  vm.runInContext(fs.readFileSync('assets/canonical-routes.js','utf8'),c);
  assert.deepEqual(navigations,['/french?partita=12345678#board']);
});
test('Dash and French routes are deployed and Dash URLs retain their online match', () => {
  const routes = JSON.parse(fs.readFileSync('vercel.json','utf8')).rewrites;
  for (const route of ['/dash','/dash/','/french','/french/']) assert(routes.some(r => r.source===route && r.destination==='/index.html'));
  const source=html.slice(html.indexOf('function onlVariant('),html.indexOf('const ONL_KEY'));
  const c=vm.createContext({DASH_MODE:true,RISIO_MODE:false,FRENCH_MODE:false,URLSearchParams});vm.runInContext(source,c);
  assert.equal(c.onlVariant(),'dash');assert.equal(c.onlPageUrl('40000000'),'/dash?partita=40000000');
});
