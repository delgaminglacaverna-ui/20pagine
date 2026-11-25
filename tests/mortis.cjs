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
test('all death routes show their own title, green decorative monitor, and opt-in heartbeat',async()=>{
  for(const [path,title] of [['/morte','Morte'],['/mortis/','Mortis'],['/memento-mori','Memento mori'],['/memento%20mori','Memento mori']]){
    const {dom,w,calls}=setup(path);
    try{
      assert.equal(w.document.title,title);assert.equal(w.document.querySelector('h1').textContent,title+'.');
      assert(!calls.includes('context'),'never start audio without consent');
      const button=w.document.getElementById('sound');button.click();await new Promise(resolve=>setImmediate(resolve));
      assert.equal(button.getAttribute('aria-pressed'),'true');assert(calls.includes('resume'));
      assert(calls.some(c=>Array.isArray(c)&&c[0]==='volume'&&c[1]===.175));
      button.click();assert.equal(button.getAttribute('aria-pressed'),'false');
      assert(w.document.body.textContent.includes('non dati medici'));
    }finally{w.dispatchEvent(new w.Event('pagehide'));dom.window.close();}
  }
});
test('reduced motion renders a static waveform and unsupported audio is reported',async()=>{
  const {dom,w,calls}=setup('/mortis',true);
  try{assert(!calls.includes('frame'));w.AudioContext=undefined;w.document.getElementById('sound').click();await new Promise(resolve=>setImmediate(resolve));assert.match(w.document.getElementById('audio-status').textContent,/non disponibile/);}finally{dom.window.close();}
});
test('GD alias redirects to Dash and death pages are included in production routes/build',()=>{
  const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
  for(const source of ['/gd','/gd/'])assert(config.redirects.some(r=>r.source===source&&r.destination==='/dash'));
  for(const source of ['/morte','/mortis','/memento-mori','/memento mori'])assert(config.rewrites.some(r=>r.source===source&&r.destination==='/mortis.html'));
  assert(fs.readFileSync('scripts/build.cjs','utf8').includes("fs.copyFileSync('mortis.html', 'public/mortis.html')"));
  const page=fs.readFileSync('mortis.html','utf8');for(const forbidden of ['entry-gate','site-ads','boi battler'])assert(!page.includes(forbidden));
});
