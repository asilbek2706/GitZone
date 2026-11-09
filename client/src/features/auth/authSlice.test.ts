import { describe, expect, it } from 'vitest';
import reducer, { loggedOut, setCredentials } from './authSlice';

const user = {
  id: '1', username: 'demo', email: 'demo@example.com', name: null, avatarUrl: null, bio: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('authSlice', () => {
  it('boshida holat noma’lum', () => {
    expect(reducer(undefined, { type: 'init' }).status).toBe('unknown');
  });

  it('setCredentials foydalanuvchini kiritadi', () => {
    const s = reducer(undefined, setCredentials({ user, accessToken: 'tok' }));
    expect(s.status).toBe('authenticated');
    expect(s.accessToken).toBe('tok');
  });

  it('loggedOut hammasini tozalaydi', () => {
    const s = reducer(reducer(undefined, setCredentials({ user, accessToken: 'tok' })), loggedOut());
    expect(s).toEqual({ user: null, accessToken: null, status: 'anonymous' });
  });
});
