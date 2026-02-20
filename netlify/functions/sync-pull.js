// sync-pull — single endpoint that returns ALL shared state from Redis.
// Both the laptop (every 3 s) and phone (every 1.5 s) poll this one URL.
// Returns: transcript entries, session state, edits, typography, and the
// latest remote command — so the laptop needs only ONE fetch per poll cycle.

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
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'Upstash not configured' }) };

  try {
    const since      = parseInt(event.queryStringParameters?.since      || '0');
    const sinceEdit  = parseInt(event.queryStringParameters?.sinceEdit  || '0');

    // Single pipeline: 5 keys in one Redis round-trip
    const [transcriptRaw, stateRaw, editsRaw, typoRaw, commandRaw] = await redisPipeline(
      ['GET', 'sermon:transcript'],
      ['GET', 'sermon:state'],
      ['GET', 'sermon:edits'],
      ['GET', 'sermon:typo'],
      ['GET', 'sermon:command']
    );

    const all     = transcriptRaw ? JSON.parse(transcriptRaw) : [];
    const entries = since ? all.filter(e => e.id > since) : all;
    const state   = stateRaw ? JSON.parse(stateRaw) : {};

    const editsMap = editsRaw ? JSON.parse(editsRaw) : {};
    const edits = Object.entries(editsMap)
      .filter(([, edit]) => edit.id > sinceEdit)
      .map(([entryId, edit]) => ({ ...edit, entryId: parseInt(entryId) }));

    const typo    = typoRaw    ? JSON.parse(typoRaw)    : null;
    const command = commandRaw ? JSON.parse(commandRaw) : null;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, state, edits, typo, command })
    };
  } catch (err) {
    console.error('sync-pull error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
