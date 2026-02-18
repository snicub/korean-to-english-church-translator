const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const store = getStore({ name: 'sermon', context });
    const { type, data } = JSON.parse(event.body);

    if (type === 'entry') {
      let transcript = await store.get('transcript', { type: 'json' }) || [];
      transcript.push(data);
      if (transcript.length > 500) transcript = transcript.slice(-500);
      await store.setJSON('transcript', transcript);

    } else if (type === 'state') {
      await store.setJSON('state', data);

    } else if (type === 'clear') {
      await Promise.all([
        store.setJSON('transcript', []),
        store.setJSON('state', { isListening: false, chunkMs: data.chunkMs })
      ]);
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('sync-push error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
