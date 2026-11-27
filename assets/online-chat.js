(function(root){
  root.OnlineChat={mount(container,id,token){
    let stopped=false,busy=false;
    const title=document.createElement('h3');title.textContent='Chat';
    const log=document.createElement('div');log.setAttribute('role','log');log.setAttribute('aria-label','Chat partita');log.style.cssText='max-height:180px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere';
    const form=document.createElement('form'),input=document.createElement('input'),button=document.createElement('button'),error=document.createElement('p');
    input.maxLength=300;input.setAttribute('aria-label','Messaggio');input.placeholder='Scrivi un messaggio';button.textContent='Invia';error.setAttribute('role','status');form.append(input,button);container.replaceChildren(title,log,form,error);
    async function request(body){const r=await fetch('/api/matches/'+id+'/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Chat non disponibile');return data;}
    function render(data){if(stopped)return;log.replaceChildren(...data.chat.map(message=>{const p=document.createElement('p');p.textContent=(message.color===1?'Bianco: ':'Nero: ')+message.text;return p;}));}
    async function poll(){if(stopped||busy)return;try{render(await request({}));}catch(e){if(!stopped)error.textContent=e.message;}}
    form.onsubmit=async e=>{e.preventDefault();if(busy||!input.value.trim())return;busy=true;button.disabled=true;try{render(await request({text:input.value}));if(!stopped){input.value='';error.textContent='';}}catch(e){if(!stopped)error.textContent=e.message;}finally{busy=false;button.disabled=false;}};
    poll();const timer=setInterval(poll,4000);return()=>{stopped=true;clearInterval(timer);container.replaceChildren();};
  }};
})(window);
