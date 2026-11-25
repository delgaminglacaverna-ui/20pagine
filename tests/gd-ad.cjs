const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('GD chooses verified video IDs randomly without immediate repeats, with 15 second cube timer',()=>{
 const html=fs.readFileSync('index.html','utf8');const c=vm.createContext({Math});
 vm.runInContext(html.slice(html.indexOf('const GD_AD_PLAYLIST'),html.indexOf('function i1()'))+';globalThis.ids=GD_AD_VIDEOS;',c);
 assert.equal(c.ids.length,40);assert.equal(new Set(c.ids).size,40);for(const id of c.ids)assert.match(id,/^[\w-]{11}$/);
 let previous;const seen=new Set();for(let i=0;i<500;i++){const next=c.randomGdAd(previous);assert.notEqual(next,previous);assert(c.ids.includes(next));seen.add(next);previous=next;}assert(seen.size>1);
 assert(html.includes('DASH_MODE ? 15 : enfosi ? 2.5 : dr'));
 assert(html.includes('setMediaIndex(previous => randomGdAd(previous))'));
 assert(html.includes('youtube.com/embed/${mediaIndex}?autoplay=1&mute=1&controls=0'));
 assert(!html.includes('youtube.com/embed/videoseries'));
 assert(html.includes('gd: DASH_MODE'));
 const clock=html.slice(html.indexOf('function SkipClock('),html.indexOf('function createEnfosiTrigger'));
 assert(clock.includes('/assets/dash/Cube001.webp'));assert(clock.includes('rotate('));assert(clock.includes('!enfosi && !gd'));
 assert(fs.readFileSync('assets/dash-theme.css','utf8').includes('.gd-skip-cube .skip-clock-hand { display:none; }'));
});
