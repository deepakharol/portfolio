import { signJWT } from './_jwt.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// POST /apps/todo/api/guest-auth
// Issues a 1-hour guest JWT — no PIN required.
// Guest sessions share a single demo sandbox (all guests see each other's demo tasks).
export async function onRequestPost({ env }) {
  const now = Math.floor(Date.now() / 1000);
  const token = await signJWT(
    { sub: 'guest', role: 'guest', iat: now, exp: now + 3600 },
    env.JWT_SECRET
  );
  return json({ token, role: 'guest', expiresIn: 3600 });
}
