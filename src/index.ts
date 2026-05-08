import { webhookCallback } from "grammy";
import { TelegramBotBuilder } from "./bot";
import type { Env } from "./type";

// explore Env for grammy context
declare module "grammy" {
  interface Context {
    env: Env;
  }
}

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    const bot = new TelegramBotBuilder(env.BOT_TOKEN, env)
      .with_authorization()
      .with_commands()
      .with_upload_handler()
      .with_builder();

    const handleUpdate = webhookCallback(bot, "cloudflare-mod", {
      secretToken: env.WEBHOOK_SECRET,
    });

    // Handle the request with the bot's webhook callback
    if (request.method === "POST") {
      // Handle the incoming update
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
