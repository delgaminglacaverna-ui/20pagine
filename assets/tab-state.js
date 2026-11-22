(function (root) {
  const states = {
    compiti: { title: 'HAI FATTO I COMPITI???', icon: '/assets/eyes/frame-1.webp', type: 'image/webp' },
    chess: { title: 'TEMPO ESTREMO COME IL DIH', icon: '/assets/tabs/pawn.svg', type: 'image/svg+xml' },
    french: { title: '(gbfjkdfugyfhdjk)/', icon: '/assets/tabs/cigarette.svg', type: 'image/svg+xml' },
    review: { title: 'NON SI FANNO I COMPITI IN CLASSE!!', icon: '/assets/closed-eyes/frame-1.webp', type: 'image/webp' },
    enraged: { title: 'IO SAREI MORTIFICATO, NON PROVI VERGOGNA', icon: '/assets/mouths/frame-1.webp', type: 'image/webp' },
  };
  const frenchTitles = {
    compiti: "MIO FIGLIO HA STUDIATO L'INGLESE E LAVORA IN FRANCIA",
    review: 'perchè è tutto blanc',
    enraged: 'los tempos es bellos hahahas',
  };
  const french = typeof root.URLSearchParams === 'function'
    && new root.URLSearchParams(root.location?.search || '').get('version') === 'french';
  let current = 'compiti';
  function set(mode) {
    if (!Object.prototype.hasOwnProperty.call(states, mode)) return;
    current = mode;
    const state = states[mode];
    document.title = french && Object.prototype.hasOwnProperty.call(frenchTitles, mode) ? frenchTitles[mode] : state.title;
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
