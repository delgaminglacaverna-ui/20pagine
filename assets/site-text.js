/* Text-only overrides: never insert HTML or touch game identifiers/classes. */
(function (root) {
  let overrides = Object.create(null), templates = [];
  function set(values) {
    overrides = Object.assign(Object.create(null), values || {});
    templates = Object.entries(overrides).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => {
      const parts = key.split(/(\{\d+\})/), slots = [];
      const pattern = parts.map(part => /^\{\d+\}$/.test(part)
        ? (slots.push(part), '(.+?)') : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
      return { pattern: new RegExp('^' + pattern + '$'), slots, value };
    });
  }
  function text(value) {
    if (typeof value !== 'string') return value;
    if (Object.hasOwn(overrides, value)) return overrides[value];
    for (const template of templates) {
      const match = value.match(template.pattern);
      if (match) return template.value.replace(/\{\d+\}/g, slot => match[template.slots.indexOf(slot) + 1] ?? slot);
    }
    return value;
  }
  async function load() {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch('/api/content', { signal: controller.signal, cache: 'no-store' });
      if (response.ok) set((await response.json()).overrides);
    } catch { /* Local games must work even if the content service is unavailable. */ }
    finally { clearTimeout(timeout); }
  }
  root.SiteText = { set, text, load };
})(typeof globalThis !== 'undefined' ? globalThis : window);
