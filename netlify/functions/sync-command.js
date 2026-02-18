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

exports.handler = async (event) => {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'Upstash not configured' }) };

  try {
    if (event.httpMethod === 'POST') {
      const { command, id, value } = JSON.parse(event.body);
      await redis('SET', 'sermon:command', JSON.stringify({ command, id: id || Date.now(), value }));
      return { statusCode: 200, body: 'ok' };
    }

    if (event.httpMethod === 'GET') {
      const raw = await redis('GET', 'sermon:command');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: raw || JSON.stringify({ command: null })
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('sync-command error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
