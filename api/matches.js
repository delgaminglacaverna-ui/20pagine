const { createRedis } = require('../lib/redis.cjs');
const { createService } = require('../lib/matches.cjs');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    let body = req.body || {};
    if (Number(req.headers['content-length'] || 0) > 2048) return res.status(413).json({ error: 'Richiesta troppo grande.' });
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'JSON non valido.' }); }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Richiesta non valida.' });
    if (JSON.stringify(body).length > 2048) return res.status(413).json({ error: 'Richiesta troppo grande.' });
    const query = req.query || {};
    if (['id', 'action'].some(key => query[key] !== undefined && typeof query[key] !== 'string')) return res.status(400).json({ error: 'Percorso non valido.' });
    const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
    const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const data = await createService(createRedis())({ method: req.method, id: query.id, action: query.action, token, body, ip });
    return res.status(200).json(data);
  } catch (error) {
    const status = error.status || 503;
    if (status === 405) res.setHeader('Allow', 'GET, POST');
    if (status === 429) res.setHeader('Retry-After', '60');
    return res.status(status).json({ error: error.status ? error.message : 'Database non raggiungibile. Controlla la configurazione Upstash e riprova.', ...(error.state ? { state: error.state } : {}) });
  }
};
