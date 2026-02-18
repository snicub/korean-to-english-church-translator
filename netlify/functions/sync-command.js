const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const store = getStore('sermon');

    if (event.httpMethod === 'POST') {
      const { command, id } = JSON.parse(event.body);
      await store.setJSON('command', { command, id: id || Date.now() });
      return { statusCode: 200, body: 'ok' };
    }

    if (event.httpMethod === 'GET') {
      const cmd = await store.get('command', { type: 'json' });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd || { command: null })
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('sync-command error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
