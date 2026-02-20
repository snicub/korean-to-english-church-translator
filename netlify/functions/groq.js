// groq — sends base64 audio to Groq's Whisper Large v3 for Korean speech-to-text.
// Builds a multipart/form-data body manually (no FormData in Netlify Functions).
// Accepts an optional prompt (previous Korean text) for vocabulary priming.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { audioBase64, mimeType, ext, prompt } = JSON.parse(event.body);

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const boundary    = '----FormBoundary' + Math.random().toString(36).slice(2);
    const filename    = 'audio.' + (ext || 'webm');

    const partHeader = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType || 'audio/webm'}\r\n\r\n`
    );

    // Sanitize prompt: strip any \r or \n that would break multipart boundaries
    const safePrompt = prompt
      ? prompt.replace(/[\r\n]+/g, ' ').trim().slice(0, 400)
      : '';

    let fieldsStr =
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3` +
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="language"\r\n\r\nko` +
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="response_format"\r\n\r\ntext`;

    if (safePrompt) {
      fieldsStr +=
        `\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="prompt"\r\n\r\n${safePrompt}`;
    }

    fieldsStr += `\r\n--${boundary}--\r\n`;

    const fields = Buffer.from(fieldsStr);

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
