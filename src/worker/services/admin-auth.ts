/**
 * Admin Authentication Service
 * Uses WebCrypto HMAC-SHA256 tokens with timestamp expiration and constant-time signature verification.
 * Avoids plaintext exposure of passwords and resists replay attacks.
 */

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

export async function signAdminToken(
  username: string,
  secret: string,
  expiresInHours: number = 12
): Promise<string> {
  if (!username || !secret) {
    throw new Error('Username and session secret are required to sign token');
  }

  const payload = {
    u: username.trim(),
    exp: Date.now() + expiresInHours * 60 * 60 * 1000
  };

  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadStr);

  const enc = new TextEncoder();
  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(encodedPayload));
  const sigArray = Array.from(new Uint8Array(signatureBuffer));
  const sigHex = sigArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${encodedPayload}.${sigHex}`;
}

export async function verifyAdminToken(
  token: string | null | undefined,
  secret: string | null | undefined,
  expectedUsername?: string
): Promise<{ valid: boolean; username?: string; expired?: boolean }> {
  try {
    if (!token || !secret) {
      return { valid: false };
    }

    const parts = token.trim().split('.');
    if (parts.length !== 2) {
      return { valid: false };
    }

    const [encodedPayload, sigHex] = parts;
    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson);

    if (!payload.u || !payload.exp || typeof payload.exp !== 'number') {
      return { valid: false };
    }

    // Check expiration
    if (Date.now() > payload.exp) {
      return { valid: false, expired: true };
    }

    // Check username if specified
    if (expectedUsername && payload.u !== expectedUsername.trim()) {
      return { valid: false };
    }

    const enc = new TextEncoder();
    const key = await getHmacKey(secret);

    // Convert hex signature back to bytes for WebCrypto verify
    const sigBytes = new Uint8Array(
      sigHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(encodedPayload));
    if (!isValid) {
      return { valid: false };
    }

    return { valid: true, username: payload.u };
  } catch {
    return { valid: false };
  }
}
