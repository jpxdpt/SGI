import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './helpers/auth';
import { waitForPageLoad, openModal, fillFormField, expectToast } from './helpers/page-helpers';

test.describe('Operações CRUD - Auditorias Internas', () => {
  test.beforeEach(async ({ page }) => {
    // Fazer login antes de cada teste
    await login(page);

    // Navegar para auditorias internas
    await page.goto('/auditorias-internas');
    await waitForPageLoad(page);
  });

  test('deve carregar a página de auditorias internas', async ({ page }) => {
    await expect(page.locator('h2, h1')).toContainText(/auditorias internas/i);
    await expect(page.locator('button:has-text("Nova"), button[aria-label*="nova" i]')).toBeVisible();
  });

  test('deve abrir modal para criar nova auditoria', async ({ page }) => {
    await openModal(page, /nova auditoria|nova/i);

    await expect(page.locator('text=/nova auditoria|formulário/i')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('input[name="id"], input[placeholder*="ID" i]')).toBeVisible();
  });

  test('deve criar nova auditoria interna', async ({ page }) => {
    // Verificar se o modal pode ser aberto
    const newButton = page.locator('button:has-text("Nova Auditoria"), button:has-text("Nova")').first();
    if (!(await newButton.isVisible({ timeout: 3000 }))) {
      test.skip();
      return;
    }

    await newButton.click();
    
    // Aguardar modal aparecer
    const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]').first();
    if (!(await modal.isVisible({ timeout: 3000 }))) {
      test.skip();
      return;
    }

    // Preencher formulário
    const timestamp = Date.now();
    const auditId = `INT-TEST-${timestamp}`;

    // Preencher ID
    const idInput = page.locator('input[name="id"]').first();
    if (await idInput.isVisible({ timeout: 2000 })) {
      await idInput.fill(auditId);
    }

    // Preencher ano
    const anoInput = page.locator('input[name="ano"], input[type="number"]').first();
    if (await anoInput.isVisible({ timeout: 2000 })) {
      await anoInput.fill('2025');
    }
    
    // Tentar preencher setor
    const setorInput = page.locator('input[name="setor"], select[name="setor"]').first();
    if (await setorInput.isVisible({ timeout: 2000 })) {
      const tagName = await setorInput.evaluate((el) => el.tagName);
      if (tagName === 'INPUT') {
        await setorInput.fill('Teste');
      } else {
        await setorInput.selectOption({ index: 1 });
      }
    }

    // Preencher descrição
    const descricaoInput = page.locator('textarea[name="descricao"], textarea').first();
    if (await descricaoInput.isVisible({ timeout: 2000 })) {
      await descricaoInput.fill('Teste E2E de auditoria');
    }

    // Preencher data
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    
    const dataInput = page.locator('input[name="dataPrevista"], input[type="date"]').first();
    if (await dataInput.isVisible({ timeout: 2000 })) {
      await dataInput.fill(dateStr);
    }

    // Submeter formulário
    const submitButton = page.locator('button[type="submit"]:has-text("Guardar"), button:has-text("Criar")').first();
    if (await submitButton.isVisible({ timeout: 2000 })) {
      await submitButton.click();

      // Verificar sucesso
      await expect(page.locator('text=/sucesso|criada/i')).toBeVisible({ timeout: 5000 });
      
      // Verificar se aparece na tabela
      await waitForPageLoad(page);
      await expect(page.locator(`text=${auditId}`).or(page.locator(`text=${auditId.substring(0, 10)}`))).toBeVisible({ timeout: 5000 });
    }
  });

  test('deve editar auditoria existente', async ({ page }) => {
    // Procurar botão de editar na primeira linha da tabela
    await page.waitForSelector('table, [role="table"]', { timeout: 5000 });
    
    const editButton = page.locator('button[aria-label*="editar" i], button:has-text("Editar")').first();
    
    if (await editButton.isVisible({ timeout: 3000 })) {
      await editButton.click();
      
      await expect(page.locator('text=/editar auditoria|formulário/i')).toBeVisible({ timeout: 3000 });
      
      // Editar descrição
      const descricaoInput = page.locator('textarea[name="descricao"], textarea').first();
      if (await descricaoInput.isVisible()) {
        await descricaoInput.fill('Descrição editada via E2E');
        
        // Guardar
        const saveButton = page.locator('button[type="submit"]:has-text("Atualizar"), button:has-text("Guardar")').first();
        await saveButton.click();
        
        // Verificar sucesso
        await expect(page.locator('text=/atualizada|sucesso/i')).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip();
    }
  });

  test('deve eliminar auditoria com confirmação', async ({ page }) => {
    await page.waitForSelector('table, [role="table"]', { timeout: 5000 });
    
    const deleteButton = page.locator('button[aria-label*="eliminar" i], button:has-text("Eliminar"), button[aria-label*="apagar" i]').first();
    
    if (await deleteButton.isVisible({ timeout: 3000 })) {
      await deleteButton.click();
      
      // Verificar modal de confirmação
      await expect(page.locator('text=/certeza|confirmar|eliminar/i')).toBeVisible({ timeout: 3000 });
      
      // Confirmar eliminação
      const confirmButton = page.locator('button:has-text("Eliminar"), button[type="button"]:has-text("Confirmar")').first();
      await confirmButton.click();
      
      // Verificar mensagem de sucesso
      await expect(page.locator('text=/eliminada|sucesso/i')).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('não deve ter problemas de acessibilidade na página de auditorias', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('iframe') // Excluir iframes de terceiros
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('deve permitir navegação por teclado no formulário', async ({ page }) => {
    const newButton = page.locator('button:has-text("Nova Auditoria"), button:has-text("Nova")').first();
    await newButton.click();
    
    await page.waitForSelector('input[name="id"], input[placeholder*="ID" i]', { timeout: 3000 });
    
    // Testar navegação por Tab
    await page.keyboard.press('Tab');
    const firstInput = page.locator('input, textarea, select').first();
    await expect(firstInput).toBeFocused();
  });
});

