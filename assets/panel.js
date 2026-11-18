'use strict';
const $ = id => document.getElementById(id);
let version = 0, overrides = Object.create(null), originals = [], dirty = false, busy = false;
function message(text, error = false) { $('message').textContent = text; $('message').className = error ? 'error' : ''; }
function setBusy(value) { busy = value; document.querySelectorAll('button, input, textarea').forEach(button => { button.disabled = value; }); }
async function api(body) {
  const response = await fetch('/api/panel', {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !body?.password) { $('login').hidden = false; $('editor').hidden = true; }
    throw Error(data.error || 'Errore del server.');
  }
  return data;
}
async function load() {
  const [data, response] = await Promise.all([api(), fetch('/assets/text-catalog.json', { cache: 'no-store' })]);
  if (!response.ok) throw Error('Catalogo testi non disponibile. Controlla il build.');
  const catalog = await response.json();
  version = data.version; overrides = Object.assign(Object.create(null), data.overrides);
  originals = [...new Set([...catalog, ...Object.keys(overrides)])].sort();
  dirty = false; $('login').hidden = true; $('editor').hidden = false; render();
}
function render() {
  const query = $('search').value.toLocaleLowerCase();
  const visible = originals.filter(key => (!$('only-changed').checked || Object.hasOwn(overrides, key)) && (key + ' ' + (overrides[key] ?? '')).toLocaleLowerCase().includes(query));
  $('count').textContent = `${visible.length} testi · ${Object.keys(overrides).length} personalizzati${dirty ? ' · modifiche non salvate' : ''}`;
  $('entries').replaceChildren();
  visible.forEach(key => {
    const row = document.createElement('div'); row.className = 'entry';
    const original = document.createElement('pre'); original.textContent = key;
    const label = document.createElement('label'); label.textContent = 'Testo visualizzato';
    const input = document.createElement('textarea'); input.value = overrides[key] ?? key; input.maxLength = 6000;
    input.setAttribute('aria-label', 'Modifica: ' + key);
    input.addEventListener('input', () => {
      if (input.value === key) delete overrides[key]; else overrides[key] = input.value;
      dirty = true; $('count').textContent = `${visible.length} testi · ${Object.keys(overrides).length} personalizzati · modifiche non salvate`;
    });
    const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Ripristina questo testo';
    reset.addEventListener('click', () => { delete overrides[key]; dirty = true; render(); });
    label.append(input); row.append(original, label, reset); $('entries').append(row);
  });
}
async function run(task) {
  if (busy) return;
  setBusy(true);
  try { await task(); } catch (error) { message(error.message, true); } finally { setBusy(false); }
}
$('login-form').addEventListener('submit', event => {
  event.preventDefault(); run(async () => {
    const password = $('password').value; $('password').value = '';
    await api({ action: 'login', password }); await load(); message('Accesso effettuato.');
  });
});
$('save').addEventListener('click', () => run(async () => {
  const data = await api({ action: 'save', version, overrides });
  version = data.version; overrides = Object.assign(Object.create(null), data.overrides); dirty = false;
  render(); message('Salvato. Ricarica il sito per vedere le modifiche.');
}));
$('reload').addEventListener('click', () => {
  if (!dirty || confirm('Scartare le modifiche non salvate?')) run(async () => { await load(); message('Testi ricaricati.'); });
});
$('reset').addEventListener('click', () => {
  if (confirm('Ripristinare tutti i testi? Premi Salva per confermare sul sito.')) { overrides = Object.create(null); dirty = true; render(); }
});
$('logout').addEventListener('click', () => {
  if (!dirty || confirm('Uscire senza salvare?')) run(async () => { await api({ action: 'logout' }); dirty = false; $('editor').hidden = true; $('login').hidden = false; $('entries').replaceChildren(); overrides = Object.create(null); message('Disconnesso.'); });
});
$('search').addEventListener('input', render); $('only-changed').addEventListener('change', render);
$('add-form').addEventListener('submit', event => {
  event.preventDefault(); const key = $('original').value; if (!key.trim()) return;
  if (!originals.includes(key)) originals.push(key);
  overrides[key] = $('replacement').value; dirty = true; $('search').value = key; $('only-changed').checked = false;
  $('add-form').reset(); render(); message('Aggiunto alla bozza. Premi Salva modifiche.');
});
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
run(async () => { try { await load(); } catch (error) { if (error.message !== 'Accesso richiesto.') throw error; } });
