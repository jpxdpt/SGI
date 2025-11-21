import { test as base } from '@playwright/test';
import { login, logout } from './helpers/auth';

/**
 * Fixtures personalizadas para os testes E2E
 */
export const test = base.extend({
  // Fixture para página autenticada
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
    await logout(page);
  },
});

export { expect } from '@playwright/test';





