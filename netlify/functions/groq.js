exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { audioBase64, mimeType, ext } = JSON.parse(event.body);

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const boundary    = '----FormBoundary' + Math.random().toString(36).slice(2);
    const filename    = 'audio.' + (ext || 'webm');

    const partHeader = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType || 'audio/webm'}\r\n\r\n`
    );

    const fields = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3` +
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="language"\r\n\r\nko` +
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="response_format"\r\n\r\ntext` +
      `\r\n--${boundary}--\r\n`
    );

    const body = Buffer.concat([partHeader, audioBuffer, fields]);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length.toString()
      },
      body
    });

    const text = await response.text();

    if (!response.ok) {
      console.error('Groq error', response.status, text);
      return { statusCode: response.status, body: JSON.stringify({ error: text }) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: text };

  } catch (err) {
    console.error('Groq fn error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
