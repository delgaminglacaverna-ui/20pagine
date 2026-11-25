// Materialize only missing boss aliases. Never replace a user-assigned route.
const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const { bosses } = require('../data/boss-references.json');
const known = new Set([...config.redirects, ...config.rewrites].map(route => route.source));
let added = 0;
for (const boss of bosses) {
  const name = boss.name.toLowerCase();
  const names = new Set([name, name.replace(/ /g, '-'), name.replace(/[ -]/g, '')]);
  for (const alias of names) for (const slash of ['', '/']) {
    const source = '/' + alias + slash;
    if (known.has(source) || source === boss.destination) continue;
    if (process.argv.includes('--check')) throw Error('Missing boss alias ' + source);
    config.redirects.push({ source, destination: boss.destination, permanent: false });
    known.add(source); added++;
  }
}
if (added) fs.writeFileSync('vercel.json', JSON.stringify(config, null, 2) + '\n');
