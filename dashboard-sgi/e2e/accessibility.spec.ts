import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade (a11y)', () => {
  const pages = [
    { name: 'Dashboard', path: '/' },
    { name: 'Auditorias Internas', path: '/auditorias-internas' },
    { name: 'Auditorias Externas', path: '/auditorias-externas' },
    { name: 'Ações', path: '/acoes' },
    { name: 'Ocorrências', path: '/ocorrencias' },
    { name: 'Cadastro', path: '/cadastro' },
    { name: 'Logs', path: '/logs' },
    { name: 'Configurações', path: '/configuracoes' },
  ];

  test.beforeEach(async ({ page }) => {
    // Fazer login antes de testar páginas protegidas
    await page.goto('/login');
    
    // Tentar fazer login se a página existir
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill('admin@example.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/$|\/login/, { timeout: 5000 });
    }
  });

  for (const { name, path } of pages) {
    test(`página "${name}" deve passar testes de acessibilidade`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .exclude('iframe') // Excluir iframes de terceiros
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
        .analyze();

      // Se houver violações, mostrar detalhes
      if (accessibilityScanResults.violations.length > 0) {
        console.log(`Violações encontradas em ${name}:`, accessibilityScanResults.violations);
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('todos os botões devem ter labels acessíveis', async ({ page }) => {
    await page.goto('/auditorias-internas');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute('aria-label');
      const hasTitle = await button.getAttribute('title');
      const isHidden = await button.evaluate((el) => el.hasAttribute('aria-hidden'));

      // Botões devem ter texto, aria-label, ou title (exceto se estiverem ocultos)
      if (!isHidden) {
        expect(hasText || hasAriaLabel || hasTitle).toBeTruthy();
      }
    }
  });

  test('todos os inputs devem ter labels associados', async ({ page }) => {
    await page.goto('/auditorias-internas');
    await page.waitForLoadState('networkidle');

    // Abrir modal de nova auditoria
    const newButton = page.locator('button:has-text("Nova Auditoria"), button:has-text("Nova")').first();
    if (await newButton.isVisible({ timeout: 3000 })) {
      await newButton.click();
      await page.waitForTimeout(1000);

      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 10); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');

        // Input deve ter id com label associado, aria-label, ou aria-labelledby
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.isVisible();
          expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
        } else {
          expect(ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test('imagens devem ter alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const isDecorative = await img.getAttribute('aria-hidden') === 'true' || 
                          await img.getAttribute('role') === 'presentation';

      // Imagens devem ter alt (ou ser marcadas como decorativas)
      if (!isDecorative) {
        expect(alt).not.toBeNull();
      }
    }
  });

  test('deve suportar navegação por teclado completa', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Testar Tab navigation
    await page.keyboard.press('Tab');
    const firstFocusable = page.locator(':focus');
    await expect(firstFocusable).toBeVisible();

    // Testar navegação entre elementos focáveis
    let focusableElements = 0;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      if (await focused.isVisible()) {
        focusableElements++;
      } else {
        break;
      }
    }

    expect(focusableElements).toBeGreaterThan(0);
  });

  test('deve ter contraste de cores adequado', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Filtrar apenas violações de contraste
    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
    );

    expect(contrastViolations).toEqual([]);
  });
});





