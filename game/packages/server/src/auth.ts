import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Role } from '@kontinentalist/engine';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I mix-ups
const DAY = 24 * 60 * 60 * 1000;

export class AuthError extends Error {}

/**
 * Pro codes and role tokens, both HMAC-signed with SECRET so nobody can forge them.
 * A code looks like KONT-30-7KQ2M9XA-3F9A1C0B: days of Pro (0 = unlimited), random id, signature.
 * A token proves a role for one user id and is kept in that user's browser.
 */
export class Auth {
  private used: Set<string>;

  constructor(
    private readonly secret: string,
    private readonly adminKey: string | null,
    private readonly usedCodesFile: string | null,
  ) {
    this.used = new Set(usedCodesFile && existsSync(usedCodesFile) ? JSON.parse(readFileSync(usedCodesFile, 'utf8')) : []);
  }

  private sig(payload: string, length: number): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex').slice(0, length).toUpperCase();
  }

  createCodes(count: number, days: number): string[] {
    const n = Math.max(1, Math.min(100, Math.floor(count)));
    const d = Math.max(0, Math.min(3650, Math.floor(days)));
    return Array.from({ length: n }, () => {
      const id = [...randomBytes(8)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
      return `KONT-${d}-${id}-${this.sig(`code|${d}|${id}`, 8)}`;
    });
  }

  /** Validates and burns a code; returns a Pro token for this user. */
  redeem(rawCode: string, userId: string): { token: string; role: Role } {
    const code = rawCode.trim().toUpperCase();
    const m = code.match(/^KONT-(\d{1,4})-([A-Z2-9]{8})-([0-9A-F]{8})$/);
    if (!m || !safeEqual(m[3], this.sig(`code|${m[1]}|${m[2]}`, 8))) throw new AuthError('Invalid code');
    if (this.used.has(m[2])) throw new AuthError('This code has already been used');
    this.used.add(m[2]);
    this.persistUsed();
    const days = Number(m[1]);
    const expires = days === 0 ? 0 : Date.now() + days * DAY;
    return { token: this.token(userId, 'pro', expires), role: 'pro' };
  }

  adminLogin(key: string, userId: string): { token: string; role: Role } {
    if (!this.adminKey || !safeEqual(key, this.adminKey)) throw new AuthError('Wrong admin key');
    return { token: this.token(userId, 'admin', Date.now() + 30 * DAY), role: 'admin' };
  }

  /** Role proven by a token, or null if the token is missing, forged, expired or for someone else. */
  roleFromToken(userId: string, token: string | undefined): Role | null {
    const m = token?.match(/^(admin|pro)\.(\d+)\.([0-9A-F]{32})$/);
    if (!m) return null;
    const [, role, expires] = m;
    if (!safeEqual(m[3], this.sig(`token|${userId}|${role}|${expires}`, 32))) return null;
    if (Number(expires) !== 0 && Number(expires) < Date.now()) return null;
    return role as Role;
  }

  private token(userId: string, role: Role, expires: number): string {
    return `${role}.${expires}.${this.sig(`token|${userId}|${role}|${expires}`, 32)}`;
  }

  private persistUsed() {
    if (!this.usedCodesFile) return;
    mkdirSync(dirname(this.usedCodesFile), { recursive: true });
    writeFileSync(this.usedCodesFile, JSON.stringify([...this.used]));
  }
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
