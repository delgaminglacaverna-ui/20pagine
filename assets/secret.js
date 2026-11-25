(function(){
  let route;try{route=decodeURIComponent(location.pathname).replace(/\/$/,'');}catch{route='';}
  const root=document.getElementById('void');
  if(['/chronos','/tempo'].includes(route)){
    document.title='Chronos';const image=document.createElement('img');image.src='/assets/tabs/chronos-eye.png';image.alt='Occhio di Chronos';image.className='chronos-eye';root.append(image);
  }else if(route==='/mattone'){
    document.title='Mattone';const image=document.createElement('img');image.src='/assets/secret/mattone.png';image.alt='Brick Notifier';root.append(image);
  }else if(['/harken','/sybau','/stfu','/sybauken'].includes(route)){
    document.title='Harken';const image=document.createElement('img');image.src='/assets/secret/harken.png';image.alt='Harken';root.append(image);
  }else{
    const text=route==='/67'?'XD':'THE END IS NEAR';document.title=text;const p=document.createElement('p');p.textContent=text;root.append(p);
  }
})();
