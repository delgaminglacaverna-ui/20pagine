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
