# 🤖 ربات تلگرام برای آپلود فایل روی Backblaze B2

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Backblaze B2](https://img.shields.io/badge/Backblaze-B2-E2231A?style=for-the-badge&logo=backblaze&logoColor=white)](https://www.backblaze.com/b2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> 🇬🇧 [English Version](./README.md)

---

## 📌 این پروژه چیه؟

یه **بات تلگرام** که فایل‌ها (عکس، ویدیو، آدیو، داک) رو روی **Backblaze B2** ذخیره می‌کنه. کل پروژه روی **Cloudflare Workers** اجرا میشه و **هیچ هزینه‌ای نداره**.

این یه فورک از [fwqaaq/telegram-to-r2](https://github.com/fwqaaq/telegram-to-r2) هست که:
- **R2** رو با **B2** جایگزین کرده (نیازی به کارت بانکی نیست)
- **حالت مخفی** اضافه کرده (Cloudflare نمیفهمه برای باته)

---

## ✨ امکانات

- 📤 **آپلود خودکار**: فایل به بات بفرست، خودش آپلود میشه
- 📂 **دسته‌بندی هوشمند**: فایل‌ها بر اساس نوع (موسیقی/عکس/ویدیو/سند) جدا میشن
- 🔍 **لیست فایل‌ها**: با دستور `/list` همه فایل‌هاتو ببین
- 🗑️ **حذف فایل**: با دستور `/delete` فایل حذف کن
- 🛡️ **کنترل دسترسی**: بلاک/آن‌بلاک کاربران توسط ادمین
- 🎭 **مخفی‌کاری**: درخواست‌های غیرمجاز به سایت docker.com هدایت میشن

---

## 🚀 راه‌اندازی

### ۱. ساخت اکانت Backblaze B2

1. برو به [backblaze.com](https://www.backblaze.com/) و ثبت‌نام کن (**نیازی به کارت بانکی نیست**)
2. یه باکت بساز (مثلاً `telegram-r2`) — نوع: **Private**
3. برو به **App Keys** → **Add a New Application Key**
4. دسترسی: **Read and Write** روی باکت ساخته شده
5. مقادیر زیر رو یادداشت کن:
   - `keyID`
   - `applicationKey`
   - `bucketID` (از صفحه باکت)
   - `bucketName`

### ۲. ساخت دیتابیس D1

```bash
pnpm install
pnpm wrangler d1 create telegram_r2
```

آی‌دی دیتابیس رو توی `wrangler.jsonc` وارد کن.

### ۳. تنظیم Secrets

```bash
# توکن بات تلگرام (از @BotFather)
pnpm wrangler secret put BOT_TOKEN

# یه رشته تصادفی طولانی برای امنیت وبهوک
pnpm wrangler secret put WEBHOOK_SECRET

# اطلاعات B2
pnpm wrangler secret put B2_KEY_ID
pnpm wrangler secret put B2_APPLICATION_KEY
```

### ۴. تنظیم `wrangler.jsonc`

مقادیر زیر رو پر کن:
- `ADMIN_USERNAMES` — یوزرنیم تلگرامت
- `B2_BUCKET_ID` — آی‌دی باکت B2
- `B2_BUCKET_NAME` — اسم باکت
- `BASE_URL` — آدرس ورکر (بعد از deploy معلوم میشه)

### ۵. دیپلوی

```bash
pnpm run deploy
```

### ۶. تنظیم وبهوک تلگرام

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/tg/hook&secret_token=<SECRET>"
```

> ⚠️ دقت کن: مسیر وبهوک `/tg/hook` هست. آدرس اصلی ورکر صفحه تقلبی نشون میده!

---

## 🎮 دستورات بات

| دستور | دسترسی | توضیح |
|---|---|---|
| `/start` | همه | پیام خوش‌آمدگویی |
| `/list` | همه | لیست فایل‌ها |
| `/delete <key>` | همه | حذف فایل |
| `/block` | ادمین | بلاک کاربر |
| `/unblock` | ادمین | آنبلاک کاربر |
| `/list_blocked` | ادمین | لیست کاربران بلاک شده |
| *ارسال فایل* | همه | آپلود خودکار |

---

## 🎭 حالت مخفی چطور کار می‌کنه؟

وقتی یه نفر (یا اسکنر Cloudflare) به آدرس اصلی ورکر بره، بجای بات تلگرام، **صفحه docker.com یا ubuntu.com** رو میبینه. اینجوری Cloudflare فکر می‌کنه این یه سایت معمولیه و بلاکش نمی‌کنه.

فقط درخواست‌های POST به مسیر مخفی `/tg/hook` با توکن امنیتی درست به بات می‌رسن.

---

## 🤝 اعتبارات

- **پروژه اصلی**: [fwqaaq/telegram-to-r2](https://github.com/fwqaaq/telegram-to-r2) ساخته [@fwqaaq](https://github.com/fwqaaq)
- **فورک B2 + مخفی‌کاری**: این مخزن

---

## 📄 لایسنس

[MIT](./LICENSE) — مشابه پروژه اصلی
