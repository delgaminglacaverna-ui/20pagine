const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {bosses}=require('../data/boss-references.json');const config=require('../vercel.json');
const routes=new Map([...config.rewrites,...config.redirects].map(r=>[r.source,r.destination]));
test('all boss names including the user-added Blight have references and reachable aliases',()=>{
  assert.equal(bosses.length,59);assert.equal(new Set(bosses.map(b=>b.name)).size,59);
  for(const boss of bosses){
    const name=boss.name.toLowerCase();assert(boss.reference);
    for(const alias of new Set([name,name.replace(/ /g,'-'),name.replace(/[ -]/g,'')])){
      assert(routes.has('/'+alias),boss.name+' missing '+alias);
      let destination='/'+alias;const seen=new Set();
      while(routes.has(destination)&&!destination.endsWith('.html')){
        assert(!seen.has(destination),'Redirect loop at '+destination);seen.add(destination);destination=routes.get(destination);
      }
      assert(destination.startsWith('https://')||destination.endsWith('.html'),destination);
    }
  }
});
test('user references remain unchanged and script does not introduce missing aliases',()=>{
  for(const path of ['/chronos','/mortis','/doomsdaymuffin'])assert.equal(routes.get(path),'/'+(path==='/mortis'?'mortis':'secret')+'.html');
  assert(routes.get('/x-treme').startsWith('https://it.wikipedia.org/wiki/Tortura#'));
  assert.equal(routes.get('/cesus'),'/penna');
  assert.equal(routes.get('/paintmaster'),'https://en.wikipedia.org/wiki/Microsoft_Paint');
  assert.equal(routes.get('/terminator'),'https://en.wikipedia.org/wiki/The_Terminator');
  assert.equal(routes.get('/gamek1d'),'https://en.wikipedia.org/wiki/Game_Boy');
  require('node:child_process').execFileSync(process.execPath,['scripts/sync-boss-aliases.cjs','--check']);
});

test('Blight and hell share the user-requested Hell reference',()=>{
  for(const source of ['/blight','/blight/','/hell','/hell/'])assert.equal(routes.get(source),'https://en.wikipedia.org/wiki/Hell');
});
