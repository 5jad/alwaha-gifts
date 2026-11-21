import { describe, it, expect } from 'vitest';
import { signAdminToken, verifyAdminToken } from '../src/worker/services/admin-auth';

describe('Admin HMAC-SHA256 Authentication', () => {
  const secret = 'test-secret-key-12345678901234567890';
  const username = 'admin';

  it('signs and verifies a valid token successfully', async () => {
    const token = await signAdminToken(username, secret, 12);
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const verification = await verifyAdminToken(token, secret, username);
    expect(verification.valid).toBe(true);
    expect(verification.username).toBe(username);
  });

  it('rejects tampered payload', async () => {
    const token = await signAdminToken(username, secret, 12);
    const [, sig] = token.split('.');
    
    // Tamper payload to impersonate root
    const tamperedPayload = btoa(JSON.stringify({ u: 'root', exp: Date.now() + 100000 }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const tamperedToken = `${tamperedPayload}.${sig}`;

    const verification = await verifyAdminToken(tamperedToken, secret);
    expect(verification.valid).toBe(false);
  });

  it('rejects tampered signature', async () => {
    const token = await signAdminToken(username, secret, 12);
    const [payload, sig] = token.split('.');
    const tamperedSig = sig.slice(0, -2) + 'ff';
    const tamperedToken = `${payload}.${tamperedSig}`;

    const verification = await verifyAdminToken(tamperedToken, secret);
    expect(verification.valid).toBe(false);
  });

  it('rejects wrong secret', async () => {
    const token = await signAdminToken(username, secret, 12);
    const verification = await verifyAdminToken(token, 'different-wrong-secret', username);
    expect(verification.valid).toBe(false);
  });

  it('detects expired tokens', async () => {
    // Generate token that expired 1 hour ago (-1)
    const expiredToken = await signAdminToken(username, secret, -1);
    const verification = await verifyAdminToken(expiredToken, secret, username);
    expect(verification.valid).toBe(false);
    expect(verification.expired).toBe(true);
  });

  it('rejects when username does not match expected username', async () => {
    const token = await signAdminToken('otheruser', secret, 12);
    const verification = await verifyAdminToken(token, secret, 'admin');
    expect(verification.valid).toBe(false);
  });
});
