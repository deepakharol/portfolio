import { signJWT } from './_jwt.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

// Verify a Google ID token (JWT signed by Google's RSA keys)
// We verify by fetching Google's public keys and checking the RS256 signature.
async function verifyGoogleToken(credential, clientId) {
  try {
    const parts = credential.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(base64urlDecode(parts[0]));
    const payload = JSON.parse(base64urlDecode(parts[1]));

    // Basic claim checks before fetching keys
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.aud !== clientId) return null;
    if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') return null;

    // Fetch Google's public keys
    const certsRes = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    const { keys } = await certsRes.json();
    const jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) return null;

    // Import the RSA public key
    const pubKey = await crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    );

    // Verify signature
    const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const dataBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pubKey, sigBytes, dataBytes);
    if (!valid) return null;

    return payload;
  } catch {
    return null;
  }
}

// POST /apps/todo/api/google-auth
// Body: { credential: "<google-id-token>" }
// Returns same 30-day JWT as POST /auth if the Google account matches OWNER_EMAIL.
export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { credential } = body;
  if (!credential) return json({ error: 'credential required' }, 400);

  const clientId = env.GOOGLE_CLIENT_ID;
  const ownerEmail = env.OWNER_EMAIL;
  if (!clientId || !ownerEmail) return json({ error: 'Google auth not configured' }, 500);

  const payload = await verifyGoogleToken(credential, clientId);
  if (!payload) return json({ error: 'Invalid Google token' }, 401);

  if (payload.email !== ownerEmail || !payload.email_verified) {
    return json({ error: 'Unauthorized Google account' }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signJWT(
    { sub: 'owner', iat: now, exp: now + 30 * 24 * 3600 },
    env.JWT_SECRET
  );

  return json({ token });
}
