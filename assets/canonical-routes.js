// Keep old French bookmarks working, without keeping version= in canonical URLs.
(function () {
  const url = new URL(location.href);
  if ((url.pathname === '/' || /^\/french\/?$/.test(url.pathname)) && url.searchParams.get('version') === 'french') {
    url.pathname = '/french';
    url.searchParams.delete('version');
    location.replace(url.pathname + url.search + url.hash);
  }
})();
