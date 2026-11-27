(function () {
  function mount() {
    const panel = document.createElement('details');
    panel.className = 'focus-mode-settings';
    const summary = document.createElement('summary');
    summary.textContent = 'Impostazioni schermo';
    const label = document.createElement('label');
    const toggle = document.createElement('input');
    toggle.type = 'checkbox'; toggle.setAttribute('role', 'switch');
    label.append(toggle, ' Schermo intero + conferma prima di uscire');
    const note = document.createElement('p');
    note.textContent = 'Esc disattiva questa modalità. Il browser può chiedere conferma quando chiudi o lasci la pagina; il messaggio non è personalizzabile.';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    panel.append(summary, label, note, status);
    document.body.append(panel);
    let enabled = false, pending = false;
    function beforeUnload(event) {
      if (!enabled) return;
      event.preventDefault(); event.returnValue = '';
    }
    function disable() {
      enabled = false; toggle.checked = false;
      window.removeEventListener('beforeunload', beforeUnload);
    }
    if (!document.documentElement.requestFullscreen || document.fullscreenEnabled === false) {
      toggle.disabled = true;
      status.textContent = 'Schermo intero non disponibile in questo browser o nella finestra di anteprima.';
    }
    toggle.addEventListener('change', async () => {
      if (pending) return;
      if (!toggle.checked) {
        disable();
        if (document.fullscreenElement) {
          try { await document.exitFullscreen(); } catch { status.textContent = 'Usa Esc per uscire dallo schermo intero.'; }
        }
        return;
      }
      pending = true; toggle.disabled = true; status.textContent = '';
      try {
        await document.documentElement.requestFullscreen();
        if (!document.fullscreenElement) { disable(); return; }
        enabled = true; toggle.checked = true;
        window.addEventListener('beforeunload', beforeUnload);
        status.textContent = 'Modalità attiva. Esc o lo switch la disattivano.';
      } catch {
        disable(); status.textContent = 'Impossibile attivare lo schermo intero. Nessuna conferma d’uscita attivata.';
      } finally { pending = false; toggle.disabled = false; }
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) { disable(); status.textContent = 'Modalità disattivata.'; }
    });
    // Never intercept Escape, open windows, or persist/re-enable this setting.
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
