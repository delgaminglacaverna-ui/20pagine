/* Decorative variable heartbeat, not a medical reading. Only the trace is visible. */
(function () {
  const canvas=document.getElementById('ecg'),ctx=canvas.getContext('2d');
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const origin=performance.now()/1000,beats=[];
  let frame,timer,audio,gain,sound=false,disposed=false,pending=false,audioOrigin=0;
  const scheduled=new Set();
  const elapsed=()=>performance.now()/1000-origin;
  const noise=n=>{const v=Math.sin(n*127.1+7.3)*43758.5453;return v-Math.floor(v);};
  function extend(until){
    if(!beats.length)beats.push({t:-12,id:0,duration:.83,amplitude:1});
    while(beats.at(-1).t<until){const last=beats.at(-1),id=last.id+1;beats.push({t:last.t+last.duration,id,duration:.62+noise(id)*.46,amplitude:.7+noise(id+500)*.5});}
  }
  function wave(t){
    const beat=beats.find(b=>t>=b.t&&t<b.t+b.duration);if(!beat)return 0;
    const p=(t-beat.t)/beat.duration;
    const g=(c,w,h)=>h*Math.exp(-Math.pow((p-c)/w,2));
    return beat.amplitude*(g(.14,.03,.12)-g(.29,.012,.18)+g(.32,.009,1)-g(.35,.014,.36)+g(.58,.065,.23))+.012*Math.sin(t*2.3);
  }
  function draw(){
    if(!ctx||disposed)return;
    const w=canvas.clientWidth||800,h=canvas.clientHeight||500,dpr=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    const now=reduced?.matches?6:elapsed();extend(now+2);
    while(beats.length>2&&beats[1].t<now-12)beats.shift();
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.beginPath();
    const amp=Math.min(h*.2,120);
    for(let x=0;x<=w;x++){const y=h*.5-wave(now-6+(x/w)*6)*amp;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.strokeStyle='#59ff91';ctx.lineWidth=2;ctx.shadowColor='#45ff80';ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;
    if(!reduced?.matches)frame=requestAnimationFrame(draw);
  }
  function thump(t,f,a){
    const osc=audio.createOscillator(),env=audio.createGain();osc.type='sine';
    osc.frequency.setValueAtTime(f,t);osc.frequency.exponentialRampToValueAtTime(35,t+.13);
    env.gain.setValueAtTime(.0001,t);env.gain.exponentialRampToValueAtTime(a,t+.012);env.gain.exponentialRampToValueAtTime(.0001,t+.17);
    osc.connect(env);env.connect(gain);osc.start(t);osc.stop(t+.19);osc.onended=()=>{osc.disconnect();env.disconnect();};
  }
  function schedule(){
    if(!sound||audio?.state!=='running')return;
    const now=elapsed();extend(now+2);
    for(const b of beats){const center=b.t+b.duration*.32;if(center<now||center>now+.2||scheduled.has(b.id))continue;
      scheduled.add(b.id);const t=audioOrigin+center;if(t<audio.currentTime)continue;
      thump(t,88,.55*b.amplitude);thump(t+.19,66,.38*b.amplitude);
    }
    for(const id of scheduled)if(id<beats[0].id)scheduled.delete(id);
  }
  function update(){canvas.setAttribute('aria-pressed',String(sound));}
  async function toggle(){
    if(pending)return;
    if(sound){sound=false;clearInterval(timer);gain.gain.setValueAtTime(0,audio.currentTime);update();return;}
    pending=true;
    try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      if(!audio){audio=new Audio();gain=audio.createGain();gain.connect(audio.destination);}
      await audio.resume();if(disposed)return;sound=audio.state==='running';
      if(sound){gain.gain.setValueAtTime(.18,audio.currentTime);audioOrigin=audio.currentTime-elapsed();scheduled.clear();schedule();clearInterval(timer);timer=setInterval(schedule,60);}
    }catch{sound=false;}finally{pending=false;update();}
  }
  canvas.addEventListener('click',toggle);
  canvas.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle();}});
  function redraw(){cancelAnimationFrame(frame);draw();}
  window.addEventListener('resize',redraw);reduced?.addEventListener?.('change',redraw);
  document.addEventListener('visibilitychange',async()=>{
    if(document.hidden){cancelAnimationFrame(frame);if(audio)await audio.suspend();}
    else{redraw();if(sound&&audio){try{await audio.resume();sound=audio.state==='running';audioOrigin=audio.currentTime-elapsed();scheduled.clear();}catch{sound=false;}update();}}
  });
  window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);clearInterval(timer);audio?.close();});
  draw();
})();
