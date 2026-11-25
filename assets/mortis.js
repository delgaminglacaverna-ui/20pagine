/* Decorative ECG + synthesized lub-dub. No microphone, tracking, or medical data. */
(function () {
  const titles = { '/morte':'Morte', '/mortis':'Mortis', '/memento-mori':'Memento mori', '/memento mori':'Memento mori', '/mementomori':'Memento mori' };
  let path; try { path = decodeURIComponent(location.pathname).replace(/\/$/,''); } catch { path = ''; }
  const title = titles[path] || 'Memento mori';
  document.title = title;
  document.getElementById('route-name').textContent = title.toUpperCase();
  document.getElementById('page-title').textContent = title + '.';
  const canvas = document.getElementById('ecg'), ctx = canvas.getContext('2d');
  const button = document.getElementById('sound'), volume = document.getElementById('volume'), status = document.getElementById('audio-status');
  const interval = 60 / 72, reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const started = performance.now() / 1000;
  let audio, gain, sound = false, nextBeat = 0, scheduler, frame, disposed = false;
  function wave(t) {
    const p = ((t % interval) + interval) % interval / interval;
    const pulse = (center,width,height) => height*Math.exp(-Math.pow((p-center)/width,2));
    return pulse(.14,.032,.12)-pulse(.29,.012,.18)+pulse(.32,.009,1)-pulse(.35,.014,.36)+pulse(.58,.065,.23);
  }
  function draw() {
    if (!ctx || disposed) return;
    const width = canvas.clientWidth || 800, height = canvas.clientHeight || 240;
    const dpr = Math.min(window.devicePixelRatio || 1,2);
    if (canvas.width !== Math.round(width*dpr) || canvas.height !== Math.round(height*dpr)) { canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr); }
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#03100a';ctx.fillRect(0,0,width,height);
    ctx.lineWidth=1;ctx.strokeStyle='#0b2e1b';ctx.beginPath();
    for(let x=0;x<width;x+=20){ctx.moveTo(x,0);ctx.lineTo(x,height);}for(let y=0;y<height;y+=20){ctx.moveTo(0,y);ctx.lineTo(width,y);}ctx.stroke();
    const now = reduced?.matches ? 6 : performance.now()/1000-started;
    const span=6, speed=width/span;
    ctx.beginPath();
    for(let x=0;x<=width;x+=1){const y=height*.57-wave(now-(width-x)/speed)*height*.38;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.strokeStyle='#59ff91';ctx.lineWidth=2;ctx.shadowColor='#45ff80';ctx.shadowBlur=9;ctx.stroke();ctx.shadowBlur=0;
    if (!reduced?.matches) frame=requestAnimationFrame(draw);
  }
  function thump(time,frequency,amplitude) {
    const osc=audio.createOscillator(), envelope=audio.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(frequency,time);osc.frequency.exponentialRampToValueAtTime(35,time+.13);
    envelope.gain.setValueAtTime(.0001,time);envelope.gain.exponentialRampToValueAtTime(amplitude,time+.012);envelope.gain.exponentialRampToValueAtTime(.0001,time+.17);
    osc.connect(envelope);envelope.connect(gain);osc.start(time);osc.stop(time+.19);
    osc.onended=()=>{osc.disconnect();envelope.disconnect();};
  }
  function schedule() {
    if (!sound || audio?.state !== 'running') return;
    if (nextBeat < audio.currentTime) nextBeat=audio.currentTime+.03;
    while(nextBeat<audio.currentTime+.18){thump(nextBeat,88,.65);thump(nextBeat+.2,66,.45);nextBeat+=interval;}
  }
  function label() { button.textContent=sound?'Disattiva battito':'Attiva battito';button.setAttribute('aria-pressed',String(sound)); }
  async function toggle() {
    if(sound){sound=false;clearInterval(scheduler);gain.gain.setValueAtTime(0,audio.currentTime);label();status.textContent='Battito disattivato.';return;}
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if(!Audio) throw Error('unsupported');
      if(!audio){audio=new Audio();gain=audio.createGain();gain.connect(audio.destination);}
      await audio.resume();
      if(disposed) return;
      sound=audio.state==='running';
      if(!sound) throw Error('blocked');
      gain.gain.setValueAtTime(Number(volume.value)/100*.5,audio.currentTime);
      // Align synthetic heartbeat with the waveform phase, including after a mute.
      const elapsed=performance.now()/1000-started;
      nextBeat=audio.currentTime+(interval-(elapsed%interval))%interval+.32*interval;
      schedule();clearInterval(scheduler);scheduler=setInterval(schedule,75);label();status.textContent='Battito attivo · volume regolabile.';
    }catch{sound=false;label();status.textContent='Audio non disponibile o bloccato dal browser. Puoi comunque guardare il tracciato.';}
  }
  button.addEventListener('click',toggle);
  volume.addEventListener('input',()=>{if(gain && sound)gain.gain.setTargetAtTime(Number(volume.value)/100*.5,audio.currentTime,.03);});
  function motionChanged(){cancelAnimationFrame(frame);draw();}
  reduced?.addEventListener?.('change',motionChanged);
  window.addEventListener('resize',motionChanged);
  document.addEventListener('visibilitychange',async()=>{
    if(document.hidden){cancelAnimationFrame(frame);if(audio)await audio.suspend();}
    else {draw();if(sound && audio){try{await audio.resume();if(audio.state!=='running')throw Error('blocked');nextBeat=audio.currentTime+.03;}catch{sound=false;clearInterval(scheduler);label();status.textContent='Tocca «Attiva battito» per riprendere.';}}}
  });
  window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);clearInterval(scheduler);audio?.close();});
  draw();
})();
