import { Page, expect } from '@playwright/test';

/**
 * Helper para autenticação nos testes E2E
 */
export async function login(page: Page, email = 'admin@example.com', password = 'admin123') {
  await page.goto('/login');
  
  // Aguardar campos de input
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  await expect(passwordInput).toBeVisible({ timeout: 5000 });
  
  // Preencher credenciais
  await emailInput.fill(email);
  await passwordInput.fill(password);
  
  // Submeter formulário
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  // Verificar redirecionamento para dashboard
  await page.waitForURL(/\/(?:$|\?)/, { timeout: 10000 });
}

export async function logout(page: Page) {
  // Procurar botão de logout em vários locais possíveis
  const logoutSelectors = [
    'button:has-text("Sair")',
    'button:has-text("Logout")',
    'button[aria-label*="sair" i]',
    'button[aria-label*="logout" i]',
    'a:has-text("Sair")',
    'a:has-text("Logout")',
  ];

  for (const selector of logoutSelectors) {
    const logoutButton = page.locator(selector).first();
    if (await logoutButton.isVisible({ timeout: 2000 })) {
      await logoutButton.click();
      await page.waitForURL(/\/login/, { timeout: 5000 });
      return;
    }
  }

  // Se não encontrar, navegar diretamente para /login
  await page.goto('/login');
}

