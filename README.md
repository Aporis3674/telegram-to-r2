# Telegram to B2 Bot

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Backblaze B2](https://img.shields.io/badge/Backblaze-B2-D32F2F?style=for-the-badge&logo=backblaze&logoColor=white)](https://www.backblaze.com/b2/cloud-storage.html)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![grammY](https://img.shields.io/badge/grammY-Framework-32ADFF?style=for-the-badge&logo=telegram&logoColor=white)](https://grammy.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **A Telegram bot that stores your files on Backblaze B2 (free cloud storage).**
> Send a file to the bot — get a direct download link back.

[فارسی](README_fa.md)

---

## Features

| Feature | Description |
|:--------|:------------|
| Auto Upload | Send files, images, videos, audio — auto-uploaded to B2 with a direct link |
| Folder System | Create folders, organize files, move between folders |
| Temporary Links | Generate download links with expiration (e.g. 24 hours) |
| File Search | Find your files by name |
| Storage Stats | See how many files you have and how much space they use |
| Inline Mode | Type `@botname` in any chat to search and send files |
| Admin Panel | Block/unblock users, view stats, manage files |
| Camouflage | Non-bot requests show a Docker.com page (anti-scanner) |
| Web Upload | Upload page with login, no file size limit |

---

## Prerequisites

1. **Cloudflare account** (free) — [cloudflare.com](https://cloudflare.com)
2. **Backblaze B2 account** (free, no credit card required) — [backblaze.com](https://www.backblaze.com/b2/cloud-storage.html)
3. **Telegram bot** — [@BotFather](https://t.me/botfather)
4. **Node.js** 18+ — [nodejs.org](https://nodejs.org)
5. **Git** — [git-scm.com](https://git-scm.com)

---

## Setup (Step by Step)

### Step 1: Create a Telegram Bot

1. Go to [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Choose a name (e.g. `My File Bot`)
4. Choose a username (e.g. `myfiles_bot`)
5. **Copy the bot token** — looks like `7123456789:***`
6. Enable inline mode:
   - Send `/mybots` to BotFather
   - Select your bot
   - **Bot Settings** > **Inline Mode** > **Turn on**
   - Placeholder: `Search files...`

### Step 2: Set Up Backblaze B2

1. Sign up at [backblaze.com](https://www.backblaze.com)
2. Go to **Buckets** > **Create a Bucket**
   - Bucket Name: any name (e.g. `telegram-files`)
   - Files in Bucket are: **Public**
3. Go to **App Keys** > **Add a New Application Key**
   - Key Name: any name (e.g. `telegram-bot`)
   - Bucket: select your bucket
   - Click **Create**
4. Note down:
   - `keyID` — e.g. `001234abcd567890`
   - `applicationKey` — e.g. `K001a2b3c4d5e6f7g8h9i0j`
   - `bucketName` — e.g. `telegram-files`
   - `bucketID` — e.g. `1234567890abcdef`
   - `downloadUrl` — e.g. `https://f000.backblazeb2.com`

### Step 3: Clone and Install

```bash
git clone https://github.com/Aporis3674/telegram-to-r2.git
cd telegram-to-r2
pnpm install
```

### Step 4: Create D1 Database

```bash
pnpm wrangler login
pnpm wrangler d1 create telegram-bot-db
```

You'll see output like:
```
Successfully created DB 'telegram-bot-db'
[[d1_databases]]
binding = "DB"
database_name = "telegram-bot-db"
database_id = "abc123-def456-ghi789"
```

**Copy `database_id`** and replace it in `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "telegram-bot-db",
    "database_id": "abc123-def456-ghi789"  // replace this
  }
]
```

### Step 5: Create Database Tables

```bash
pnpm wrangler d1 execute telegram-bot-db --remote --file=./migration.sql
```

### Step 6: Configure wrangler.jsonc

Open `wrangler.jsonc` and fill in:

```jsonc
"vars": {
  "ADMIN_USERNAMES": ["your_telegram_username"],
  "BASE_URL": "https://xxx.workers.dev",
  "B2_BUCKET_NAME": "telegram-files",
  "B2_BUCKET_ID": "1234567890abcdef",
  "B2_DOWNLOAD_URL": "https://f000.backblazeb2.com"
}
```

### Step 7: Set Up Secrets

These are sensitive and should not be in code:

```bash
# Telegram bot token
echo "7123456789:***" | pnpm wrangler secret put BOT_TOKEN

# Backblaze key ID
echo "001234abcd567890" | pnpm wrangler secret put B2_KEY_ID

# Backblaze application key
echo "K001a2b3c4d5e6f7g8h9i0j" | pnpm wrangler secret put B2_APP_KEY

# Webhook secret (any random string)
echo "mySuperSecret123" | pnpm wrangler secret put WEBHOOK_SECRET

# Web upload password (any random string)
echo "myUploadPassword" | pnpm wrangler secret put WEB_UPLOAD_PASSWORD
```

### Step 8: Deploy

```bash
pnpm run deploy
```

Output:
```
Deployed cf-media-bc5f20d0 (5.61 sec)
  https://your-worker-name.workers.dev
```

**Copy your Worker URL.**

### Step 9: Set Telegram Webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-worker-name.workers.dev/tg/hook&secret_token=WEBHOOK_SECRET"
```

Example:
```bash
curl "https://api.telegram.org/bot7123456789:***/setWebhook?url=https://your-worker-name.workers.dev/tg/hook&secret_token=mySuperSecret123"
```

Response should be `{"ok":true}`.

### Step 10: Test It

Go to your Telegram bot and send `/start`. If it responds, send a file to test the upload.

### Web Upload Page

Open `https://your-worker-name.workers.dev/upload` in your browser. Enter the password you set in Step 7 and upload files. This page has no file size limit — files larger than 20 MB work fine.

![Web Upload Page](https://cf-media-bc5f20d0.moohmadirani.workers.dev/file/web%2Fauto%2FScreenshot%202026-07-21%20221047.png)

---

## Bot Commands

| Command | Description |
|:--------|:------------|
| `/start` | Welcome message |
| `/help` | Command guide |
| `/list` | List files (e.g. `/list -t music`) |
| `/delete <filename>` | Delete a file |
| `/stats` | Storage stats |
| `/search <keyword>` | Search files |
| `/share <filename> <duration>` | Create temp link (e.g. `/share song.mp3 24h`) |
| `/folders` | List folders |
| `/mkdir <name>` | Create folder |
| `/cd <name>` | Enter folder |
| `/cd /` | Go back to root |
| `/move <file> <folder>` | Move file to folder |
| `/admin` | Admin panel (admins only) |
| `/block @username` | Block user (admins only) |
| `/unblock @username` | Unblock user (admins only) |
| `/list_blocked` | List blocked users |

**Inline mode:** Type `@yourbotname` in any chat to search and send files.

---

## Project Structure

```
src/
  bot.ts           Main bot logic and all commands
  db/
    schema.ts      Database table definitions
    index.ts       Database functions (block, folder, temp links)
  index.ts         Worker entry point, request routing
  nanoid.ts        Random token generation
  storage.ts       B2 operations (upload, download, delete, search)
  type.ts          TypeScript type definitions
  upload.ts        Web upload page and API
  utils.ts         Message formatting and helpers
```

---

## Troubleshooting

### Bot not responding
1. Check webhook: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
2. If there's a `last_error_message`, read the error
3. High `pending_update_count` means webhook isn't working
4. Check your secrets — especially `WEBHOOK_SECRET`

### 401 Unauthorized
- `WEBHOOK_SECRET` in Worker doesn't match `secret_token` in webhook URL

### 500 Internal Server Error
- Check Worker logs: `pnpm wrangler tail`
- Usually a database or B2 credentials issue

### File not uploading
- Check `B2_KEY_ID` and `B2_APP_KEY`
- Make sure bucket is **Public**

---

## Contributing

Issues and pull requests are welcome.

- Bug reports: [Issues](https://github.com/Aporis3674/telegram-to-r2/issues)
- Contributions: [Pull Requests](https://github.com/Aporis3674/telegram-to-r2/pulls)

## Credits

This project is based on [telegram-to-r2](https://github.com/fwqaaq/telegram-to-r2) by [@fwqaaq](https://github.com/fwqaaq).
Camouflage technique inspired by [Nahan](https://github.com/nahan-bot/nahan).

## License

[MIT](LICENSE)
