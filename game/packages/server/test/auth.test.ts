import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Auth, AuthError } from '../src/auth';

describe('pro codes', () => {
  it('redeems a code once and proves the role with a token', () => {
    const auth = new Auth('secret', 'admin-key', null);
    const [code] = auth.createCodes(1, 30);
    expect(code).toMatch(/^KONT-30-[A-Z2-9]{8}-[0-9A-F]{8}$/);
    const { token, role } = auth.redeem(code.toLowerCase(), 'user-1');
    expect(role).toBe('pro');
    expect(auth.roleFromToken('user-1', token)).toBe('pro');
    expect(auth.roleFromToken('user-2', token)).toBeNull(); // tokens are bound to the user
    expect(() => auth.redeem(code, 'user-2')).toThrow(/already been used/);
  });

  it('rejects forged codes and codes signed with another secret', () => {
    const auth = new Auth('secret', null, null);
    const [code] = new Auth('other', null, null).createCodes(1, 0);
    expect(() => auth.redeem(code, 'u')).toThrow(AuthError);
    expect(() => auth.redeem('KONT-0-AAAAAAAA-00000000', 'u')).toThrow(/Invalid/);
    expect(auth.roleFromToken('u', 'admin.0.' + '0'.repeat(32))).toBeNull();
  });

  it('remembers used codes across restarts', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'kont-')), 'used.json');
    const [code] = new Auth('s', null, file).createCodes(1, 0);
    new Auth('s', null, file).redeem(code, 'a');
    expect(() => new Auth('s', null, file).redeem(code, 'b')).toThrow(/already been used/);
  });

  it('only accepts the right admin key', () => {
    const auth = new Auth('s', 'correct horse', null);
    expect(() => auth.adminLogin('wrong', 'me')).toThrow(/Wrong admin key/);
    const { token } = auth.adminLogin('correct horse', 'me');
    expect(auth.roleFromToken('me', token)).toBe('admin');
    expect(() => new Auth('s', null, null).adminLogin('', 'me')).toThrow();
  });
});
