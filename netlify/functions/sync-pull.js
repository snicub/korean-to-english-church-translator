const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const store = getStore('sermon');
    const since = parseInt(event.queryStringParameters?.since || '0');

    const [transcript, state] = await Promise.all([
      store.get('transcript', { type: 'json' }),
      store.get('state',      { type: 'json' })
    ]);

    const all     = transcript || [];
    const entries = since ? all.filter(e => e.id > since) : all;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, state: state || {} })
    };
  } catch (err) {
    console.error('sync-pull error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
