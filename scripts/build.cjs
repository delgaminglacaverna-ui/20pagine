require('./sync-engine.cjs');
const fs = require('node:fs');
fs.mkdirSync('public', { recursive: true });
fs.copyFileSync('index.html', 'public/index.html');
fs.cpSync('assets', 'public/assets', { recursive: true });

fs.copyFileSync('panel.html', 'public/panel.html');
fs.writeFileSync('public/assets/text-catalog.json', JSON.stringify(require('./text-catalog.cjs')(fs.readFileSync('index.html', 'utf8')), null, 2));
