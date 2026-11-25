const routing = require('@vercel/routing-utils').getTransformedRoutes(require('../vercel.json'));
if (routing.error) throw Error('Vercel routing: ' + routing.error.message);
require('./sync-engine.cjs');
require('./sync-coach.cjs');
const fs = require('node:fs');
fs.writeFileSync('assets/legacy-layout.css', require('./legacy-css.cjs')(fs.readFileSync('index.html', 'utf8')));
fs.mkdirSync('public', { recursive: true });
fs.copyFileSync('index.html', 'public/index.html');
fs.cpSync('assets', 'public/assets', { recursive: true });

fs.copyFileSync('panel.html', 'public/panel.html');
const catalog = require('./text-catalog.cjs')(fs.readFileSync('index.html', 'utf8'));
const gateWords = require('node:vm').runInNewContext(
  fs.readFileSync('assets/entry-gate.js', 'utf8') + '; EntryGate.TEXT'
);
const gateCatalog = Object.values(gateWords).flatMap(Object.values);
fs.writeFileSync('public/assets/text-catalog.json', JSON.stringify([...new Set([...catalog, ...gateCatalog])].sort(), null, 2));

fs.copyFileSync('boring.html', 'public/boring.html');
fs.mkdirSync('public/assets/vendor', { recursive: true });
fs.copyFileSync('node_modules/chess.js/dist/esm/chess.js', 'public/assets/vendor/chess.js');
for (const ext of ['js', 'wasm']) fs.copyFileSync(`node_modules/stockfish/bin/stockfish-18-lite-single.${ext}`, `public/assets/vendor/stockfish-18-lite-single.${ext}`);
fs.copyFileSync('node_modules/stockfish/Copying.txt', 'public/assets/vendor/STOCKFISH-LICENSE.txt');

fs.copyFileSync('mortis.html', 'public/mortis.html');

fs.copyFileSync('secret.html', 'public/secret.html');
