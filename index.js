require("dotenv").config();
const { chromium } = require("playwright");
const cron = require("node-cron");
const axios = require("axios");
const { Solver } = require('2captcha');

const solver = new Solver(process.env.TWOCAPTCHA_API_KEY);

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

async function solveCaptcha(page) {
  try {
    console.log("Captcha çözülüyor...");
    
    // Sayfadaki reCAPTCHA elementini bul
    const siteKey = await page.evaluate(() => {
      // İframe içindeki site key'i bul
      const iframe = document.querySelector('iframe[src*="recaptcha"]');
      if (iframe) {
        const url = new URL(iframe.src);
        return url.searchParams.get('k');
      }
      
      // Div üzerindeki site key'i kontrol et
      const div = document.querySelector('.g-recaptcha');
      if (div) {
        console.log("Site key bulundu:", div.getAttribute('data-sitekey'));
        return div.getAttribute('data-sitekey');
      }
      
      // Sayfa kaynağında site key'i ara
      const scripts = document.getElementsByTagName('script');
      for (const script of scripts) {
        const match = script.textContent.match(/sitekey:\s*['"]([^'"]+)['"]/);
        if (match) {
          console.log("Site key bulundu:", match[1]);
          return match[1];
        }
      }
      
      return '6LcwI6ApAAAAAJPe3MGEqLsqUnijh45z0Jfvycg9'; // Yedek site key
    });

    if (!siteKey) {
      throw new Error("Site key bulunamadı!");
    }

    console.log("reCAPTCHA site key bulundu:", siteKey);

    // 2captcha API isteği hazırla
    const requestData = {
      clientKey: process.env.TWOCAPTCHA_API_KEY,
      task: {
        type: "RecaptchaV2TaskProxyless",
        websiteURL: await page.url(),
        websiteKey: siteKey,
        isInvisible: false
      }
    };

    // Görevi oluştur
    console.log("Captcha görevi oluşturuluyor...");
    const createTaskResponse = await axios.post('https://api.2captcha.com/createTask', requestData);

    if (createTaskResponse.data.errorId !== 0) {
      throw new Error(`2captcha hata: ${createTaskResponse.data.errorDescription}`);
    }

    const taskId = createTaskResponse.data.taskId;
    console.log("Görev oluşturuldu, ID:", taskId);

    // Sonucu bekle
    let captchaToken = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const resultResponse = await axios.post('https://api.2captcha.com/getTaskResult', {
        clientKey: process.env.TWOCAPTCHA_API_KEY,
        taskId: taskId
      });

      if (resultResponse.data.status === 'ready') {
        captchaToken = resultResponse.data.solution.gRecaptchaResponse;
        break;
      }

      if (resultResponse.data.errorId !== 0) {
        throw new Error(`2captcha hata: ${resultResponse.data.errorDescription}`);
      }

      console.log("Captcha henüz hazır değil, bekleniyor...");
    }

    if (!captchaToken) {
      throw new Error('Captcha çözümü zaman aşımına uğradı');
    }

    console.log("Captcha başarıyla çözüldü!");

    // Çözümü sayfaya uygula
    await page.evaluate((token) => {
      // reCAPTCHA v2 için
      const textarea = document.getElementById('g-recaptcha-response') || 
                      document.createElement('textarea');
      textarea.id = 'g-recaptcha-response';
      textarea.innerHTML = token;
      textarea.value = token;
      
      if (!document.getElementById('g-recaptcha-response')) {
        textarea.style.display = 'none';
        document.body.appendChild(textarea);
      }
      
      // Callback fonksiyonunu çağır
      if (typeof window.captchaCallback === 'function') {
        window.captchaCallback(token);
      }
    }, captchaToken);

    // Token uygulandıktan sonra kısa bir bekleme
    await page.waitForTimeout(2000);

    return true;
  } catch (error) {
    console.error("Captcha çözme hatası:", error);
    return false;
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
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    bypassCSP: true
  });
  const page = await context.newPage();
  

  try {
    console.log("Randevu formu dolduruluyor...");
    await page.goto('https://basvuru.kosmosvize.com.tr/appointmentform', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Sayfanın tam yüklenmesini bekle
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Form doldurma işlemleri
    await page.locator('#cities').press('Tab');
    await page.locator('span').filter({ hasText: 'Sonraki' }).press('Tab');
    await page.waitForTimeout(1000);
    
    await page.getByText('Sonraki').click();
    await page.waitForTimeout(2000);
   
    await page.locator('#cities').selectOption('Tekirdag');
    await page.locator('#buttonContainer').getByText('Edirne').click();
    await page.getByText('Sonraki').click();
    await page.waitForTimeout(2000);

    // Form elemanlarının yüklenmesini bekle
    await page.waitForSelector('[id="__BVID__125"]');
    await page.waitForSelector('[id="__BVID__132"]');
    await page.waitForSelector('[id="__BVID__129"]');

    await page.locator('[id="__BVID__125"]').getByRole('combobox').selectOption('2');
    await page.locator('[id="__BVID__132"]').getByRole('combobox').selectOption('16');
    await page.locator('[id="__BVID__129"]').getByRole('combobox').selectOption('3');

    await page.getByLabel('2').locator('div').filter({ hasText: 'Başvuru Yapacak Kişi Sayısı*' }).nth(1).click();
    
    // TC Kimlik numaralarını doldur
    console.log("TC Kimlik numaraları dolduruluyor...");
    for (const [fieldId, tcNo] of [
      ['__BVID__170', process.env.TC_1],
      ['__BVID__173', process.env.TC_2],
      ['__BVID__176', process.env.TC_3]
    ]) {
      await page.locator(`[id="${fieldId}"]`).click();
      await page.locator(`[id="${fieldId}"]`).fill(tcNo);
      await page.waitForTimeout(1000);
    }
    
    // Captcha çözme ve form gönderme
    console.log("Captcha çözülüyor...");
    const captchaSolved = await solveCaptcha(page);
    if (!captchaSolved) {
      throw new Error("Captcha çözülemedi!");
    }

    // Captcha çözüldükten sonra biraz bekle
    await page.waitForTimeout(3000);
    
    // Formu gönder
    await page.getByText('Sonraki').click();
    console.log("Form gönderildi, sonuç bekleniyor...");
    
    // Sonuç için bekle
    await page.waitForTimeout(5000);

    console.log("Randevu formu başarıyla dolduruldu!");    
  } catch (error) {
    console.error("Form doldurma hatası:", error);
  } finally {
    if (process.env.NODE_ENV !== 'development') {
      /* await browser.close(); */
      await page.getByText('Sonraki').click();
    }
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
  /* checkInstagramStory(); */
  /* if (isWorkingHours()) {
    console.log("Mesai saatleri içinde, hikaye kontrolü yapılıyor...");
    checkInstagramStory();
  } else {
    console.log("Mesai saatleri dışında, kontrol yapılmıyor.");
  } */
});

// İlk kontrolü hemen yap
console.log("Bot başlatılıyor...");
/* checkInstagramStory(); */
fillAppointmentForm();
