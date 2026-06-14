import { signJWT } from './_jwt.js';

export async function onRequestPost(context) {
  try {
    const { pin } = await context.request.json();
    if (!pin) {
      return json({ error: 'PIN required' }, 400);
    }

    // Hash the incoming PIN with SHA-256 and compare to stored hash
    const pinHash = await sha256hex(String(pin));
    if (pinHash !== context.env.PIN_HASH) {
      return json({ error: 'Invalid PIN' }, 401);
    }

    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      { sub: 'owner', iat: now, exp: now + 30 * 24 * 60 * 60 },
      context.env.JWT_SECRET
    );

    return json({ token });
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
}

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
