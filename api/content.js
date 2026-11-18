const { createRedis } = require('../lib/redis.cjs');
const { readContent } = require('../lib/panel.cjs');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo non consentito.' });
  try {
    const { data } = await readContent(createRedis());
    return res.status(200).json(data);
  } catch {
    // The original copy is always usable when Redis is not configured/available.
    return res.status(503).json({ error: 'Testi personalizzati non disponibili.', overrides: {} });
  }
};
