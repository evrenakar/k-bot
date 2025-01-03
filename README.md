# Kosmos Vize Instagram Bot

Bu bot, @kosmosvize Instagram hesabındaki hikayeleri kontrol eder ve yeni bir hikaye paylaşıldığında otomatik olarak randevu formunu doldurur.

## Kurulum

1. Gerekli paketleri yükleyin:
```bash
yarn install
```

2. `.env` dosyasını düzenleyin:
- Instagram kullanıcı adı ve şifrenizi girin
- Kişisel bilgilerinizi ekleyin

3. Playwright browser'ı yükleyin:
```bash
npx playwright install chromium
```

## Çalıştırma

```bash
yarn start
```

Bot her 10 dakikada bir Instagram hikayelerini kontrol edecek ve yeni bir hikaye bulduğunda randevu formunu dolduracaktır.
