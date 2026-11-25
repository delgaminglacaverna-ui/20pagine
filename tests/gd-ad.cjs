const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('GD AD loads the chosen playlist, plays at 1x and skips within the playlist',async()=>{
  const html=fs.readFileSync('index.html','utf8');const effects=[],refs=[];let options,next=0;
  const SkipClock=()=>{};
  const context=vm.createContext({DASH_MODE:true,RISIO_MODE:false,location:{origin:"https://preview.example.org"},ENFOSI_MEDIA:[{}],Math,dr:30,wf:1.25,or:()=> 'tbb-id',createEnfosiTrigger:()=>()=>false,SkipClock,
    startSkipCountdown:(callback,seconds)=>{assert.equal(seconds,2.5);return ()=>{};},
    c1:async()=>({Player:class{constructor(target,opts){options=opts;this.nextVideo=()=>next++;}}}),
    window:{addEventListener(){},removeEventListener(){}},
    v:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    ul:{useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useRef:initial=>{const ref={current:initial};refs.push(ref);return ref;},useEffect:fn=>effects.push(fn)}
  });
  vm.runInContext(html.slice(html.indexOf('const GD_AD_PLAYLIST'),html.indexOf('function kf('))+';globalThis.render=i1;',context);
  const tree=context.render();
  const nodes=node=>node&&typeof node==='object'?[node,...[node.props?.children].flat(2).flatMap(nodes)]:[];
  const all=nodes(tree);assert(all.some(n=>n.props?.children==='GD AD'));
  for(const node of all)if(node.props?.ref)node.props.ref.current={};
  for(const effect of effects)effect();await Promise.resolve();await Promise.resolve();
  assert(!Object.hasOwn(options,'videoId'));
  const iframe=all.find(n=>n.type==='iframe');assert(iframe);const url=new URL(iframe.props.src);assert.equal(url.pathname,'/embed/videoseries');assert.equal(url.searchParams.get('list'),'PLFEp265cKO3ZM_IpuwB_Htbht8T0kFPG4');assert.equal(url.searchParams.get('origin'),'https://preview.example.org');assert(!iframe.props.src.includes('undefined'));
  assert.equal(options.playerVars.listType,'playlist');
  assert.equal(options.playerVars.list,'PLFEp265cKO3ZM_IpuwB_Htbht8T0kFPG4');
  let speed;options.events.onReady({target:{mute(){},setPlaybackRate:value=>speed=value,playVideo(){}}});assert.equal(speed,1);
  const skip=all.find(n=>n.type===SkipClock);skip.props.onSkip();assert.equal(next,1);
  options.events.onStateChange({data:0,target:{}});assert.equal(next,1,'let YouTube advance naturally, do not skip twice');
});
