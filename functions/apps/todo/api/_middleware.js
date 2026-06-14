import { verifyJWT } from './_jwt.js';

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Allow auth endpoint through without token check
  if (url.pathname.endsWith('/api/auth')) {
    return context.next();
  }

  const authHeader = context.request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const valid = await verifyJWT(token, context.env.JWT_SECRET);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return context.next();
}
