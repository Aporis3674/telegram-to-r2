# 🤖 ربات تلگرام برای آپلود فایل روی Backblaze B2

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Backblaze B2](https://img.shields.io/badge/Backblaze-B2-E2231A?style=for-the-badge&logo=backblaze&logoColor=white)](https://www.backblaze.com/b2)
[![grammY](https://img.shields.io/badge/grammY-Framework-32ADFF?style=for-the-badge&logo=telegram&logoColor=white)](https://grammy.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> 🇬🇧 [نسخه انگلیسی / English Version](./README.md)

---

## 📌 این پروژه چیه؟

یه **بات تلگرام** هست که فایل‌هاتو (عکس، ویدیو، آهنگ، فایل) رو روی فضای ابری رایگان **Backblaze B2** ذخیره می‌کنه. کل پروژه روی **Cloudflare Workers** اجرا میشه.

**یعنی چی؟** یه "فضای ابری شخصی" داری که فقط با فرستادن فایل به بات تلگرام، فایل‌هات آپلود میشن و یه لینک دانلود برمیگرده.

> ⭐ این پروژه یه **فورک** از [fwqaaq/telegram-to-r2](https://github.com/fwqaaq/telegram-to-r2) هست — ساخته شده توسط [@fwqaaq](https://github.com/fwqaaq)

### تفاوت‌ها با پروژه اصلی

| موضوع | پروژه اصلی (R2) | این فورک (B2) |
|---|---|---|
| **فضای ذخیره‌سازی** | Cloudflare R2 (نیاز به کارت بانکی) | Backblaze B2 (**بدون کارت بانکی**) |
| **لینک فایل‌ها** | مستقیم از R2 | از طریق خود Worker |
| **مخفی‌کاری** | ❌ نداره | ✅ مخفی شدن از Cloudflare |
| **مسیر وبهوک** | `/` (ریشه) | `/tg/hook` (مسیر مخفی) |

---

## ✨ امکانات

- 📤 **آپلود خودکار** — فایل به بات بفرست، خودش آپلود میشه و لینک دانلود برمیگرده
- 📂 **دسته‌بندی هوشمند** — فایل‌ها بر اساس نوع جدا میشن:
  - 🎵 `music` — آهنگ‌ها
  - 🖼️ `images` — عکس‌ها
  - 🎬 `videos` — ویدیوها
  - 📄 `documents` — سایر فایل‌ها
- 🔍 **لیست فایل‌ها** — با دستور `/list` همه فایل‌هاتو ببین
- 🗑️ **حذف فایل** — با دستور `/delete` فایل حذف کن
- 🛡️ **کنترل دسترسی** — ادمین میتونه کاربران رو بلاک/آن‌بلاک کنه
- 🎭 **حالت مخفی** — اسکنرهای Cloudflare نمیفهمن این ورکر برای باته

---

## 🛠️ پیش‌نیازها

- اکانت **Backblaze** (رایگان، بدون کارت بانکی)
- اکانت **Cloudflare** (رایگان)
- **Node.js** و **pnpm** روی سیستمت
- یه **بات تلگرام** (از [@BotFather](https://t.me/botfather))

---

## 🚀 راه‌اندازی قدم‌به‌قدم

### ۱. ساخت فضای ذخیره‌سازی Backblaze B2

1. برو به **[backblaze.com](https://www.backblaze.com/** و ثبت‌نام کن
   - ❌ نیازی به کارت بانکی نیست
   - ✅ ۱۰ گیگابایت رایگان

2. بعد از لاگین، برو به **B2 Cloud Storage** → **Buckets**
3. روی **Create a Bucket** بزن
4. یه اسم بذار مثلاً `telegram-r2`
5. Files in Bucket: **Private** رو انتخاب کن
6. روی **Create a Bucket** بزن

حالا یه کلید API بساز:
7. برو به **App Keys** (از منوی بالا)
8. روی **Add a New Application Key** بزن
9. یه اسم بذار مثلاً `telegram-bot`
10. Bucket access: **باکتی که ساختی** رو انتخاب کن
11. Type of Access: **Read and Write**
12. روی **Create New Key** بزن
13. این مقادیر رو **یادداشت کن** (فقط یه بار نشون داده میشه):
    - `keyID`
    - `applicationKey`

> 💡 همچنین از صفحه باکت، `bucketID` و `bucketName` رو هم یادداشت کن

---

### ۲. نصب پروژه

```bash
# کلون کردن
git clone https://github.com/Aporis3674/telegram-to-r2.git
cd telegram-to-r2

# نصب وابستگی‌ها
pnpm install
```

---

### ۳. ساخت دیتابیس D1

```bash
pnpm wrangler d1 create telegram_r2
```

آی‌دی دیتابیس (مثلاً `86b9d4df-...`) رو توی فایل `wrangler.jsonc` وارد کن.

---

### ۴. تنظیم `wrangler.jsonc`

فایل `wrangler.jsonc` رو باز کن و مقادیر زیر رو پر کن:

```jsonc
{
  "vars": {
    "ADMIN_USERNAMES": ["یوزرنیم_تلگرامت"],  // بدون @
    "BASE_URL": "https://اسم-ورکر.زیردامنه.workers.dev",
    "B2_BUCKET_ID": "آی‌دی_باکت_B2",
    "B2_BUCKET_NAME": "اسم_باکت_B2",
    "B2_DOWNLOAD_URL": "https://f005.backblazeb2.com"
  }
}
```

---

### ۵. تنظیم اطلاعات محرمانه (Secrets)

این اطلاعات بصورت رمزنگاری‌شده ذخیره میشن و توی کد دیده نمیشن:

```bash
# توکن بات تلگرام (از @BotFather)
echo "توکن_بات" | pnpm wrangler secret put BOT_TOKEN

# یه رشته تصادفی طولانی برای امنیت وبهوک
echo "یه_رشته_طولانی_تصادفی" | pnpm wrangler secret put WEBHOOK_SECRET

# اطلاعات B2
echo "keyID" | pnpm wrangler secret put B2_KEY_ID
echo "applicationKey" | pnpm wrangler secret put B2_APPLICATION_KEY
```

---

### ۶. دیپلوی

```bash
pnpm run deploy
```

بعد از دیپلوی، آدرس ورکر نشون داده میشه مثلاً:
`https://telegram-bot.moohmadirani.workers.dev`

---

### ۷. تنظیم وبهوک تلگرام

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/tg/hook&secret_token=<SECRET>"
```

جای `<TOKEN>` توکن بات، `<WORKER_URL>` آدرس ورکر، و `<SECRET>` رشته تصادفی WEBHOOK_SECRET رو بذار.

> ⚠️ **مهم:** مسیر وبهوک باید `/tg/hook` باشه. اگه ریشه ورکر رو بزنی، صفحه تقلبی میبینی!

---

## 🎮 دستورات بات

| دستور | دسترسی | توضیح |
|---|---|---|
| `/start` | همه | پیام خوش‌آمدگویی |
| `/help` | همه | راهنما |
| `/list` | همه | لیست فایل‌های خودت |
| `/list -t music` | همه | فقط فایل‌های موسیقی |
| `/list -u username` | ادمین | فایل‌های یه کاربر خاص |
| `/delete key` | همه | حذف فایل (فقط فایل‌های خودت) |
| `/block` | ادمین | بلاک کاربر (ریپلی یا `/block @username`) |
| `/unblock` | ادمین | آنبلاک کاربر |
| `/list_blocked` | ادمین | لیست کاربران بلاک شده |
| *ارسال فایل* | همه | آپلود خودکار فایل |

---

## 🎭 حالت مخفی چطور کار می‌کنه؟

Cloudflare وقتی ببینه ورکرش برای بات تلگرام استفاده میشه، ممکنه بلاکش کنه (ارور ۱۰۱۶). برای حل این مشکل:

1. **هر درخواستی** که به مسیر وبهوک (`/tg/hook`) نباشه، به یه **سایت واقعی** مثل docker.com یا ubuntu.com هدایت میشه
2. اسکنرهای Cloudflare وقتی سایت رو چک کنن، **صفحه docker.com** رو میبینن و فکر می‌کنن یه سایت معمولیه
3. فقط **بات تلگرام** با مسیر مخفی و توکن امنیتی میتونه به بات دسترسی داشته باشه

```
https://ورکر.workers.dev/           → صفحه docker.com (تقلبی 🎭)
https://ورکر.workers.dev/tg/hook    → بات تلگرام (واقعی 🤖)
```

---

## ❓ سوالات متداول

**Q: فایل‌ها کجا ذخیره میشن؟**
> روی Backblaze B2 — ۱۰ گیگابایت رایگان، بدون کارت بانکی.

**Q: لینک فایل‌ها عمومیه؟**
> نه. فایل‌ها روی باکت Private هستن. وقتی کسی لینک رو باز کنه، Worker فایل رو از B2 میگیره و نشون میده.

**Q: Cloudflare بلاکش نمی‌کنه؟**
> حالت مخفی باعث میشه اسکنرها فکر کنن سایت معمولیه. تا الان تست شده و کار می‌کنه.

**Q: چطور آپدیت کنم؟**
> کد جدید رو pull بگیر و `pnpm run deploy` بزن. تنظیمات D1 و Secrets حفظ میشن.

---

## 🤝 اعتبارات

- **پروژه اصلی**: [fwqaaq/telegram-to-r2](https://github.com/fwqaaq/telegram-to-r2) — ساخته شده توسط [@fwqaaq](https://github.com/fwqaaq)
- **مهاجرت به B2 + حالت مخفی**: این فورک

---

## 📄 لایسنس

[MIT](./LICENSE) — همون لایسنس پروژه اصلی
