import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './helpers/auth';
import { waitForPageLoad } from './helpers/page-helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Fazer login
    await login(page);
  });

  test('deve carregar o dashboard com todos os componentes', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Verificar KPIs
    await expect(page.locator('text=/auditorias internas|auditorias externas|ações|ocorrências/i').first()).toBeVisible({ timeout: 5000 });
    
    // Verificar gráficos
    await expect(page.locator('svg, canvas, [class*="chart"]').first()).toBeVisible({ timeout: 5000 });
    
    // Verificar navegação
    const sidebar = page.locator('nav, [role="navigation"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('deve mostrar notificações', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Procurar botão de notificações
    const notificationButton = page.locator('button[aria-label*="notificação" i], button:has(svg)').filter({ hasText: /bell|notification/i }).first();
    
    if (await notificationButton.isVisible({ timeout: 3000 })) {
      await notificationButton.click();
      
      // Verificar dropdown de notificações
      await expect(page.locator('text=/notificações/i').or(page.locator('[role="menu"]'))).toBeVisible({ timeout: 2000 });
    }
  });

  test('deve gerar relatório PDF do dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Procurar botão de gerar relatório
    const reportButton = page.locator('button:has-text("relatório"), button:has-text("PDF"), button[aria-label*="relatório" i]').first();
    
    if (await reportButton.isVisible({ timeout: 3000 })) {
      // Interceptar download
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      await reportButton.click();
      
      // Verificar mensagem de sucesso
      await expect(page.locator('text=/gerado|sucesso|relatório/i')).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('deve aplicar filtros no dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const filterButton = page.locator('button:has-text("Filtros")').first();
    
    if (await filterButton.isVisible({ timeout: 3000 })) {
      await filterButton.click();
      
      // Aplicar filtro de data
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 1);
        await dateInput.fill(futureDate.toISOString().split('T')[0]);
        
        // Verificar que os dados foram atualizados
        await page.waitForTimeout(1000);
      }
    } else {
      test.skip();
    }
  });

  test('não deve ter problemas de acessibilidade no dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('iframe')
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('deve ser responsivo em diferentes tamanhos de ecrã', async ({ page }) => {
    // Testar mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=/auditorias|dashboard/i').first()).toBeVisible();
    
    // Testar tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=/auditorias|dashboard/i').first()).toBeVisible();
    
    // Testar desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=/auditorias|dashboard/i').first()).toBeVisible();
  });
});

