import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login, logout } from './helpers/auth';

test.describe('Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página de login
    await page.goto('/login');
  });

  test('deve carregar a página de login corretamente', async ({ page }) => {
    await expect(page).toHaveTitle(/SGI|Login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('deve validar campos obrigatórios', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verificar mensagens de erro
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.fill('input[type="email"]', 'teste@teste.com');
    await page.fill('input[type="password"]', 'senha-errada');
    await page.click('button[type="submit"]');

    // Esperar mensagem de erro
    await expect(page.locator('text=/credenciais|inválido|erro/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    // Usar helper de login
    await login(page);

    // Verificar redirecionamento para dashboard
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    await expect(page.locator('text=/dashboard|bem-vindo/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve permitir logout', async ({ page }) => {
    // Fazer login primeiro
    await login(page);
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    // Fazer logout usando helper
    await logout(page);
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('não deve ter problemas de acessibilidade na página de login', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('deve navegar por teclado na página de login', async ({ page }) => {
    await page.keyboard.press('Tab');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused();

    await page.keyboard.press('Tab');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeFocused();

    await page.keyboard.press('Tab');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeFocused();

    // Testar Enter para submeter
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/$/, { timeout: 5000 });
  });
});

