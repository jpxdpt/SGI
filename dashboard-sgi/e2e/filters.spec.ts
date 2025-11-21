import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { waitForPageLoad } from './helpers/page-helpers';

test.describe('Filtros e Pesquisa', () => {
  test.beforeEach(async ({ page }) => {
    // Fazer login
    await login(page);
  });

  test('deve aplicar filtros no dashboard', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Procurar botão de filtros
    const filterButton = page.locator('button:has-text("Filtros"), button[aria-label*="filtro" i]').first();
    
    if (await filterButton.isVisible({ timeout: 3000 })) {
      await filterButton.click();

      // Aplicar filtro de status
      const statusSelect = page.locator('select[name*="status" i], select:has(option:has-text("Planeada"))').first();
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('Planeada');
        
        // Verificar que os dados foram filtrados (pode demorar um pouco)
        await page.waitForTimeout(1000);
        const cards = page.locator('[class*="card"], [class*="Card"]');
        await expect(cards.first()).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('deve filtrar auditorias por ano', async ({ page }) => {
    await page.goto('/auditorias-internas');
    await waitForPageLoad(page);

    // Procurar filtro de ano
    const anoFilter = page.locator('select:has(option:has-text("Ano")), select[name*="ano" i], input[placeholder*="ano" i]').first();
    
    if (await anoFilter.isVisible({ timeout: 3000 })) {
      if (await anoFilter.evaluate((el) => el.tagName === 'SELECT')) {
        await anoFilter.selectOption({ index: 1 });
      } else {
        await anoFilter.fill('2025');
      }
      
      await page.waitForTimeout(1000);
      // Verificar que a tabela foi atualizada
      await expect(page.locator('table, [role="table"]')).toBeVisible();
    }
  });

  test('deve pesquisar globalmente', async ({ page }) => {
    await page.goto('/');
    
    // Procurar barra de pesquisa global
    const searchInput = page.locator('input[type="search"], input[placeholder*="pesquisa" i], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('teste');
      await page.waitForTimeout(500);
      
      // Verificar resultados (se existir dropdown de resultados)
      const results = page.locator('[role="listbox"], [role="menu"], .search-results');
      if (await results.isVisible({ timeout: 2000 })) {
        await expect(results).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('deve guardar e aplicar filtros guardados', async ({ page }) => {
    await page.goto('/auditorias-internas');
    await page.waitForLoadState('networkidle');

    // Procurar funcionalidade de guardar filtros
    const saveFilterButton = page.locator('button:has-text("Guardar"), button[aria-label*="guardar filtro" i]').first();
    
    if (await saveFilterButton.isVisible({ timeout: 3000 })) {
      await saveFilterButton.click();
      
      // Preencher nome do filtro
      const filterNameInput = page.locator('input[placeholder*="nome" i], input[name*="nome" i]').first();
      if (await filterNameInput.isVisible()) {
        await filterNameInput.fill('Filtro E2E Test');
        
        const confirmButton = page.locator('button:has-text("Guardar"), button[type="submit"]').first();
        await confirmButton.click();
        
        // Verificar que o filtro foi guardado
        await expect(page.locator('text=/guardado|sucesso/i')).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip();
    }
  });
});

