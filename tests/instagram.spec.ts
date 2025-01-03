import { test, expect } from '@playwright/test';

test('instagram popup test', async ({ page }) => {
  await page.goto('https://www.instagram.com/kosmosvize/');
  
  // Sayfanın yüklenmesi için bekle
  await page.waitForTimeout(5000);
  
  // Buradan itibaren VSCode Playwright extension ile kayıt yapabilirsiniz
});
