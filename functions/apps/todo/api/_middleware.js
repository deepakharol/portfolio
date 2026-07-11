import { verifyJWT } from './_jwt.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Auth endpoints pass through without a token check
  if (
    url.pathname.endsWith('/api/auth') ||
    url.pathname.endsWith('/api/guest-auth') ||
    url.pathname.endsWith('/api/google-auth')
  ) {
    return context.next();
  }

  const authHeader = context.request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return json({ error: 'Unauthorized' }, 401);

  const payload = await verifyJWT(token, context.env.JWT_SECRET);
  if (!payload) return json({ error: 'Invalid or expired token' }, 401);

  // Expose role to all downstream route handlers via context.data
  context.data.isGuest = payload.role === 'guest';
  return context.next();
}
