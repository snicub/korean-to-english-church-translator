// Shared auth check — validates x-admin-key header against ADMIN_SECRET env var.
// Returns null if valid, or a 401 response object if invalid.
function checkAuth(event) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    console.error('ADMIN_SECRET env var is not set — blocking all requests');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server auth not configured' }) };
  }
  const key = event.headers['x-admin-key'];
  if (key === secret) return null;
  return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
}

module.exports = { checkAuth };
