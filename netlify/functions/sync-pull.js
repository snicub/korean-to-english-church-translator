const UPSTASH_URL   = process.env.UPSTASH_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;

async function redisPipeline(...cmds) {
  const resp = await fetch(UPSTASH_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + UPSTASH_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  return (await resp.json()).map(r => r.result);
}

exports.handler = async (event) => {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'UPSTASH_URL / UPSTASH_TOKEN not set' }) };

  try {
    const since = parseInt(event.queryStringParameters?.since || '0');

    const [transcriptRaw, stateRaw] = await redisPipeline(
      ['GET', 'sermon:transcript'],
      ['GET', 'sermon:state']
    );

    const all     = transcriptRaw ? JSON.parse(transcriptRaw) : [];
    const entries = since ? all.filter(e => e.id > since) : all;
    const state   = stateRaw   ? JSON.parse(stateRaw)   : {};

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, state })
    };
  } catch (err) {
    console.error('sync-pull error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
