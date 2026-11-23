/* Effects live outside the animated React root so fixed coordinates stay viewport-relative. */
(function (root) {
  'use strict';
  const destination = 'https://sites.google.com/view/enphosoweb?pli=1&authuser=0';
  function scare() {
    if (!/^\/risio\/?$/.test(root.location.pathname)) return;
    const overlay = document.createElement('div');
    overlay.className = 'risio-jumpscare'; overlay.setAttribute('role', 'alert');
    const face = document.createElement('img');
    face.src = '/assets/enfosi/smiley.png'; face.alt = 'RISIO ti ha trovato!';
    overlay.appendChild(face); document.body.appendChild(overlay);
    const timer = root.setTimeout(() => root.location.assign(destination), 900);
    return () => { root.clearTimeout(timer); overlay.remove(); };
  }
  root.RisioEffects = { scare };
})(window);
