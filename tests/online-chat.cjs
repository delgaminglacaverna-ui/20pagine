const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
test('chat renders untrusted text safely and cleans polling on leave',async()=>{
 const dom=new JSDOM('<div id="chat"></div>',{runScripts:'outside-only',url:'https://example.org'});const w=dom.window;let cleared=false;
 w.setInterval=()=>1;w.clearInterval=()=>cleared=true;w.fetch=async()=>({ok:true,json:async()=>({chat:[{color:1,text:'<img src=x onerror=alert(1)>'}]})});
 try{w.eval(fs.readFileSync('assets/online-chat.js','utf8'));const close=w.OnlineChat.mount(w.document.getElementById('chat'),'01234567','token');await new Promise(resolve=>setImmediate(resolve));
 assert(!w.document.querySelector('img'));assert(w.document.querySelector('[role=log]').textContent.includes('<img'));assert.equal(w.document.querySelector('input').maxLength,300);close();assert(cleared);assert.equal(w.document.getElementById('chat').children.length,0);
 }finally{w.close();}
});
