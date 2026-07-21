# 🤖 Telegram to B2 Bot

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Backblaze B2](https://img.shields.io/badge/Backblaze-B2-D32F2F?style=for-the-badge&logo=backblaze&logoColor=white)](https://www.backblaze.com/b2/cloud-storage.html)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![grammY](https://img.shields.io/badge/grammY-Framework-32ADFF?style=for-the-badge&logo=telegram&logoColor=white)](https://grammy.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **یک بات تلگرام که فایل‌هات رو روی Backblaze B2 (فضای ابری رایگان) ذخیره می‌کنه.**
> کافیه فایل رو به بات بفرستی — لینک دانلود مستقیم برمی‌گردونه.

---

## ✨ امکانات

| امکان | توضیح |
|:------|:------|
| 📤 آپلود خودکار | فایل، عکس، ویدیو، آهنگ بفرست → آپلود روی B2 → لینک دانلود |
| 📂 سیستم فولدر | فولدر بساز، فایل‌ها رو مرتب کن، بین فولدرها جابجا شو |
| 🔗 لینک موقت | لینک دانلود با تاریخ انقضا بساز (مثلاً ۲۴ ساعته) |
| 🔍 جستجوی فایل | فایل‌هات رو با اسم پیدا کن |
| 📊 آمار ذخیره‌سازی | ببین چند فایل داری و چقدر فضا اشغال کردی |
| 🔎 حالت اینلاین | توی هر چتی `@botname` تایپ کن تا فایل‌هات رو پیدا و ارسال کنی |
| 🛡️ پنل ادمین | بلاک/آنبلاک کاربر، آمار کل، مدیریت فایل‌ها |
| 🌐 صفحه استتار | درخواست‌های غیررباتی صفحه Docker.com نشون میده (ضد اسکن) |

---

## 📋 پیش‌نیازها

قبل از شروع، اینا رو داشته باش:

1. **حساب Cloudflare** (رایگان) → [cloudflare.com](https://cloudflare.com)
2. **حساب Backblaze B2** (رایگان، بدون نیاز به کارت بانکی) → [backblaze.com](https://www.backblaze.com/b2/cloud-storage.html)
3. **بات تلگرام** → [@BotFather](https://t.me/botfather)
4. **Node.js** نسخه ۱۸ یا بالاتر → [nodejs.org](https://nodejs.org)
5. **Git** → [git-scm.com](https://git-scm.com)

---

## 🚀 راه‌اندازی قدم به قدم

### قدم ۱: بات تلگرام بساز

1. برو به [@BotFather](https://t.me/botfather)
2. بنویس `/newbot`
3. یه اسم برای بات انتخاب کن (مثلاً `My File Bot`)
4. یه یوزرنیم انتخاب کن (مثلاً `myfiles_bot`)
5. **توکن بات رو کپی کن** — چیزی شبیه اینه:
   ```
   7123456789:AAH1234abcdEfGhIjKlMnOpQrStUvWxYz
   ```
6. حالت اینلاین رو فعال کن:
   - توی BotFather بنویس `/mybots`
   - بات رو انتخاب کن
   - **Bot Settings** → **Inline Mode** → **Turn on**
   - placeholder: `🔍 جستجوی فایل...`

### قدم ۲: Backblaze B2 تنظیم کن

1. برو به [backblaze.com](https://www.backblaze.com) و ثبت‌نام کن
2. از منوی سمت چپ **Buckets** → **Create a Bucket**
   - Bucket Name: هر اسمی (مثلاً `telegram-files`)
   - Files in Bucket are: **Public**
3. از منوی سمت چپ **App Keys** → **Add a New Application Key**
   - Key Name: هر اسمی (مثلاً `telegram-bot`)
   - Bucket: bucket ساخته شده رو انتخاب کن
   - **Create**
4. این اطلاعات رو یادداشت کن:
   - `keyID` — مثلاً `001234abcd567890`
   - `applicationKey` — مثلاً `K001a2b3c4d5e6f7g8h9i0j`
   - `bucketName` — مثلاً `telegram-files`
   - `bucketID` — مثلاً `1234567890abcdef`
   - `downloadUrl` — مثلاً `https://f000.backblazeb2.com`

### قدم ۳: کد رو دانلود کن

```bash
# کلون کردن پروژه
git clone https://github.com/Aporis3674/telegram-to-r2.git
cd telegram-to-r2

# نصب پکیج‌ها
pnpm install
```

### قدم ۴: D1 دیتابیس بساز

```bash
# لاگین به Cloudflare
pnpm wrangler login

# دیتابیس بساز
pnpm wrangler d1 create telegram-bot-db
```

خروجی چیزی شبیه اینه:
```
✅ Successfully created DB 'telegram-bot-db'
[[d1_databases]]
binding = "DB"
database_name = "telegram-bot-db"
database_id = "abc123-def456-ghi789"
```

**`database_id` رو کپی کن** و توی فایل `wrangler.jsonc` جایگزین کن:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "telegram-bot-db",
    "database_id": "abc123-def456-ghi789"  // ← این رو عوض کن
  }
]
```

### قدم ۵: جداول دیتابیس بساز

```bash
pnpm wrangler d1 execute telegram-bot-db --remote --file=./migration.sql
```

### قدم ۶: تنظیمات wrangler.jsonc

فایل `wrangler.jsonc` رو باز کن و این قسمت‌ها رو پر کن:

```jsonc
"vars": {
  "ADMIN_USERNAMES": "[\"your_telegram_username\"]",  // یوزرنیم تلگرامت (بدون @)
  "BASE_URL": "https://xxx.workers.dev",             // آدرس Worker (بعد از deploy معلوم میشه)
  "B2_BUCKET_NAME": "telegram-files",                // اسم bucket بک‌بلیز
  "B2_BUCKET_ID": "1234567890abcdef",                // آیدی bucket بک‌بلیز
  "B2_DOWNLOAD_URL": "https://f000.backblazeb2.com"  // آدرس دانلود بک‌بلیز
}
```

### قدم ۷: Secrets تنظیم کن

اینا اطلاعات حساس هستن و نباید توی کد باشن:

```bash
# توکن بات تلگرام
echo "7123456789:AAH1234abcdEfGhIjKlMnOpQrStUvWxYz" | pnpm wrangler secret put BOT_TOKEN

# آیدی بک‌بلیز
echo "001234abcd567890" | pnpm wrangler secret put B2_KEY_ID

# کلید مخفی بک‌بلیز
echo "K001a2b3c4d5e6f7g8h9i0j" | pnpm wrangler secret put B2_APP_KEY

# رمز وبهوک (یه رمز دلخواه بذار)
echo "mySuperSecret123" | pnpm wrangler secret put WEBHOOK_SECRET
```

### قدم ۸: دیپلوی کن

```bash
pnpm run deploy
```

خروجی چیزی شبیه اینه:
```
Deployed cf-media-bc5f20d0 (5.61 sec)
  https://your-worker-name.workers.dev
```

**آدرس Worker رو کپی کن.**

### قدم ۹: وبهوک تلگرام رو ست کن

```bash
curl "https://api.telegram.org/bot<توکن_بات>/setWebhook?url=https://your-worker-name.workers.dev/tg/hook&secret_token=راز_وبهوک"
```

مثال واقعی:
```bash
curl "https://api.telegram.org/bot7123456789:AAH1234abcdEfGhIjKlMnOpQrStUvWxYz/setWebhook?url=https://your-worker-name.workers.dev/tg/hook&secret_token=mySuperSecret123"
```

جواب باید `{"ok":true}` باشه.

### قدم ۱۰: تست کن! 🎉

برو به بات تلگرامت و `/start` بفرست. اگه جواب داد، یه فایل بفرست ببین آپلود میشه.

---

## 🎮 دستورات بات

| دستور | توضیح |
|:------|:------|
| `/start` | پیام خوش‌آمدگویی |
| `/help` | راهنمای دستورات |
| `/list` | لیست فایل‌ها (مثال: `/list -t music`) |
| `/delete <filename>` | حذف فایل |
| `/stats` | آمار ذخیره‌سازی |
| `/search <keyword>` | جستجوی فایل |
| `/share <filename> <duration>` | لینک موقت بساز (مثال: `/share song.mp3 24h`) |
| `/folders` | لیست فولدرها |
| `/mkdir <name>` | ساخت فولدر |
| `/cd <name>` | ورود به فولدر |
| `/cd /` | برگشت به ریشه |
| `/move <file> <folder>` | انتقال فایل به فولدر |
| `/admin` | پنل ادمین (فقط ادمین‌ها) |
| `/block @username` | بلاک کاربر (فقط ادمین‌ها) |
| `/unblock @username` | آنبلاک کاربر (فقط ادمین‌ها) |
| `/list_blocked` | لیست کاربران بلاک‌شده |

**حالت اینلاین:** توی هر چتی `@yourbotname` تایپ کن تا فایل‌هات رو جستجو و ارسال کنی.

---

## 🏗️ ساختار پروژه

```
src/
├── bot.ts           # منطق اصلی بات و تمام دستورات
├── db/
│   ├── schema.ts    # تعریف جداول دیتابیس
│   └── index.ts     # توابع دیتابیس (بلاک، فولدر، لینک موقت)
├── index.ts         # نقطه ورود Worker، مسیریابی درخواست‌ها
├── nanoid.ts        # ساخت توکن تصادفی
├── storage.ts       # عملیات B2 (آپلود، دانلود، حذف، جستجو)
├── type.ts          # تایپ‌های TypeScript
└── utils.ts         # قالب‌بندی پیام‌ها و توابع کمکی
```

---

## ❓ عیب‌یابی

### بات جواب نمیده
1. وبهوک رو چک کن: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
2. اگه `last_error_message` داره، ارور رو بخون
3. `pending_update_count` اگه بالاست، یعنی وبهوک کار نمیکنه
4. Secrets رو چک کن — مخصوصاً `WEBHOOK_SECRET`

### ارور ۴۰۱ Unauthorized
- `WEBHOOK_SECRET` توی Worker با `secret_token` توی لینک وبهوک فرق داره

### ارور ۵۰۰ Internal Server Error
- لاگ Worker رو ببین: `pnpm wrangler tail`
- معمولاً مشکل از دیتابیس یا B2 credentials هست

### فایل آپلود نمیشه
- `B2_KEY_ID` و `B2_APP_KEY` رو چک کن
- مطمئن شو bucket **Public** هست

---

## 🤝 مشارکت

پذیرای Issue و Pull Request هستیم.

- 🐛 باگ گزارش: [Issues](https://github.com/Aporis3674/telegram-to-r2/issues)
- 🔧 مشارکت: [Pull Requests](https://github.com/Aporis3674/telegram-to-r2/pulls)

## 📝 قدردانی

این پروژه بر اساس [telegram-to-r2](https://github.com/fwqaaq/telegram-to-r2) ساخته شده.
تکنیک استتار از پروژه [Nahan](https://github.com/nahan-bot/nahan) الهام گرفته شده.

## 📄 لایسنس

[MIT](LICENSE)
