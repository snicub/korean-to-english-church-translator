const UPSTASH_URL   = process.env.UPSTASH_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;

async function redis(...cmd) {
  const resp = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + UPSTASH_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  return (await resp.json()).result;
}

async function redisPipeline(...cmds) {
  const resp = await fetch(UPSTASH_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + UPSTASH_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  return (await resp.json()).map(r => r.result);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'UPSTASH_URL / UPSTASH_TOKEN not set' }) };

  try {
    const { type, data } = JSON.parse(event.body);

    if (type === 'entry') {
      const raw = await redis('GET', 'sermon:transcript');
      let transcript = raw ? JSON.parse(raw) : [];
      transcript.push(data);
      if (transcript.length > 500) transcript = transcript.slice(-500);
      await redis('SET', 'sermon:transcript', JSON.stringify(transcript));

    } else if (type === 'state') {
      await redis('SET', 'sermon:state', JSON.stringify(data));

    } else if (type === 'clear') {
      await redisPipeline(
        ['SET', 'sermon:transcript', '[]'],
        ['SET', 'sermon:state', JSON.stringify({ isListening: false, chunkMs: data.chunkMs })]
      );
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('sync-push error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
