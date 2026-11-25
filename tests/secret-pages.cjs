const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
test('all minimalist secret routes render the exact requested content',()=>{
  for(const [paths,expected] of [[['mattone'],'/assets/secret/mattone.png'],[['chronos','tempo'],'/assets/tabs/chronos-eye.png'],[['67'],'XD'],[['doomsday','doom','muffin','doomsdaymuffin'],'THE END IS NEAR'],[['harken','sybau','stfu','sybauken'],'/assets/secret/harken.png']]){
    for(const path of paths){
      assert(config.rewrites.some(r=>r.source==='/'+path&&r.destination==='/secret.html'));
      const dom=new JSDOM(fs.readFileSync('secret.html','utf8'),{url:'https://example.org/'+path,runScripts:'outside-only'});
      try{dom.window.eval(fs.readFileSync('assets/secret.js','utf8'));const root=dom.window.document.getElementById('void');assert.equal(root.children.length,1);if(expected.startsWith('/')){assert.equal(root.firstChild.getAttribute('src'),expected);assert(fs.existsSync(expected.slice(1)));}else assert.equal(root.textContent,expected);}finally{dom.window.close();}
    }
  }
});
test('external redirects match every requested alias without creating an open redirect',()=>{
  const groups=[ [['x-treme','xtreme','estremo'],'https://it.wikipedia.org/wiki/Tortura#'],[['teiera','newell','tazza'],'https://en.wikipedia.org/wiki/Martin_Newell_(computer_scientist)'],[['tiki'],'https://the-battle-bricks.fandom.com/wiki/Tiki_Battler'],[['boi','son'],'https://www.youtube.com/@TheRealLowTierGod'] ];
  for(const [paths,destination] of groups)for(const path of paths)for(const slash of ['','/']){const rule=config.redirects.find(r=>r.source==='/'+path+slash);assert(rule);assert(decodeURIComponent(rule.destination).startsWith(decodeURIComponent(destination)));assert.equal(rule.permanent,false);}
  for(const path of ['/morte','/mortis','/mementomori','/memento-mori'])assert(config.rewrites.some(r=>r.source===path&&r.destination==='/mortis.html'));
});

test('new aliases route to their fixed destinations and all level names reach Dash',()=>{
  const vm=require('node:vm');const c=vm.createContext({});vm.runInContext(fs.readFileSync('assets/dash-theme.js','utf8'),c);
  const destination=path=>config.redirects.find(r=>r.source==='/'+path)?.destination;
  for(const level of c.DashTheme.levels){
    for(const name of [level.name.toLowerCase(),level.name.toLowerCase().replace(/ /g,'-'),level.name.toLowerCase().replace(/[ '\-]/g,'')]){
      if(name==='dash')assert(config.rewrites.some(r=>r.source==='/dash'));else assert.equal(destination(name),'/dash');
    }
  }
  for(const name of ['blood','bloodbath','golden'])assert.equal(destination(name),'/dash');
  for(const name of ['floopfang','gazo','giggler','gloober','gembo','cheerer','gleeber','glaaber','glogga','kruzzit','zorker','blepzo','yippeeyay','glaggle','enfosi','glaggleland'])assert.equal(destination(name),'/risio');
  for(const name of ['rizz','tung','triple t','triple-t','triplet','ttt','skibidi','gyatt','puh','dih','hawktuah','rizzler','aura'])assert.equal(destination(name),'https://en.wikipedia.org/wiki/Brain_rot');
  for(const name of ['penna','pennabic','bic'])assert.equal(destination(name),'https://it.wikipedia.org/wiki/Dio');
  for(const name of ['are you','are-you','areyou','ru','tree'])assert.equal(destination(name),'https://www.youtube.com/watch?v=ZKAM_Hk4eZ0&list=RDZKAM_Hk4eZ0&start_radio=1');
  for(const name of ['blud','bludda'])assert.equal(destination(name),'https://www.roblox.com/communities/35498183/WE-BLUDDIN-OUT-OF-THIS-ONE#!/about');
  assert.equal(destination('omori'),'https://www.omocat-shop.com/products/omori-plush');
  const sources=config.redirects.map(r=>r.source);assert.equal(new Set(sources).size,sources.length);
});
