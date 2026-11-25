const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
test('all minimalist secret routes render the exact requested content',()=>{
  for(const [paths,expected] of [[['chronos','tempo'],'/assets/tabs/chronos-eye.png'],[['67'],'XD'],[['doomsday','doom','muffin','doomsdaymuffin'],'THE END IS NEAR'],[['harken','sybau','stfu','sybauken'],'/assets/secret/harken.png']]){
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
