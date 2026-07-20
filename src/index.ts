import { webhookCallback } from "grammy";
import { TelegramBotBuilder } from "./bot";
import StorageManager from "./storage";
import type { Env } from "./type";

// explore Env for grammy context
declare module "grammy" {
  interface Context {
    env: Env;
  }
}

/**
 * Camouflage: proxy unauthorized requests to a legitimate site
 * so Cloudflare scanners think this is a normal website.
 */
const CAMOUFLAGE_HOSTS = [
  "https://www.docker.com",
  "https://www.ubuntu.com",
  "https://www.cloudflare.com",
];

async function serveCamouflage(request: Request): Promise<Response> {
  // Pick a random host based on client IP for consistency
  const clientIP = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const ipHash = Array.from(clientIP).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const targetStr = CAMOUFLAGE_HOSTS[ipHash % CAMOUFLAGE_HOSTS.length];

  try {
    const url = new URL(request.url);
    const targetUrl = new URL(targetStr);
    // Forward the path so it looks like a real site
    if (url.pathname !== "/") targetUrl.pathname = url.pathname;
    targetUrl.search = url.search;

    const cleanHeaders = new Headers(request.headers);
    cleanHeaders.set("Host", targetUrl.hostname);
    cleanHeaders.delete("cf-connecting-ip");
    cleanHeaders.delete("x-forwarded-for");

    const fetchInit: RequestInit = {
      method: request.method,
      headers: cleanHeaders,
      redirect: "follow",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      fetchInit.body = request.body;
    }
    return await fetch(new Request(targetUrl.toString(), fetchInit));
  } catch (e) {
    return new Response("Not Found", { status: 404 });
  }
}

// Secret webhook path — only Telegram (and you) know this
const WEBHOOK_PATH = "/tg/hook";

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    const url = new URL(request.url);

    // Serve files from B2: GET /file/<path>
    if (request.method === "GET" && url.pathname.startsWith("/file/")) {
      const key = decodeURIComponent(url.pathname.slice(6));
      if (!key) return new Response("Not Found", { status: 404 });

      const storage = new StorageManager(env);
      const resp = await storage.serve_file(key);
      if (!resp) return new Response("File Not Found", { status: 404 });
      return resp;
    }

    // Telegram webhook — only accept on secret path
    if (url.pathname === WEBHOOK_PATH && request.method === "POST") {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (secret !== env.WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      const bot = new TelegramBotBuilder(env.BOT_TOKEN, env)
        .with_authorization()
        .with_commands()
        .with_upload_handler()
        .with_builder();

      const handleUpdate = webhookCallback(bot, "cloudflare-mod", {
        secretToken: env.WEBHOOK_SECRET,
      });

      return await handleUpdate(request);
    }

    // Everything else → camouflage to look like a real website
    return serveCamouflage(request);
  },
} satisfies ExportedHandler<Env>;
