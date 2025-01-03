require("dotenv").config();
const { chromium } = require("playwright");
const cron = require("node-cron");

async function checkInstagramStory() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Instagram profiline git
    await page.goto("https://www.instagram.com/kosmosvize/");

    // Popup'ı kapatmak için bekle ve kapat
    try {
      // Sayfanın tam yüklenmesi için 10 saniye bekle
      console.log("Sayfa yükleniyor, 5 saniye bekleniyor...");
      await page.waitForTimeout(5000);

      // Login popup'ını bekle ve kapat butonuna tıkla
      await page.getByRole("button", { name: "Kapat" }).click();
      console.log("Popup kapatıldı");

      // Popup kapandıktan sonra biraz daha bekle
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log("Popup bulunamadı veya zaten kapalı:", e.message);
    }

    // Story kontrolü
    try {
      // Story çemberi elementini bul - header içinde ara
      const storyButton = page.locator(
        'header div[role="button"][style="cursor: pointer;"]'
      );
      const isExists = (await storyButton.count()) > 0;

      if (isExists) {
        console.log("Story butonu bulundu, tıklanıyor...");
        await storyButton.click();

        console.log("Hikaye bulundu! Randevu formunu dolduruyorum...");
        await fillAppointmentForm();
      } else {
        console.log("Story butonu bulunamadı");
      }
    } catch (e) {
      console.log("Story kontrolünde hata:", e.message);
    }
  } catch (error) {
    console.error("Hata:", error);
  } finally {
    await browser.close();
  }
}

async function fillAppointmentForm() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {    
    // Siteye git
    await page.goto('https://basvuru.kosmosvize.com.tr/appointmentform');
    await page.locator('#cities').press('Tab');
    await page.locator('span').filter({ hasText: 'Sonraki' }).press('Tab');
   
    await page.getByText('Sonraki').click();
   
    await page.locator('#cities').selectOption('Tekirdag');
    await page.locator('#buttonContainer').getByText('Edirne').click();
    await page.getByText('Sonraki').click();

    await page.locator('[id="__BVID__125"]').getByRole('combobox').selectOption('2');
    await page.locator('[id="__BVID__132"]').getByRole('combobox').selectOption('16');
    await page.locator('[id="__BVID__129"]').getByRole('combobox').selectOption('3');
    await page.locator('[id="__BVID__170"]').click();
    await page.locator('[id="__BVID__170"]').fill(process.env.TC_1);
    await page.locator('[id="__BVID__173"]').click();
    await page.locator('[id="__BVID__173"]').click();
    await page.locator('[id="__BVID__173"]').fill(process.env.TC_2);
    await page.locator('[id="__BVID__176"]').click();
    await page.locator('[id="__BVID__176"]').fill(process.env.TC_3);
    await page.getByLabel('2').locator('div').filter({ hasText: 'Başvuru Yapacak Kişi Sayısı*' }).nth(1).click();
    await page.getByText('Sonraki').click();
    await page.waitForTimeout(5000);
    console.log("Randevu formu başarıyla dolduruldu!");
  } catch (error) {
    console.error("Form doldurma hatası:", error);
  } finally {
    /* await browser.close(); */
  }
}

// Her 10 dakikada bir kontrol et
cron.schedule("*/10 * * * *", () => {
  console.log("Hikaye kontrolü yapılıyor...");
  checkInstagramStory();
});

// İlk kontrolü hemen yap
console.log("Bot başlatılıyor...");
checkInstagramStory();
