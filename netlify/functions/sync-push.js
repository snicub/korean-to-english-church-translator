// sync-push — writes to Redis. Handles 6 types:
//   entry     → append a translated segment to the transcript (capped at 500)
//   state     → update session state (isListening, isMuted, chunkMs)
//   editEntry → store an inline text correction (keyed by entryId)
//   typo      → update typography settings (fontSize, lineHeight, scrollSpeed, chunkMs, sermonTitle)
//   heartbeat → remote/viewer device presence (keyed by deviceId, 30s TTL)
//   clear     → wipe transcript + edits, reset state

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

const { checkAuth } = require('./auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'Upstash not configured' }) };

  try {
    const { type, data } = JSON.parse(event.body);

    // Heartbeat is allowed without auth (viewer is public)
    if (type !== 'heartbeat') {
      const authErr = checkAuth(event);
      if (authErr) return authErr;
    }

    if (type === 'entry') {
      const raw = await redis('GET', 'sermon:transcript');
      let transcript = raw ? JSON.parse(raw) : [];
      transcript.push(data);
      if (transcript.length > 500) transcript = transcript.slice(-500);
      // 6-hour TTL — auto-expire old sermon data
      await redis('SET', 'sermon:transcript', JSON.stringify(transcript), 'EX', 21600);

    } else if (type === 'state') {
      await redis('SET', 'sermon:state', JSON.stringify(data), 'EX', 21600);

    } else if (type === 'editEntry') {
      // Store latest edit per entryId (object keyed by entryId)
      const raw = await redis('GET', 'sermon:edits');
      const edits = raw ? JSON.parse(raw) : {};
      edits[String(data.entryId)] = { id: data.id, sentences: data.sentences };
      await redis('SET', 'sermon:edits', JSON.stringify(edits), 'EX', 21600);

    } else if (type === 'typo') {
      await redis('SET', 'sermon:typo', JSON.stringify(data), 'EX', 21600);

    } else if (type === 'context') {
      // Persist sermon context for session recovery (recentSegments, sermonSummary, etc.)
      await redis('SET', 'sermon:context', JSON.stringify(data), 'EX', 21600);

    } else if (type === 'heartbeat') {
      // Store device presence with 30s TTL per device
      const deviceId = data.deviceId || 'unknown';
      await redis('SET', 'sermon:hb:' + deviceId, JSON.stringify({ type: data.type || 'remote', ts: Date.now() }), 'EX', 30);

    } else if (type === 'clear') {
      await redisPipeline(
        ['SET', 'sermon:transcript', '[]'],
        ['SET', 'sermon:state', JSON.stringify({ isListening: false, chunkMs: data.chunkMs, clearedAt: data.clearedAt || Date.now() })],
        ['DEL', 'sermon:edits'],
        ['DEL', 'sermon:context']
      );
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('sync-push error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
