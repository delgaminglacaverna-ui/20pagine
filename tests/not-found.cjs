const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
test('404 page displays only the provided fullscreen image with a root-relative asset URL', () => {
  const source = fs.readFileSync('404.html', 'utf8');
  const dom = new JSDOM(source, { url: 'https://example.org/unknown/nested/page' });
  try {
    const body = dom.window.document.body;
    assert.equal(body.children.length, 1);
    assert.equal(body.firstElementChild.tagName, 'IMG');
    assert.equal(body.firstElementChild.src, 'https://example.org/assets/secret/not-found.png');
    assert(fs.existsSync('assets/secret/not-found.png'));
    assert(source.includes('object-fit:cover'));
    assert(!source.includes('<script'));
    assert(fs.readFileSync('scripts/build.cjs', 'utf8').includes("fs.copyFileSync('404.html', 'public/404.html')"));
    assert(!require('../vercel.json').rewrites.some(route => route.source === '/:path*'));
  } finally { dom.window.close(); }
});
