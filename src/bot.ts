import { Bot, type Context, GrammyError } from 'grammy';
import StorageManager from './storage';
import { type Env, FileType, type UploadedFileInfo } from './type';
import { arguments_parser, MessageFormatter } from './utils';
import {
  block_user,
  is_user_banned,
  list_blocked_users,
  unblock_user,
} from './db';

/**
 * Check if current user is admin
 */
function is_admin(ctx: Context): boolean {
  const username = ctx.from?.username?.toLowerCase();
  return !!username && ctx.env.ADMIN_USERNAMES.includes(username);
}

/**
 * Command handler for bot basic commands.
 */
class BotCommandHandler {
  constructor(private storage: StorageManager) {}
  setup_commands(bot: Bot) {
    bot.command('start', (c) =>
      c.reply(
        'Welcome! I am a Telegram to B2 storage bot! https://github.com/fwqaaq/telegram-to-r2',
      ),
    );
    bot.command('help', (c) => c.reply(MessageFormatter.get_help_message()));
    bot.command('list', async (c) => {
      const current_username = c.from?.username?.toLowerCase();

      if (!current_username) {
        return await c.reply('无法获取您的用户名，无法执行列出文件操作。');
      }

      // Parse command arguments
      const raw_args = c.match?.trim() || '';
      const args = arguments_parser(raw_args);

      // Get file type and target user from arguments
      const resource_name = args['t'] || args['type'] || 'all';
      const target_user = args['u'] || args['username'] || current_username;

      // Permission check: only allow users to list their own files.
      const admin = is_admin(c);

      // If current user is not admin and checking other user's files, reject the request
      if (!admin && target_user !== current_username) {
        return await c.reply('⚠️ 您没有权限查看其他用户的文件列表。');
      }

      let file_type: FileType;
      switch (resource_name) {
        case 'music':
          file_type = FileType.MUSIC;
          break;
        case 'images':
          file_type = FileType.IMAGES;
          break;
        case 'videos':
          file_type = FileType.VIDEOS;
          break;
        case 'documents':
          file_type = FileType.DOCUMENTS;
          break;
        case 'all':
          file_type = FileType.NULL;
          break;
        default:
          return await c.reply(
            '无效的参数。请使用 -t(ype) 参数指定资源类型，支持 music, images, videos, documents, all。例如：/list -t music -u fwqaaq',
          );
      }

      const files = await this.storage.list_files(file_type, target_user);

      const message = MessageFormatter.format_file_list(files, file_type);
      await c.reply(message, { parse_mode: 'MarkdownV2' });
    });

    bot.command('delete', async (c) => {
      const key = c.match?.trim();
      if (!key) {
        return await c.reply('请输入完整的 Key，例如: fwqaaq/music/test.mp3');
      }

      const current_username = c.from?.username?.toLowerCase();
      if (!current_username) return;

      try {
        const head = await this.storage.head_file(key);
        if (!head.exists) return await c.reply('未找到该文件。');

        const admin = is_admin(c);

        // Auth: unless admin, can only delete files with own prefix
        if (!admin && !key.startsWith(`${current_username}/`)) {
          return await c.reply('⚠️ 您没有权限删除该文件。');
        }

        await this.storage.delete_file(key);
        await c.reply(`✅ 文件 \`${key}\` 已成功删除。`, {
          parse_mode: 'MarkdownV2',
        });
      } catch (error) {
        await c.reply('❌ 删除失败，请确保 Key 正确。');
      }
    });
    bot.command('block', async (c) => {
      // Permission check: only allow admins to block users.
      if (!is_admin(c)) {
        return await c.reply('⚠️ 只有管理员可以使用 /block 命令。');
      }

      const target = {} as { chat_id?: number; username?: string };

      // Block by replying to a user's message
      if (c.message?.reply_to_message?.from) {
        const user = c.message.reply_to_message.from;
        target.chat_id = user.id;
        target.username = user.username?.toLowerCase();
      } else {
        // Block by /block username
        if (!c.match) {
          return await c.reply('请提供要封禁的用户名，例如：/block username');
        }
        const username = c.match.trim().toLowerCase();
        target.username = username.replace(/^@/, '');
        try {
          const chat = await c.api.getChat(`@${target.username}`);
          target.chat_id = chat.id;
        } catch (e) {
          console.warn(
            `无法获取用户 ${target.username} 的 chat_id，封禁将仅基于用户名进行。`,
          );
        }
      }

      try {
        await block_user(c.env.DB, target);
        const displayName = target.username
          ? `@${target.username}`
          : `ID: ${target.chat_id}`;
        await c.reply(`✅ 已成功封禁 ${displayName}`);
      } catch (e) {
        console.error('Error blocking user:', e);
        await c.reply('封禁用户时发生错误，请稍后再试。');
      }
    });

    bot.command('unblock', async (c) => {
      if (!is_admin(c)) {
        return await c.reply('⚠️ 只有管理员可以使用 /unblock 命令。');
      }

      const target = {} as { identifier: string | number };

      if (c.message?.reply_to_message?.from) {
        const user = c.message.reply_to_message.from;
        target.identifier = user.id;
      } else {
        if (!c.match) {
          return await c.reply('请提供要解封的用户名，例如：/unblock @username');
        }
        const username = c.match.trim().replace(/^@/, '').toLowerCase();
        target.identifier = username;
      }

      try {
        await unblock_user(c.env.DB, target.identifier);
        await c.reply(`✅ 已成功解封 ${target.identifier}`);
      } catch (e) {
        console.error('Error unblocking user:', e);
        await c.reply('解封用户时发生错误，请稍后再试。');
      }
    });

    // list all blocked users (admin only)
    bot.command('list_blocked', async (c) => {
      if (!is_admin(c)) {
        return await c.reply('⚠️ 只有管理员可以使用 /list_blocked 命令。');
      }

      try {
        const blockedUsers = await list_blocked_users(c.env.DB);
        if (blockedUsers.length === 0) {
          return await c.reply('当前没有被封禁的用户。');
        }
        let message = '🚫 *被封禁的用户列表*: \\n\\n';
        for (const user of blockedUsers) {
          const parts: string[] = [];
          if (user.username) parts.push(`用户名：@${user.username}`);
          if (user.chat_id) parts.push(`chat_id: ${user.chat_id}`);
          message += `- ${parts.join(' | ')}\\n`;
        }
        await c.reply(MessageFormatter.escape_md(message), {
          parse_mode: 'MarkdownV2',
        });
      } catch (e) {
        console.error('Error listing blocked users:', e);
        await c.reply('列出被封禁用户时发生错误，请稍后再试。');
      }
    });
  }
}

/**
 * File upload handler for the bot.
 */
class FileUploadHandler {
  constructor(private storage: StorageManager) {}
  setup_upload_handler(bot: Bot) {
    // media includes photo and video
    bot.on('message:media', async (c) => {
      await this.#handle_media_upload(c);
    });

    // audio files
    bot.on('message:audio', async (c) => {
      await this.#handle_audio_upload(c);
    });

    // document files
    bot.on('message:document', async (c) => {
      await this.#handle_document_upload(c);
    });
  }

  async #handle_media_upload(c: Context) {
    if (!c.message) return;

    const media = c.message.photo || c.message.video;
    if (!media) {
      return await c.reply(
        '您发送的视频或者图片无效，请将问题报告到 https://github.com/fwqaaq/telegram-to-r2。',
      );
    }

    if (Array.isArray(media)) {
      // Photo array — pick the largest size
      const photo = media[media.length - 1];
      const key = `${photo.file_unique_id}.jpg`;
      await this.#upload_from_telegram(c, {
        file_id: photo.file_id,
        file_type: FileType.IMAGES,
        key,
        content_type: 'image/jpeg',
      });
    } else {
      // Video
      const video = media;
      const key = video.file_name || `${video.file_unique_id}.mp4`;
      await this.#upload_from_telegram(c, {
        file_id: video.file_id,
        file_type: FileType.VIDEOS,
        key,
        content_type: video.mime_type || 'video/mp4',
      });
    }
  }

  async #handle_audio_upload(c: Context) {
    if (!c.message) return;
    const audio = c.message.audio;
    if (!audio) {
      return await c.reply('您未发送有效的音频文件');
    }

    const key = audio.file_name || `${audio.file_unique_id}.mp3`;
    await this.#upload_from_telegram(c, {
      file_id: audio.file_id,
      file_type: FileType.MUSIC,
      key,
      content_type: audio.mime_type || 'audio/mpeg',
    });
  }

  async #handle_document_upload(c: Context) {
    if (!c.message) return;
    const document = c.message.document;
    if (!document) {
      return await c.reply('您未发送有效的文件。');
    }

    const key = document.file_name || `${document.file_unique_id}`;
    const file_type = document.mime_type?.startsWith('image/')
      ? FileType.IMAGES
      : document.mime_type?.startsWith('video/')
        ? FileType.VIDEOS
        : FileType.DOCUMENTS;
    await this.#upload_from_telegram(c, {
      file_id: document.file_id,
      file_type,
      key,
      content_type: document.mime_type || 'application/octet-stream',
    });
  }

  async #upload_from_telegram(
    c: Context,
    params: {
      file_id: string;
      file_type: FileType;
      key: string;
      content_type: string;
    },
  ) {
    const { file_id, file_type, key, content_type } = params;

    const file = await this.#fetch_telegram_file(c, file_id);
    if (!file) return;

    const uploader = c.from?.username?.toLowerCase() || 'unknown';
    const uploaded_information: UploadedFileInfo = {
      key,
      file_type,
      file_buffer: file,
      content_type,
      author: uploader,
    };

    try {
      const result = await this.storage.upload_file(uploaded_information);
      await c.reply(MessageFormatter.format_upload_success(result), {
        parse_mode: 'MarkdownV2',
      });
    } catch (err) {
      const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error('[Error uploading file to B2]:', err);
      await c.reply(
        `❌ 上传文件时出错
${errMsg}`,
        { parse_mode: 'MarkdownV2' },
      );
    }
  }

  async #fetch_telegram_file(c: Context, file_id: string) {
    try {
      const file = await c.api.getFile(file_id);
      const fileUrl = `https://api.telegram.org/file/bot${c.env.BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);

      if (!response.ok) {
        await c.reply(`❌ 下载失败 (HTTP ${response.status})`);
        return null;
      }

      return await response.arrayBuffer();
    } catch (e) {
      let errorMessage = '❌ 下载失败:';
      if (e instanceof GrammyError) {
        errorMessage += ` ${e.description}`;
      } else {
        errorMessage += ` ${e instanceof Error ? e.message : String(e)}`;
      }
      await c.reply(errorMessage).catch(() => {});
      console.error('Error fetching Telegram file:', e);
      return null;
    }
  }
}

export class TelegramBotBuilder {
  #bot: Bot;
  #storage: StorageManager;
  #commandHandler: BotCommandHandler;
  #uploadHandler: FileUploadHandler;

  constructor(token: string, env: Env) {
    this.#bot = new Bot(token);
    this.#storage = new StorageManager(env);
    this.#commandHandler = new BotCommandHandler(this.#storage);
    this.#uploadHandler = new FileUploadHandler(this.#storage);

    // set the env in the context
    this.#bot.use(async (c, next) => {
      c.env = env;
      await next();
    });
  }

  with_authorization() {
    this.#bot.use(async (c, next) => {
      const current_username = c.from?.username?.toLowerCase();
      const chat_id = c.from?.id;

      try {
        const is_banned = await is_user_banned(
          c.env.DB,
          chat_id,
          current_username,
        );
        if (is_banned) {
          return await c.reply('🚫 您的账号已被系统封禁，无法使用此机器人。');
        }
      } catch (e) {
        console.error('D1 Blacklist check failed:', e);
      }

      return await next();
    });

    return this;
  }

  with_commands() {
    this.#commandHandler.setup_commands(this.#bot);
    return this;
  }

  with_upload_handler() {
    this.#uploadHandler.setup_upload_handler(this.#bot);
    return this;
  }

  with_builder(): Bot {
    return this.#bot;
  }
}
