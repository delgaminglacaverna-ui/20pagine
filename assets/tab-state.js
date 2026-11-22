(function (root) {
  const states = {
    compiti: { title: 'HAI FATTO I COMPITI???', icon: '/assets/eyes/frame-1.webp', type: 'image/webp' },
    chess: { title: 'TEMPO ESTREMO COME IL DIH', icon: '/assets/tabs/pawn.svg', type: 'image/svg+xml' },
    french: { title: '(gbfjkdfugyfhdjk)/', icon: '/assets/tabs/cigarette.svg', type: 'image/svg+xml' },
    review: { title: 'NON SI FANNO I COMPITI IN CLASSE!!', icon: '/assets/closed-eyes/frame-1.webp', type: 'image/webp' },
    enraged: { title: 'IO SAREI MORTIFICATO, NON PROVI VERGOGNA', icon: '/assets/mouths/frame-1.webp', type: 'image/webp' },
  };
  let current = 'compiti';
  function set(mode) {
    if (!Object.prototype.hasOwnProperty.call(states, mode)) return;
    current = mode;
    const state = states[mode];
    document.title = state.title;
    let icon = document.getElementById('tab-icon');
    if (!icon) {
      icon = document.createElement('link'); icon.id = 'tab-icon'; icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    icon.type = state.type; icon.href = state.icon;
  }
  root.TabState = { set, get: () => current };
  set('compiti');
})(typeof globalThis !== 'undefined' ? globalThis : window);
