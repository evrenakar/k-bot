require("dotenv").config();
const { chromium } = require("playwright");
const cron = require("node-cron");
const axios = require("axios");

async function sendTelegramMessage(message) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Telegram mesajı gönderilemedi:', error);
  }
}

async function checkInstagramStory() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Instagram profiline git
    /* await page.goto("https://www.instagram.com/kosmosvize/"); */
    await page.goto("https://www.instagram.com/trakyasinirkapilari/");

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
      const storyExists = (await storyButton.count()) > 0;

      if (storyExists) {
        console.log("Yeni hikaye bulundu!");
        await sendTelegramMessage("🔔 <b>Yeni Hikaye Paylaşıldı!</b>\n\nRandevu formu otomatik olarak dolduruluyor...");
        /* await fillAppointmentForm(); */
      } else {
        console.log("Henüz yeni hikaye yok.");
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
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
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

// Mesai saatlerini kontrol et (09:00-16:59)
function isWorkingHours() {
  const now = new Date();
  const hours = now.getHours();
  const day = now.getDay();
  
  // Hafta içi mi? (1-5 arası, Pazartesi-Cuma)
  const isWeekday = day >= 1 && day <= 5;
  // Mesai saatleri içinde mi? (09:00-16:59)
  const isDuringWorkHours = hours >= 9 && hours < 17;
  
  return isWeekday && isDuringWorkHours;
}

// Her 10 dakikada bir kontrol et
cron.schedule("*/10 * * * *", () => {
  checkInstagramStory();
  /* if (isWorkingHours()) {
    console.log("Mesai saatleri içinde, hikaye kontrolü yapılıyor...");
    checkInstagramStory();
  } else {
    console.log("Mesai saatleri dışında, kontrol yapılmıyor.");
  } */
});

// İlk kontrolü hemen yap
console.log("Bot başlatılıyor...");
checkInstagramStory();
