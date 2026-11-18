const { createHash, createHmac, timingSafeEqual, randomBytes } = require('node:crypto');
const COOKIE = 'panel_session';
const error = (status, message) => Object.assign(Error(message), { status });
function config(env = process.env) {
  if (!env.PANEL_PASSWORD || !env.PANEL_SESSION_SECRET || env.PANEL_SESSION_SECRET.length < 32)
    throw error(503, 'Configura PANEL_PASSWORD e PANEL_SESSION_SECRET (almeno 32 caratteri) su Vercel.');
  // Password changes revoke all existing sessions, without storing passwords in cookies.
  return { password: env.PANEL_PASSWORD, secret: createHmac('sha256', env.PANEL_SESSION_SECRET).update(env.PANEL_PASSWORD).digest() };
}
function equal(a, b) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}
function sign(payload, secret) { return createHmac('sha256', secret).update(payload).digest('base64url'); }
function session(secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ expires: now + 8 * 3600000, nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}
function authenticated(cookie, secret, now = Date.now()) {
  const token = String(cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!token || token.length > 1024) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !equal(signature, sign(payload, secret))) return false;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString()); return Number.isFinite(data.expires) && data.expires > now; } catch { return false; }
}
function cookie(value, req, remove = false) {
  const secure = process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https';
  return `${COOKIE}=${value}; Path=/api/panel; HttpOnly; SameSite=Strict; Max-Age=${remove ? 0 : 28800}${secure ? '; Secure' : ''}`;
}
function validateOverrides(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length > 1500) throw error(400, 'Elenco testi non valido.');
  const result = Object.create(null);
  for (const [key, value] of Object.entries(input)) {
    if (!key || key.length > 3000 || typeof value !== 'string' || value.length > 6000 || ['__proto__', 'constructor', 'prototype'].includes(key)) throw error(400, 'Testo non valido o troppo lungo.');
    const slots = text => (text.match(/\{\d+\}/g) || []).sort().join(',');
    if ((key.match(/\{\d+\}/g) || []).length > 12) throw error(400, 'Troppi segnaposto.');
    if (slots(key) !== slots(value)) throw error(400, 'Mantieni tutti i segnaposto {0}, {1}, ecc.');
    if (value !== key) result[key] = value;
  }
  return result;
}
async function readContent(store) {
  const raw = await store.contentGet();
  return { raw, data: raw ? JSON.parse(raw) : { version: 0, overrides: {} } };
}
module.exports = { config, equal, session, authenticated, cookie, validateOverrides, readContent, error };
