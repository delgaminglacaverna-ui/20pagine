const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
test('all bundled variants await the homework gate before mounting or joining',async()=>{
  const source=html.slice(html.indexOf('async function enterSite()'),html.indexOf('enterSite();',html.indexOf('async function enterSite()')));
  for(const variant of ['normal','french','risio','dash']){
    for(const passed of [false,true]){
      let resolveGate,mounts=0,asked;
      const c=vm.createContext({FRENCH_MODE:variant==='french',RISIO_MODE:variant==='risio',DASH_MODE:variant==='dash',EntryGate:{start:options=>{asked=options;return new Promise(resolve=>resolveGate=resolve);}},mountSite:()=>mounts++,document:{getElementById:()=>({})}});
      vm.runInContext(source,c);const result=c.enterSite();assert.equal(mounts,0);assert.equal(asked.french,variant==='french');resolveGate(passed);await result;assert.equal(mounts,passed?1:0);
    }
  }
});
test('boring stays hidden and does not import its app until the same gate passes',async()=>{
  const source=fs.readFileSync('assets/boring-entry.js','utf8').replace("import('/assets/boring.js')",'loadGame()');
  for(const passed of [false,true]){
    const container={},game={hidden:true};let resolveGate,loads=0;
    const c=vm.createContext({document:{getElementById:id=>id==='entry-root'?container:game},EntryGate:{start:()=>new Promise(resolve=>resolveGate=resolve)},loadGame:async()=>loads++});
    const result=vm.runInContext(source,c);assert.equal(loads,0);assert.equal(game.hidden,true);resolveGate(passed);await result;assert.equal(loads,passed?1:0);assert.equal(game.hidden,!passed);
  }
});
test('Chessometry Dash uses mode names and no middle-dot separators',()=>{
  const c=vm.createContext({});vm.runInContext(fs.readFileSync('assets/dash-theme.js','utf8'),c);const text=c.DashTheme.text;
  assert.equal(text('Scacchi Dash 10×10 · 20 Pagine'),'Chessometry Dash');
  assert.equal(text('Puoi giocare solo se studi 20 pagine'),'THE SOCIETY IS GONNA BE IN GRIEF FOR YEARS');
  assert.equal(text('Pedone Cavallo Alfiere Regina Re Estremo Torre'),'Cube Robot Wave UFO Ship Ball Torre');
  assert.equal(text('Bianco · Nero'),'Bianco Nero');
});
