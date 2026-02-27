// claude — thin proxy to the Anthropic Messages API.
// Forwards the request body as-is (model, messages, system, max_tokens, etc.)
// so the frontend can switch between Sonnet (translation) and Haiku (summary).

const { checkAuth } = require('./auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const authErr = checkAuth(event);
  if (authErr) return authErr;

  try {
    const body = JSON.parse(event.body);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    let response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    const data = await response.json();

    // Extract Anthropic rate-limit headers for frontend metrics dashboard
    const rl = {};
    for (const key of [
      'anthropic-ratelimit-requests-limit',
      'anthropic-ratelimit-requests-remaining',
      'anthropic-ratelimit-requests-reset',
      'anthropic-ratelimit-tokens-limit',
      'anthropic-ratelimit-tokens-remaining',
      'anthropic-ratelimit-tokens-reset'
    ]) {
      const val = response.headers.get(key);
      if (val !== null) rl[key] = val;
    }
    if (Object.keys(rl).length) data._rateLimit = rl;

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 500,
      body: JSON.stringify({ error: isTimeout ? 'Claude request timed out' : err.message })
    };
  }
};
