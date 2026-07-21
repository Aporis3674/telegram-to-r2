import { webhookCallback } from "grammy";
import { TelegramBotBuilder } from "./bot";
import StorageManager from "./storage";
import type { Env } from "./type";
import { get_share_token, cleanup_expired_tokens } from "./db";
import { handle_web_upload } from "./upload";

// explore Env for grammy context
declare module "grammy" {
  interface Context {
    env: Env;
  }
}

// Secret webhook path
const WEBHOOK_PATH = "/tg/hook";

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    const url = new URL(request.url);

    // ===== Handle file access (share tokens + direct B2 keys) =====
    if (url.pathname.startsWith("/file/") && request.method === "GET") {
      return await handle_file_request(url, env, request);
    }

    // ===== Web upload page =====
    if (url.pathname === "/upload" || url.pathname === "/api/upload") {
      return await handle_web_upload(request, env);
    }

    // ===== Camouflage: serve fake page for non-webhook requests =====
    const is_webhook_path = url.pathname === WEBHOOK_PATH;

    if (!is_webhook_path) {
      // Serve camouflage page for all non-webhook GET requests
      if (request.method === "GET") {
        return handle_camouflage(request);
      }
      return new Response("Not Found", { status: 404 });
    }

    // ===== Handle Telegram webhook =====
    const bot = new TelegramBotBuilder(env.BOT_TOKEN, env)
      .with_authorization()
      .with_commands()
      .with_callback_handlers()
      .with_inline_mode()
      .with_upload_handler()
      .with_builder();

    const handleUpdate = webhookCallback(bot, "cloudflare-mod", {
      secretToken: env.WEBHOOK_SECRET,
    });

    if (request.method === "POST") {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");

      if (secret !== env.WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      return await handleUpdate(request);
    }

    if (request.method === "GET") {
      return new Response("Telegram Webhook is set up!", { status: 200 });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handle file requests: share tokens and direct B2 keys
 * Share tokens are 32-char nanoid strings, direct keys look like username/type/filename
 */
async function handle_file_request(url: URL, env: Env, request: Request): Promise<Response> {
  try {
    const pathPart = url.pathname.substring("/file/".length);
    if (!pathPart) {
      return new Response("Not Found", { status: 404 });
    }

    // Auto-cleanup expired tokens (best effort)
    await cleanup_expired_tokens(env.DB).catch(() => {});

    // First, try to look up as a share token
    const shareInfo = await get_share_token(env.DB, pathPart);
    if (shareInfo) {
      // Serve file via B2 using the token's file_key
      const storage = new StorageManager(env);
      const resp = await storage.serve_file(shareInfo.file_key);
      if (!resp) {
        return new Response("\u0641\u0627\u06cc\u0644 \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f", { status: 404 });
      }
      // Add Content-Disposition for download
      const headers = new Headers(resp.headers);
      const filename = shareInfo.file_key.split("/").pop() || "file";
      headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      headers.set("Cache-Control", "private, no-store");
      return new Response(resp.body, { status: resp.status, headers });
    }

    // Not a share token - treat as direct B2 key (backward compatibility)
    const key = decodeURIComponent(pathPart);
    const storage = new StorageManager(env);
    const resp = await storage.serve_file(key);
    if (!resp) {
      return new Response("File Not Found", { status: 404 });
    }
    return resp;
  } catch (e) {
    console.error("Error handling file request:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * Camouflage: serve a realistic-looking page to fool Cloudflare scanners
 */
function handle_camouflage(request: Request): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2em; margin-bottom: 20px; color: #111; }
    p { line-height: 1.6; color: #666; margin-bottom: 15px; }
    .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .footer { text-align: center; margin-top: 40px; color: #999; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Welcome</h1>
      <p>This page is under construction. Please check back later.</p>
      <p>If you need assistance, please contact the administrator.</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
