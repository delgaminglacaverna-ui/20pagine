const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getTransformedRoutes } = require('@vercel/routing-utils');
const config = require('../vercel.json');
test('Vercel accepts all production rewrites, redirects and headers', () => {
  const result = getTransformedRoutes(config);
  assert.equal(result.error, null, JSON.stringify(result.error));
  assert(result.routes.length > 0);
});
test('Newell destinations encode literal parentheses instead of declaring routing segments', () => {
  for (const source of ['/teiera','/newell','/tazza']) {
    const rule = config.redirects.find(rule => rule.source === source);
    assert(rule.destination.includes('%28computer_scientist%29'));
    assert.equal(decodeURIComponent(new URL(rule.destination).pathname), '/wiki/Martin_Newell_(computer_scientist)');
  }
  const broken = { redirects: [{ source: '/teiera', destination: 'https://en.wikipedia.org/wiki/Martin_Newell_(computer_scientist)', permanent: false }] };
  assert.equal(getTransformedRoutes(broken).error.code, 'invalid_redirect');
});
