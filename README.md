# K-Bot

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

- cron: '*/10 6-13 * * 1-5'  # UTC 06:00-13:59 (Türkiye saati ile 09:00-16:59)