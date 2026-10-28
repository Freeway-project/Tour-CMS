import { describe, expect, it } from 'vitest';

import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  it('renders the login page without looping when not configured', () => {
    const result = adminGuard({
      path: '/admin/login',
      configured: false,
      userId: null,
      isAdmin: false,
    });
    expect(result).toEqual({ action: 'next' });
  });

  it('redirects to /admin/login when there is no user', () => {
    const result = adminGuard({
      path: '/admin',
      configured: true,
      userId: null,
      isAdmin: false,
    });
    expect(result).toEqual({ action: 'redirect', to: '/admin/login' });
  });

  it('redirects to not_admin when the user is not an admin', () => {
    const result = adminGuard({
      path: '/admin',
      configured: true,
      userId: 'user-1',
      isAdmin: false,
    });
    expect(result).toEqual({ action: 'redirect', to: '/admin/login?error=not_admin' });
  });

  it('lets an admin through', () => {
    const result = adminGuard({
      path: '/admin/tours',
      configured: true,
      userId: 'admin-1',
      isAdmin: true,
    });
    expect(result).toEqual({ action: 'next' });
  });

  it('lets /administrator and public pages through', () => {
    expect(adminGuard({ path: '/administrator', configured: false, userId: null, isAdmin: false })).toEqual({
      action: 'next',
    });
    expect(adminGuard({ path: '/', configured: false, userId: null, isAdmin: false })).toEqual({
      action: 'next',
    });
  });
});