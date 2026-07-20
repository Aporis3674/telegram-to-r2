# 🤖 Telegram to B2 Bot

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Backblaze B2](https://img.shields.io/badge/Backblaze-B2-E2231A?style=for-the-badge&logo=backblaze&logoColor=white)](https://www.backblaze.com/b2)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![grammY](https://img.shields.io/badge/grammY-Framework-32ADFF?style=for-the-badge&logo=telegram&logoColor=white)](https://grammy.dev/)
[![فارسی](https://img.shields.io/badge/فارسی-نسخه_فارسی-green?style=for-the-badge)](./README_FA.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **A minimal, secure Telegram media storage bot on Cloudflare Workers + Backblaze B2.**
>
> 🇮🇷 [نسخه فارسی / Persian Version](./README_FA.md)
>
> This is a fork of [fwqaaq/telegram-to-r2](https://github.com/fwqaaq/telegram-to-r2) that replaces **Cloudflare R2** with **Backblaze B2** for storage — removing the credit card requirement. Also adds **camouflage mode** to hide the worker from automated scanners.

---

## 🆚 What's Different from the Original?

| Feature | Original (R2) | This Fork (B2) |
|---|---|---|
| **Storage** | Cloudflare R2 (requires CC) | Backblaze B2 (free, no CC) |
| **File Serving** | Direct R2 public URLs | Worker-proxied from B2 |
| **Stealth** | Standard Worker endpoint | Camouflage to legitimate sites |
| **Webhook Path** | `/` (root) | `/tg/hook` (secret path) |

> 🎭 **Camouflage Mode:** Any request to the worker that isn't from Telegram is proxied to `docker.com` or `ubuntu.com`, making the worker look like a regular website to Cloudflare's automated scanners.

---

## ✨ Features

- 🚀 **Auto media sync**: Send audio, images, videos, documents to the bot — auto-uploaded to B2.
- 📂 **Smart path classification**: Files sorted by type (`music / images / videos / documents`).
- 🛡️ **Dual access control**:
  - **Whitelist**: `ADMIN_USERNAMES` env var.
  - **Blacklist**: D1 database with `/block` command.
- 🔍 **Management**:
  - `/list` — List files with MarkdownV2 formatting.
  - `/delete` — Remove files from B2.
- 🎭 **Camouflage**: Unauthorized requests show a real website (docker.com / ubuntu.com).
- ⚡ **Edge performance**: Runs on Cloudflare's global network.

---

## 🏗️ Architecture

```text
src/
├── db/              # Database (Drizzle ORM + D1)
│   ├── schema.ts    # Table definitions
│   └── index.ts     # CRUD operations
├── bot.ts           # Bot logic & middleware
├── index.ts         # Worker entry + camouflage proxy
├── storage.ts       # Backblaze B2 API wrapper
├── type.ts          # TypeScript type definitions
└── utils.ts         # MarkdownV2 formatting helpers
```

---

## 🛠️ Setup

### 1. Backblaze B2

1. Sign up at [backblaze.com](https://www.backblaze.com/) (no credit card required).
2. Create a bucket (e.g., `telegram-r2`), set to **Private**.
3. Create an **Application Key** with Read+Write access to the bucket.
4. Note down: `keyID`, `applicationKey`, `bucketID`, `bucketName`.

### 2. Cloudflare D1

```bash
pnpm install
pnpm wrangler d1 create telegram_r2
```

Update `wrangler.jsonc` with your `database_id`.

### 3. Configure Secrets

```bash
# Set via wrangler secret (these stay encrypted)
pnpm wrangler secret put BOT_TOKEN          # From @BotFather
pnpm wrangler secret put WEBHOOK_SECRET     # Random long string
pnpm wrangler secret put B2_KEY_ID          # From B2 App Key
pnpm wrangler secret put B2_APPLICATION_KEY # From B2 App Key
```

### 4. Update `wrangler.jsonc`

Fill in your actual values for:
- `ADMIN_USERNAMES` — your Telegram username
- `B2_BUCKET_ID` — from B2 dashboard
- `B2_BUCKET_NAME` — your bucket name
- `BASE_URL` — your worker URL (e.g., `https://my-bot.your-subdomain.workers.dev`)

### 5. Deploy

```bash
pnpm run deploy
```

### 6. Set Telegram Webhook

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WORKER_URL>/tg/hook&secret_token=<WEBHOOK_SECRET>"
```

> ⚠️ Note the `/tg/hook` path — this is the secret webhook endpoint. The root URL shows a camouflage page.

---

## 🎮 Commands

| Command | Permission | Description |
|---|---|---|
| `/start` | Authorized | Welcome message |
| `/list -t <type> -u <user>` | Authorized | List files (music, images, videos, documents) |
| `/delete <key>` | Authorized | Delete a file from B2 |
| `/block` | Admin | Block a user (reply or `/block @username`) |
| `/unblock` | Admin | Unblock a user |
| `/list_blocked` | Admin | List blocked users |
| *(send media)* | Authorized | Auto-upload with MarkdownV2 card |

---

## 🤝 Credits

- **Original project**: [fwqaaq/telegram-to-r2](https://github.com/fwqaaq/telegram-to-r2) by [@fwqaaq](https://github.com/fwqaaq)
- **B2 migration & camouflage**: This fork

---

## 📄 License

[MIT](./LICENSE) — same as the original project.
