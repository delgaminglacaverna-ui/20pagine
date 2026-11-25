// Do not load the playable app (or auto-join a match) before the shared homework pass.
(async function () {
  const container = document.getElementById('entry-root');
  const game = document.getElementById('boring-game');
  try {
    if (typeof EntryGate === 'undefined') throw Error('Gate unavailable');
    const passed = await EntryGate.start({ container, french: false });
    if (!passed) return;
    await import('/assets/boring.js');
    container.hidden = true;
    game.hidden = false;
  } catch {
    game.hidden = true;
    container.hidden = false;
    container.textContent = 'Impossibile caricare la prova di ingresso o il gioco. Ricarica la pagina.';
  }
})();
