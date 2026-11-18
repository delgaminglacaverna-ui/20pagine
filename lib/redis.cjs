const TTL = 86400;
function createRedis(env = process.env, request = fetch) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) throw Object.assign(Error('Configura UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN su Vercel, poi esegui un nuovo deploy.'), { status: 503 });
  async function command(args) {
    const response = await request(url.replace(/\/$/, ''), {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Error('Redis request failed');
    const data = await response.json();
    if (data.error) throw Error('Redis command failed');
    return data.result;
  }
  const key = id => `20pagine:match:${id}`;
  return {
    contentGet: () => command(['GET', '20pagine:site-text:v1']),
    contentCas: (previous, next) => command(['EVAL', "local current=redis.call('GET',KEYS[1]); if (not current and ARGV[1]=='') or current==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2]); return 1 end; return 0", 1, '20pagine:site-text:v1', previous || '', next]),
    get: id => command(['GET', key(id)]),
    create: (id, value) => command(['SET', key(id), value, 'EX', TTL, 'NX']),
    // Compare the complete previous document atomically: only one concurrent writer wins.
    cas: (id, previous, next) => command(['EVAL', "if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1 end; return 0", 1, key(id), previous, next, TTL]),
    limit: async (key, maximum) => {
      const count = await command(['EVAL', "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n", 1, `20pagine:rate:${key}`]);
      return count <= maximum;
    },
  };
}
module.exports = { createRedis };
