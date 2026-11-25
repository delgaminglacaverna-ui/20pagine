const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync('assets/mortis.js','utf8');
function setup(path,reduced=false){
  const dom=new JSDOM(fs.readFileSync('mortis.html','utf8'),{url:'https://example.org'+path,runScripts:'outside-only'});
  const w=dom.window,calls=[];
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({}, {get:(t,key)=>t[key]||(()=>{}),set:(t,key,value)=>(t[key]=value,true)});
  w.matchMedia=()=>({matches:reduced,addEventListener(){}});
  w.requestAnimationFrame=()=>{calls.push('frame');return 1;};w.cancelAnimationFrame=()=>{};
  class Audio {
    constructor(){this.currentTime=0;this.state='suspended';calls.push('context');}
    async resume(){this.state='running';calls.push('resume');}
    async suspend(){this.state='suspended';}
    close(){this.state='closed';}
    createGain(){return {gain:{setValueAtTime:v=>calls.push(['volume',v]),exponentialRampToValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}};}
    createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start:()=>calls.push('thump'),stop(){}};}
  }
  w.AudioContext=Audio;w.eval(script);return {dom,w,calls};
}
test('death pages show only a variable green trace and toggle audio by touching it',async()=>{
  const {dom,w,calls}=setup('/mementomori');
  try{
    assert.equal(w.document.body.children.length,2);
    assert.equal(w.document.querySelectorAll('h1,header,footer,button,p,input').length,0);
    const canvas=w.document.getElementById('ecg');assert.equal(canvas.getAttribute('aria-pressed'),'false');
    canvas.click();await new Promise(resolve=>setImmediate(resolve));assert.equal(canvas.getAttribute('aria-pressed'),'true');
    assert(calls.includes('resume'));canvas.click();assert.equal(canvas.getAttribute('aria-pressed'),'false');
    assert(script.includes('duration:.62+noise(id)*.46'));assert(script.includes('amplitude:.7+noise(id+500)*.5'));
  }finally{w.dispatchEvent(new w.Event('pagehide'));dom.window.close();}
});
test('reduced motion uses a static trace and unsupported audio fails silently',async()=>{
  const {dom,w,calls}=setup('/mortis',true);
  try{assert(!calls.includes('frame'));w.AudioContext=undefined;w.document.getElementById('ecg').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(w.document.getElementById('ecg').getAttribute('aria-pressed'),'false');}finally{dom.window.close();}
});
test('GD alias redirects to Dash and death pages are included in production routes/build',()=>{
  const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
  for(const source of ['/gd','/gd/'])assert(config.redirects.some(r=>r.source===source&&r.destination==='/dash'));
  for(const source of ['/morte','/mortis','/memento-mori','/memento mori'])assert(config.rewrites.some(r=>r.source===source&&r.destination==='/mortis.html'));
  assert(fs.readFileSync('scripts/build.cjs','utf8').includes("fs.copyFileSync('mortis.html', 'public/mortis.html')"));
  const page=fs.readFileSync('mortis.html','utf8');for(const forbidden of ['entry-gate','site-ads','boi battler'])assert(!page.includes(forbidden));
});
