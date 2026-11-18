const { createHash } = require('node:crypto');
const { createRedis } = require('../lib/redis.cjs');
const auth = require('../lib/panel.cjs');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (!['GET', 'POST'].includes(req.method)) throw auth.error(405, 'Metodo non consentito.');
    const settings = auth.config();
    let body = req.body || {};
    if (Number(req.headers['content-length'] || 0) > 200000) throw auth.error(413, 'Richiesta troppo grande.');
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { throw auth.error(400, 'JSON non valido.'); } }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw auth.error(400, 'Richiesta non valida.');
    if (Buffer.byteLength(JSON.stringify(body)) > 200000) throw auth.error(413, 'Richiesta troppo grande.');
    if (req.method === 'POST') {
      // Cookie authentication must not be usable by cross-site forms/fetches.
      const host = req.headers.host;
      let origin;
      try { origin = new URL(req.headers.origin).host; } catch {}
      if (!origin || origin !== host || !String(req.headers['content-type'] || '').startsWith('application/json')) throw auth.error(403, 'Origine della richiesta non valida.');
    }
    const store = createRedis();
    if (req.method === 'POST' && body.action === 'login') {
      const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
      if (!await store.limit('panel-login:' + createHash('sha256').update(ip).digest('hex'), 5)) throw auth.error(429, 'Troppi tentativi. Attendi un minuto.');
      if (typeof body.password !== 'string' || body.password.length > 1024 || !auth.equal(body.password, settings.password)) throw auth.error(401, 'Password errata.');
      res.setHeader('Set-Cookie', auth.cookie(auth.session(settings.secret), req));
      return res.status(200).json({ ok: true });
    }
    if (!auth.authenticated(req.headers.cookie, settings.secret)) throw auth.error(401, 'Accesso richiesto.');
    if (req.method === 'POST' && body.action === 'logout') {
      res.setHeader('Set-Cookie', auth.cookie('', req, true));
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'GET') return res.status(200).json((await auth.readContent(store)).data);
    if (body.action !== 'save') throw auth.error(400, 'Azione non valida.');
    const overrides = auth.validateOverrides(body.overrides);
    const { raw, data } = await auth.readContent(store);
    if (!Number.isInteger(body.version) || body.version !== data.version) throw auth.error(409, 'Testi modificati da un’altra scheda. Ricarica prima di salvare.');
    const next = { version: data.version + 1, overrides };
    if (!await store.contentCas(raw, JSON.stringify(next))) throw auth.error(409, 'Modifica simultanea: ricarica prima di salvare.');
    return res.status(200).json(next);
  } catch (error) {
    if (error.status === 429) res.setHeader('Retry-After', '60');
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Upstash non raggiungibile. Riprova.' });
  }
};
