import { Page, expect } from '@playwright/test';

/**
 * Helpers para interação com páginas
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

export async function clickButtonByText(page: Page, text: string | RegExp, options?: { timeout?: number }) {
  const button = page.locator(`button:has-text("${text}"), button[aria-label*="${text}" i]`).first();
  await expect(button).toBeVisible({ timeout: options?.timeout || 5000 });
  await button.click();
  return button;
}

export async function fillFormField(page: Page, fieldName: string, value: string) {
  const selectors = [
    `input[name="${fieldName}"]`,
    `textarea[name="${fieldName}"]`,
    `select[name="${fieldName}"]`,
    `input[placeholder*="${fieldName}" i]`,
    `textarea[placeholder*="${fieldName}" i]`,
  ];

  for (const selector of selectors) {
    const field = page.locator(selector).first();
    if (await field.isVisible({ timeout: 2000 })) {
      const tagName = await field.evaluate((el) => el.tagName);
      if (tagName === 'SELECT') {
        await field.selectOption(value);
      } else {
        await field.fill(value);
      }
      return;
    }
  }

  throw new Error(`Campo "${fieldName}" não encontrado`);
}

export async function expectToast(page: Page, message: string | RegExp, timeout = 5000) {
  const toast = page.locator(`text=${message}`).or(page.locator('[role="alert"]')).first();
  await expect(toast).toBeVisible({ timeout });
}

export async function openModal(page: Page, buttonText: string | RegExp) {
  let button;
  if (buttonText instanceof RegExp) {
    button = page.locator(`button:has-text(${buttonText}), button[aria-label*="${buttonText.source}" i]`).first();
  } else {
    button = page.locator(`button:has-text("${buttonText}"), button[aria-label*="${buttonText}" i]`).first();
  }
  await expect(button).toBeVisible({ timeout: 5000 });
  await button.click();
  
  // Aguardar modal aparecer
  await page.waitForTimeout(500);
  
  // Verificar que algum modal/dialog apareceu
  const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]').first();
  await expect(modal).toBeVisible({ timeout: 3000 });
  return modal;
}

