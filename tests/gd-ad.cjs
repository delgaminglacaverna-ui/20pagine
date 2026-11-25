const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('GD AD uses a native playlist iframe and NEVER initializes the YouTube Widget API',async()=>{
  const html=fs.readFileSync('index.html','utf8');let cursor=0;const state=[];let effects=[];
  const SkipClock=()=>{};
  const context=vm.createContext({DASH_MODE:true,RISIO_MODE:false,ENFOSI_MEDIA:[{}],Math,dr:30,wf:1.25,or:()=> 'tbb-id',createEnfosiTrigger:()=>()=>false,SkipClock,
    startSkipCountdown:(callback,seconds)=>{assert.equal(seconds,2.5);return ()=>{};},
    c1:()=>{throw Error('Widget API must not load in GD');},
    window:{addEventListener(){},removeEventListener(){}},
    v:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    ul:{useState:initial=>{const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],value=>state[i]=typeof value==='function'?value(state[i]):value];},useRef:initial=>{const i=cursor++;return state[i]||(state[i]={current:initial});},useEffect:fn=>effects.push(fn)}
  });
  vm.runInContext(html.slice(html.indexOf('const GD_AD_PLAYLIST'),html.indexOf('function kf('))+';globalThis.render=i1;',context);
  const nodes=node=>node&&typeof node==='object'?[node,...[node.props?.children].flat(2).flatMap(nodes)]:[];
  const render=()=>{cursor=0;effects=[];const all=nodes(context.render());for(const node of all)if(node.props?.ref)node.props.ref.current={};for(const effect of effects)effect();return all;};
  let all=render();assert(all.some(n=>n.props?.children==='GD AD'));
  const iframe=all.find(n=>n.type==='iframe');const url=new URL(iframe.props.src);
  assert.equal(url.pathname,'/embed/videoseries');assert.equal(url.searchParams.get('list'),'PLFEp265cKO3ZM_IpuwB_Htbht8T0kFPG4');
  assert.equal(url.searchParams.get('index'),'0');assert.equal(url.searchParams.get('controls'),'1');assert(!url.searchParams.has('enablejsapi'));assert(!iframe.props.src.includes('undefined'));assert(!iframe.props.ref);
  all.find(n=>n.type===SkipClock).props.onSkip();all=render();
  assert.equal(new URL(all.find(n=>n.type==='iframe').props.src).searchParams.get('index'),'1');
});
