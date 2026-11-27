const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
async function setup(fails=false){
 const dom=new JSDOM('<body><div id="root"></div></body>',{runScripts:'outside-only'});const w=dom.window,d=w.document;let element=null;
 Object.defineProperty(d,'fullscreenElement',{get:()=>element});
 d.documentElement.requestFullscreen=async()=>{if(fails)throw Error('denied');element=d.documentElement;d.dispatchEvent(new w.Event('fullscreenchange'));};
 d.exitFullscreen=async()=>{element=null;d.dispatchEvent(new w.Event('fullscreenchange'));};
 w.eval(fs.readFileSync('assets/focus-mode.js','utf8'));await new Promise(resolve=>setImmediate(resolve));
 return {dom,w,d,toggle:d.querySelector('[role=switch]')};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function blocked(w){const event=new w.Event('beforeunload',{cancelable:true});w.dispatchEvent(event);return event.defaultPrevented;}
test('focus mode defaults off, requires click, survives root remount and disables with fullscreen exit',async()=>{
 const {dom,w,d,toggle}=await setup();try{
 assert(!toggle.checked);assert(!blocked(w));toggle.checked=true;toggle.dispatchEvent(new w.Event('change'));await flush();assert(toggle.checked);assert(blocked(w));
 d.getElementById('root').replaceChildren(d.createElement('main'));assert(d.querySelector('[role=switch]'));
 await d.exitFullscreen();assert(!toggle.checked);assert(!blocked(w));
 toggle.checked=true;toggle.dispatchEvent(new w.Event('change'));await flush();toggle.checked=false;toggle.dispatchEvent(new w.Event('change'));await flush();assert(!d.fullscreenElement);assert(!blocked(w));
 }finally{dom.window.close();}
});
test('fullscreen denial never leaves an exit warning enabled',async()=>{
 const {dom,w,toggle}=await setup(true);try{toggle.checked=true;toggle.dispatchEvent(new w.Event('change'));await flush();assert(!toggle.checked);assert(!blocked(w));}finally{dom.window.close();}
});
