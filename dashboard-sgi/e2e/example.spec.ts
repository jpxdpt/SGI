import { test, expect } from '@playwright/test';

/**
 * Teste de exemplo para verificar se o Playwright está configurado corretamente
 * Este ficheiro pode ser removido após confirmar que os outros testes estão a funcionar
 */
test('exemplo de teste básico', async ({ page }) => {
  await page.goto('/');
  
  // Verificar se a página carrega
  await expect(page).toHaveURL(/\/$|\/login/);
});





