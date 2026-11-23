const { explain } = require('../lib/coach.cjs');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({ error: 'JSON richiesto.' });
  let origin;
  try { origin = new URL(req.headers.origin).host; } catch {}
  if (!origin || origin !== req.headers.host) return res.status(403).json({ error: 'Origine non valida.' });
  try {
    if (Number(req.headers['content-length'] || 0) > 50000) return res.status(413).json({ error: 'Richiesta troppo grande.' });
    let body = req.body;
    if (typeof body === 'string') {
      if (Buffer.byteLength(body) > 50000) return res.status(413).json({ error: 'Richiesta troppo grande.' });
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'JSON non valido.' }); }
    }
    if (Buffer.byteLength(JSON.stringify(body) || '') > 50000) return res.status(413).json({ error: 'Richiesta troppo grande.' });
    const ip = String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
    return res.status(200).json(await explain(body, ip));
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Spiegazione non disponibile.' });
  }
};
