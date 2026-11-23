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
  let partyTimer;
  function move(move) {
    if (!/^\/risio\/?$/.test(root.location.pathname)) return;
    // Only live moves call this: loading openings, undo and redo stay silent.
    if (move.flag !== 3 && move.flag !== 4) return;
    document.querySelector('.risio-castle-party')?.remove();
    root.clearTimeout(partyTimer);
    const party = document.createElement('div'); party.className = 'risio-castle-party';
    party.setAttribute('aria-hidden', 'true');
    const faces = ['Kruzzit3.webp', 'Yippeeyay3.webp', 'Glogga3.webp', 'Floopfang3.webp', 'Zorker2.webp', 'Blepzo3.webp'];
    for (let i = 0; i < 18; i++) {
      const face = document.createElement('img');
      face.src = '/assets/risio/' + faces[i % faces.length]; face.alt = '';
      face.style.left = (3 + i * 5.2) + '%';
      face.style.animationDelay = (i % 4 * 35) + 'ms';
      party.appendChild(face);
    }
    document.body.appendChild(party);
    partyTimer = root.setTimeout(() => party.remove(), 1100);
  }
  root.RisioEffects = { scare, move };
})(window);
