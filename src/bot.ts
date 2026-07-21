import { Bot, type Context, GrammyError, InlineKeyboard } from 'grammy';
import StorageManager from './storage';
import { type Env, FileType, type UploadedFileInfo, type FolderRow } from './type';
import { arguments_parser, MessageFormatter, format_size, parse_duration } from './utils';
import {
  block_user,
  is_user_banned,
  list_blocked_users,
  unblock_user,
  create_share_token,
  get_share_token,
  cleanup_expired_tokens,
  list_user_share_tokens,
  get_user_folders,
  create_folder,
  get_folder_by_name,
  get_folder_by_id,
  get_folder_path,
} from './db';
import { nanoid } from './nanoid';

// In-memory folder state per user (user_id -> current folder_id)
const user_current_folder = new Map<string, number | null>();

function get_current_folder(userId: string): number | null {
  return user_current_folder.get(userId.toLowerCase()) ?? null;
}

function set_current_folder(userId: string, folderId: number | null) {
  user_current_folder.set(userId.toLowerCase(), folderId);
}

/**
 * 检查当前用户是否为管理员
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
        '👋 سلام! من یه بات ذخیره‌سازی ابری هستم!\n' +
        'فایل‌هات رو بفرست تا آپلود کنم و لینک دانلود بدم.\n\n' +
        '📖 برای دیدن دستورات: /help\n' +
        'https://github.com/fwqaaq/telegram-to-r2',
      ),
    );

    bot.command('help', (c) => c.reply(MessageFormatter.get_help_message()));

    // ===== /stats command =====
    bot.command('stats', async (c) => {
      const current_username = c.from?.username?.toLowerCase();
      if (!current_username) {
        return await c.reply('❌ نتونستم یوزرنیمت رو بگیرم.');
      }

      const raw_args = c.match?.trim() || '';
      const args = arguments_parser(raw_args);
      const target_user = args['u'] || args['username'] || current_username;
      const admin = is_admin(c);

      if (!admin && target_user !== current_username) {
        return await c.reply('⚠️ شما اجازه دیدن آمار کاربران دیگر رو ندارید.');
      }

      try {
        const stats = await this.storage.get_stats(target_user);
        await c.reply(MessageFormatter.format_stats(stats, target_user), {
          parse_mode: 'MarkdownV2',
        });
      } catch (e) {
        console.error('Error getting stats:', e);
        await c.reply('❌ خطا در دریافت آمار.');
      }
    });

    // ===== /admin command =====
    bot.command('admin', async (c) => {
      if (!is_admin(c)) {
        return await c.reply('⚠️ فقط ادمین‌ها میتونن از این دستور استفاده کنن.');
      }

      const keyboard = new InlineKeyboard()
        .text('📊 آمار', 'admin_stats')
        .text('🚫 بلاک‌شده‌ها', 'admin_blocked')
        .row()
        .text('📋 لیست فایل‌ها', 'admin_files')
        .text('🗑️ پاکسازی', 'admin_cleanup');

      await c.reply(MessageFormatter.format_admin_panel(), {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    });

    // ===== /search command =====
    bot.command('search', async (c) => {
      const keyword = c.match?.trim();
      if (!keyword) {
        return await c.reply('🔍 لطفاً کلمه جستجو رو وارد کن.\nمثال: `/search test.mp3`', {
          parse_mode: 'MarkdownV2',
        });
      }

      const current_username = c.from?.username?.toLowerCase();
      if (!current_username) {
        return await c.reply('❌ نتونستم یوزرنیمت رو بگیرم.');
      }

      try {
        const files = await this.storage.search_files(keyword, current_username);
        if (files.length === 0) {
          return await c.reply(`🔍 هیچ فایلی با کلمه «${keyword}» پیدا نشد.`);
        }

        const pageSize = 5;
        const totalPages = Math.ceil(files.length / pageSize);
        const page = 1;
        const pageFiles = files.slice(0, pageSize);

        const keyboard = new InlineKeyboard();
        for (const file of pageFiles) {
          const filename = file.key.split('/').pop() || file.key;
          keyboard.text(
            `📥 ${filename.substring(0, 30)}`,
            `search_dl:${file.key}`,
          ).row();
        }
        if (totalPages > 1) {
          keyboard.text('➡️ صفحه بعد', `search_page:2:${keyword}`);
        }

        await c.reply(
          MessageFormatter.format_search_results(pageFiles, keyword, page, totalPages),
          { parse_mode: 'MarkdownV2', reply_markup: keyboard },
        );
      } catch (e) {
        console.error('Error searching files:', e);
        await c.reply('❌ خطا در جستجو.');
      }
    });

    // ===== /share command =====
    bot.command('share', async (c) => {
      const current_username = c.from?.username?.toLowerCase();
      if (!current_username) {
        return await c.reply('❌ نتونستم یوزرنیمت رو بگیرم.');
      }

      const args_text = c.match?.trim() || '';
      const parts = args_text.split(/\s+/);
      if (parts.length < 2) {
        return await c.reply(
          '🔗 لطفاً نام فایل و مدت زمان رو وارد کن.\n' +
          'مثال: `/share file.mp3 24h`\n\n' +
          '⏰ مدت زمان: `1h`، `24h`، `7d`',
          { parse_mode: 'MarkdownV2' },
        );
      }

      const filename = parts[0];
      const duration_str = parts[1];
      const duration_ms = parse_duration(duration_str);

      if (!duration_ms) {
        return await c.reply(
          '❌ فرمت مدت زمان نامعتبره.\n' +
          'مثال‌ها: `1h` (یک ساعت)، `24h` (۲۴ ساعت)، `7d` (۷ روز)',
          { parse_mode: 'MarkdownV2' },
        );
      }

      // Build the file key
      const file_key = `${current_username}/${filename}`;
      try {
        // Check if file exists
        const obj = await this.storage.head_file(file_key);
        if (!obj.exists) {
          // Try with common paths
          const searchResults = await this.storage.search_files(filename, current_username);
          if (searchResults.length === 0) {
            return await c.reply('❌ فایلی با این اسم پیدا نشد.');
          }
          // Use first match
          const matched_key = searchResults[0].key;
          const token = nanoid(32);
          const expires_at = new Date(Date.now() + duration_ms);
          await create_share_token(c.env.DB, {
            token,
            file_key: matched_key,
            expires_at,
            created_by: current_username,
          });

          return await c.reply(
            MessageFormatter.format_share_link(c.env.BASE_URL, token),
            { parse_mode: 'MarkdownV2' },
          );
        }

        const token = nanoid(32);
        const expires_at = new Date(Date.now() + duration_ms);
        await create_share_token(c.env.DB, {
          token,
          file_key,
          expires_at,
          created_by: current_username,
        });

        await c.reply(
          MessageFormatter.format_share_link(c.env.BASE_URL, token),
          { parse_mode: 'MarkdownV2' },
        );
      } catch (e) {
        console.error('Error creating share token:', e);
        await c.reply('❌ خطا در ساخت لینک موقت.');
      }
    });

    // ===== /list command =====
    bot.command('list', async (c) => {
      const current_username = c.from?.username?.toLowerCase();

      if (!current_username) {
        return await c.reply('❌ نتونستم یوزرنیمت رو بگیرم.');
      }

      // Parse command arguments
      const raw_args = c.match?.trim() || '';
      const args = arguments_parser(raw_args);

      // Get file type and target user from arguments
      const resource_name = args['t'] || args['type'] || 'all'; // default to all
      const target_user = args['u'] || args['username'] || current_username; // default to self

      // Permission check: only allow users to list their own files.
      const admin = is_admin(c);

      // If current user is not admin and checking other user's files, reject the request
      if (!admin && target_user !== current_username) {
        return await c.reply('⚠️ شما اجازه دیدن فایل‌های کاربران دیگر رو ندارید.');
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
            '❌ پارامتر نامعتبر. از -t برای نوع فایل استفاده کن: music, images, videos, documents, all\nمثال: `/list -t music`',
            { parse_mode: 'MarkdownV2' },
          );
      }

      const files = await this.storage.list_files(file_type, target_user);

      if (files.length === 0) {
        return await c.reply('📁 فایلی پیدا نشد.');
      }

      const message = MessageFormatter.format_file_list(files, file_type);
      await c.reply(message, { parse_mode: 'MarkdownV2' });
    });

    // ===== /delete command =====
    bot.command('delete', async (c) => {
      const key = c.match?.trim();
      if (!key) {
        return await c.reply('لطفاً کلید فایل رو وارد کن.\nمثال: `/delete username/music/test.mp3`', {
          parse_mode: 'MarkdownV2',
        });
      }

      const current_username = c.from?.username?.toLowerCase();
      if (!current_username) return;

      try {
        const obj = await this.storage.head_file(key);
        if (!obj.exists) return await c.reply('❌ فایل پیدا نشد.');

        const admin = is_admin(c);

        if (!admin && !key.startsWith(`${current_username}/`)) {
          return await c.reply('⚠️ شما اجازه حذف این فایل رو ندارید.');
        }

        await this.storage.delete_file(key);
        await c.reply('✅ \u0641\u0627\u06cc\u0644 `' + MessageFormatter.escapeCodeBlock(key) + '` \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u062d\u0630\u0641 \u0634\u062f.', {
          parse_mode: 'MarkdownV2',
        });
      } catch (error) {
        await c.reply('❌ حذف ناموفق بود. مطمئن شو کلید فایل درسته.');
      }
    });

    // ===== /block command =====
    bot.command('block', async (c) => {
      if (!is_admin(c)) {
        return await c.reply('⚠️ فقط ادمین‌ها میتونن کاربر رو بلاک کنن.');
      }

      const target = {} as { chat_id?: number; username?: string };

      if (c.message?.reply_to_message?.from) {
        const user = c.message.reply_to_message.from;
        target.chat_id = user.id;
        target.username = user.username?.toLowerCase();
      } else {
        if (!c.match) {
          return await c.reply('لطفاً یوزرنیم کاربر رو وارد کن.\nمثال: `/block @username`', {
            parse_mode: 'MarkdownV2',
          });
        }
        const username = c.match.trim().toLowerCase();
        target.username = username.replace(/^@/, '');
        try {
          const chat = await c.api.getChat(`@${target.username}`);
          target.chat_id = chat.id;
        } catch (e) {
          console.warn(`نگرفتن chat_id برای ${target.username}`);
        }
      }

      try {
        await block_user(c.env.DB, target);
        const displayName = target.username
          ? `@${target.username}`
          : `ID: ${target.chat_id}`;
        await c.reply(`✅ ${displayName} با موفقیت بلاک شد.`);
      } catch (e) {
        console.error('Error blocking user:', e);
        await c.reply('❌ خطا در بلاک کردن کاربر.');
      }
    });

    // ===== /unblock command =====
    bot.command('unblock', async (c) => {
      if (!is_admin(c)) {
        return await c.reply('⚠️ فقط ادمین‌ها میتونن کاربر رو آنبلاک کنن.');
      }

      const target = {} as { identifier: string | number };

      if (c.message?.reply_to_message?.from) {
        const user = c.message.reply_to_message.from;
        target.identifier = user.id;
      } else {
        if (!c.match) {
          return await c.reply('لطفاً یوزرنیم کاربر رو وارد کن.\nمثال: `/unblock @username`', {
            parse_mode: 'MarkdownV2',
          });
        }
        const username = c.match.trim().replace(/^@/, '').toLowerCase();
        target.identifier = username;
      }

      try {
        await unblock_user(c.env.DB, target.identifier);
        await c.reply(`✅ ${target.identifier} با موفقیت آنبلاک شد.`);
      } catch (e) {
        console.error('Error unblocking user:', e);
        await c.reply('❌ خطا در آنبلاک کردن کاربر.');
      }
    });

    // ===== /list_blocked command =====
    bot.command('list_blocked', async (c) => {
      if (!is_admin(c)) {
        return await c.reply('⚠️ فقط ادمین‌ها میتونن لیست بلاک‌شده‌ها رو ببینن.');
      }

      try {
        const blockedUsers = await list_blocked_users(c.env.DB);
        if (blockedUsers.length === 0) {
          return await c.reply('✅ هیچ کاربری بلاک نشده.');
        }
        let message = '🚫 *لیست کاربران بلاک‌شده:*\n\n';
        for (const user of blockedUsers) {
          const parts: string[] = [];
          if (user.username) parts.push(`یوزرنیم: @${user.username}`);
          if (user.chat_id) parts.push(`آی‌دی: ${user.chat_id}`);
          message += `• ${parts.join(' | ')}\n`;
        }
        await c.reply(MessageFormatter.escape_md(message), {
          parse_mode: 'MarkdownV2',
        });
      } catch (e) {
        console.error('Error listing blocked users:', e);
        await c.reply('❌ خطا در لیست کاربران بلاک‌شده.');
      }
    });

    // ===== /folders command =====
    bot.command('folders', async (c) => {
      const current_username = c.from?.username?.toLowerCase();
      if (!current_username) {
        return await c.reply('❌ نتونستم یوزرنیمت رو بگیرم.');
      }

      try {
        const currentFolderId = get_current_folder(current_username);
        const folders = await get_user_folders(c.env.DB, current_username, currentFolderId);
        const path = currentFolderId !== null
          ? await get_folder_path(c.env.DB, currentFolderId)
          : '';

        await c.reply(
          MessageFormatter.format_folder_list(
            folders.map(f => ({ id: f.id, name: f.name })),
            path,
          ),
          { parse_mode: 'MarkdownV2' },
        );
      } catch (e) {
        console.error('Error listing folders:', e);
        await c.reply('❌ خطا در لیست فولدرها.');
      }
    });

    // ===== /mkdir command =====
    bot.command('mkdir', async (c) => {
      const current_username = c.from?.username?.toLowerCase();
      if (!current_username) {
        return await c.reply('❌ نتونستم یوزرنیمت رو بگیرم.');
      }

      const folder_name = c.match?.trim();
      if (!folder_name) {
        return await c.reply('لطفاً نام فولدر رو وارد کن.\nمثال: `/mkdir عکس‌ها`', {
          parse_mode: 'MarkdownV2',
        });
      }

      // Validate folder name (no slashes, no spaces)
      if (folder_name.includes('/') || folder_name.includes('\\')) {
        return await c.reply('❌ نام فولدر نمیتونه شامل / یا \\ باشه.');
      }

      try {
        const currentFolderId = get_current_folder(current_username);
        await create_folder(c.env.DB, {
          name: folder_name,
          userId: current_username,
          parentId: currentFolderId,
        });
        await c.reply(`✅ فولدر «${folder_name}» با موفقیت ساخته شد.`);
      } catch (e) {
        console.error('Error creating folder:', e);
        await c.reply(`❌ ${(e as Error).message || 'خطا در ساخت فولدر.'}`);
      }
    });

    // ===== /cd command =====
    bot.command('cd', async (c) => {
      const current_username = c.from?.username?.toLowerCase();
      if (!current_username) {
        return await c.reply('❌ نتونستم یوزرنیمت رو بگیرم.');
      }

      const target = c.match?.trim();
      if (!target) {
        return await c.reply('لطفاً نام فولدر رو وارد کن.\nمثال: `/cd عکس‌ها` یا `/cd ..` برای بازگشت', {
          parse_mode: 'MarkdownV2',
        });
      }

      try {
        if (target === '..') {
          const currentFolderId = get_current_folder(current_username);
          if (currentFolderId === null) {
            return await c.reply('📁 شما در ریشه هستید.');
          }
          const currentFolder = await get_folder_by_id(c.env.DB, currentFolderId);
          set_current_folder(current_username, currentFolder?.parent_id ?? null);
          const newPath = currentFolder?.parent_id
            ? await get_folder_path(c.env.DB, currentFolder.parent_id)
            : '/';
          await c.reply(`📂 به پوشه «${newPath || '/'}» رفتید.`);
        } else {
          const currentFolderId = get_current_folder(current_username);
          const folder = await get_folder_by_name(c.env.DB, current_username, target, currentFolderId);
          if (!folder) {
            return await c.reply(`❌ فولدر «${target}» پیدا نشد.`);
          }
          set_current_folder(current_username, folder.id);
          const path = await get_folder_path(c.env.DB, folder.id);
          await c.reply(`📂 وارد پوشه «${path}» شدید.`);
        }
      } catch (e) {
        console.error('Error changing folder:', e);
        await c.reply('❌ خطا در تغییر فولدر.');
      }
    });

    // ===== /move command =====
    bot.command('move', async (c) => {
      const current_username = c.from?.username?.toLowerCase();
      if (!current_username) {
        return await c.reply('❌ نتونستم یوزرنیمت رو بگیرم.');
      }

      const args_text = c.match?.trim() || '';
      const parts = args_text.split(/\s+/);
      if (parts.length < 2) {
        return await c.reply(
          'لطفاً نام فایل و نام فولدر مقصد رو وارد کن.\n' +
          'مثال: `/move test.mp3 عکس‌ها`',
          { parse_mode: 'MarkdownV2' },
        );
      }

      const filename = parts[0];
      const folderName = parts[1];

      try {
        const currentFolderId = get_current_folder(current_username);
        const folder = await get_folder_by_name(c.env.DB, current_username, folderName, currentFolderId);
        if (!folder) {
          return await c.reply(`❌ فولدر «${folderName}» پیدا نشد.`);
        }

        // Find the file in B2
        const searchResults = await this.storage.search_files(filename, current_username);
        const matchingFiles = searchResults.filter(f => {
          const fname = f.key.split('/').pop() || '';
          return fname === filename;
        });

        if (matchingFiles.length === 0) {
          return await c.reply(`❌ فایل «${filename}» پیدا نشد.`);
        }

        const file = matchingFiles[0];
        const folderPath = await get_folder_path(c.env.DB, folder.id);
        const fileParts = file.key.split('/');
        const fileBaseName = fileParts.pop() || filename;
        const fileType = fileParts.length > 1 ? fileParts[1] : 'documents';
        const newKey = `${current_username}/${folderPath}/${fileType}/${fileBaseName}`;

        // Copy to new location via B2
        await this.storage.copy_file(file.key, newKey);
        await this.storage.delete_file(file.key);

        await c.reply(`✅ فایل «${filename}» به فولدر «${folderName}» منتقل شد.`);
      } catch (e) {
        console.error('Error moving file:', e);
        await c.reply('❌ خطا در انتقال فایل.');
      }
    });
  }

  setup_callback_handlers(bot: Bot) {
    // ===== Admin panel callbacks =====
    bot.callbackQuery('admin_stats', async (c) => {
      await c.answerCallbackQuery();
      const username = c.from?.username?.toLowerCase();
      if (!username || !is_admin(c)) return;

      try {
        // Show stats for all files (admin view)
        const stats = await this.storage.get_stats('all');
        await c.editMessageText(
          MessageFormatter.format_stats(stats, 'all (ادمین)'),
          { parse_mode: 'MarkdownV2' },
        );
      } catch (e) {
        console.error('Error in admin_stats callback:', e);
        await c.editMessageText('❌ خطا در دریافت آمار.');
      }
    });

    bot.callbackQuery('admin_blocked', async (c) => {
      await c.answerCallbackQuery();
      if (!is_admin(c)) return;

      try {
        const blockedUsers = await list_blocked_users(c.env.DB);
        if (blockedUsers.length === 0) {
          await c.editMessageText('✅ هیچ کاربری بلاک نشده.');
          return;
        }
        let message = '🚫 *لیست کاربران بلاک‌شده:*\n\n';
        for (const user of blockedUsers) {
          const parts: string[] = [];
          if (user.username) parts.push(`@${user.username}`);
          if (user.chat_id) parts.push(`ID: ${user.chat_id}`);
          message += `• ${parts.join(' | ')}\n`;
        }
        await c.editMessageText(message, { parse_mode: 'MarkdownV2' });
      } catch (e) {
        console.error('Error in admin_blocked callback:', e);
        await c.editMessageText('❌ خطا در لیست بلاک‌شده‌ها.');
      }
    });

    bot.callbackQuery('admin_files', async (c) => {
      await c.answerCallbackQuery();
      if (!is_admin(c)) return;

      const keyboard = new InlineKeyboard()
        .text('🎵 موسیقی', 'admin_files_type:music')
        .text('🖼️ تصاویر', 'admin_files_type:images')
        .row()
        .text('🎬 ویدیوها', 'admin_files_type:videos')
        .text('📄 اسناد', 'admin_files_type:documents')
        .row()
        .text('📂 همه', 'admin_files_type:all')
        .row()
        .text('🔙 بازگشت', 'admin_back');

      await c.editMessageText('📋 نوع فایل رو انتخاب کن:', {
        reply_markup: keyboard,
      });
    });

    bot.callbackQuery('admin_cleanup', async (c) => {
      await c.answerCallbackQuery();
      if (!is_admin(c)) return;

      const keyboard = new InlineKeyboard()
        .text('🗑️ پاکسازی لینک‌های منقضی', 'admin_cleanup_tokens')
        .row()
        .text('🔙 بازگشت', 'admin_back');

      await c.editMessageText('🗑️ *پاکسازی*\n\nگزینه مورد نظر رو انتخاب کن:', {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    });

    bot.callbackQuery('admin_back', async (c) => {
      await c.answerCallbackQuery();
      if (!is_admin(c)) return;

      const keyboard = new InlineKeyboard()
        .text('📊 آمار', 'admin_stats')
        .text('🚫 بلاک‌شده‌ها', 'admin_blocked')
        .row()
        .text('📋 لیست فایل‌ها', 'admin_files')
        .text('🗑️ پاکسازی', 'admin_cleanup');

      await c.editMessageText(MessageFormatter.format_admin_panel(), {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    });

    bot.callbackQuery(/^admin_files_type:(.+)$/, async (c) => {
      await c.answerCallbackQuery();
      if (!is_admin(c)) return;
      const type = c.match![1];

      let file_type: FileType;
      switch (type) {
        case 'music': file_type = FileType.MUSIC; break;
        case 'images': file_type = FileType.IMAGES; break;
        case 'videos': file_type = FileType.VIDEOS; break;
        case 'documents': file_type = FileType.DOCUMENTS; break;
        default: file_type = FileType.NULL; break;
      }

      try {
        const files = await this.storage.list_files(file_type, 'all');
        if (files.length === 0) {
          await c.editMessageText('📁 فایلی پیدا نشد.');
          return;
        }
        const message = MessageFormatter.format_file_list(files, file_type);
        await c.editMessageText(message, { parse_mode: 'MarkdownV2' });
      } catch (e) {
        console.error('Error listing files:', e);
        await c.editMessageText('❌ خطا در لیست فایل‌ها.');
      }
    });

    bot.callbackQuery('admin_cleanup_tokens', async (c) => {
      await c.answerCallbackQuery();
      if (!is_admin(c)) return;

      try {
        await cleanup_expired_tokens(c.env.DB);
        await c.editMessageText('✅ لینک‌های منقضی‌شده پاکسازی شدند.');
      } catch (e) {
        console.error('Error cleaning up tokens:', e);
        await c.editMessageText('❌ خطا در پاکسازی.');
      }
    });

    // ===== Search result callbacks =====
    bot.callbackQuery(/^search_dl:(.+)$/, async (c) => {
      await c.answerCallbackQuery();
      const fileKey = c.match![1];
      const current_username = c.from?.username?.toLowerCase();

      if (!current_username) return;

      // Permission check
      if (!fileKey.startsWith(`${current_username}/`) && !is_admin(c)) {
        await c.answerCallbackQuery({ text: '⚠️ شما اجازه دسترسی به این فایل رو ندارید.', show_alert: true });
        return;
      }

      try {
        const obj = await this.storage.head_file(fileKey);
        if (!obj.exists) {
          await c.answerCallbackQuery({ text: '❌ فایل پیدا نشد.', show_alert: true });
          return;
        }

        const url = `${c.env.BASE_URL}/${encodeURIComponent(fileKey.split('/').join('/'))}`;
        await c.answerCallbackQuery({
          text: `🔗 لینک: ${url}`,
          show_alert: true,
        });
      } catch (e) {
        console.error('Error in search_dl callback:', e);
        await c.answerCallbackQuery({ text: '❌ خطا.', show_alert: true });
      }
    });

    bot.callbackQuery(/^search_page:(\d+):(.+)$/, async (c) => {
      await c.answerCallbackQuery();
      const page = parseInt(c.match![1]);
      const keyword = c.match![2];
      const current_username = c.from?.username?.toLowerCase();

      if (!current_username) return;

      try {
        const files = await this.storage.search_files(keyword, current_username);
        if (files.length === 0) {
          await c.editMessageText('🔍 نتیجه‌ای پیدا نشد.');
          return;
        }

        const pageSize = 5;
        const totalPages = Math.ceil(files.length / pageSize);
        const start = (page - 1) * pageSize;
        const pageFiles = files.slice(start, start + pageSize);

        const keyboard = new InlineKeyboard();
        for (const file of pageFiles) {
          const filename = file.key.split('/').pop() || file.key;
          keyboard.text(
            `📥 ${filename.substring(0, 30)}`,
            `search_dl:${file.key}`,
          ).row();
        }
        if (page > 1) {
          keyboard.text('⬅️ صفحه قبل', `search_page:${page - 1}:${keyword}`);
        }
        if (page < totalPages) {
          keyboard.text('➡️ صفحه بعد', `search_page:${page + 1}:${keyword}`);
        }

        await c.editMessageText(
          MessageFormatter.format_search_results(pageFiles, keyword, page, totalPages),
          { parse_mode: 'MarkdownV2', reply_markup: keyboard },
        );
      } catch (e) {
        console.error('Error in search_page callback:', e);
        await c.editMessageText('❌ خطا در جستجو.');
      }
    });
  }

  setup_inline_mode(bot: Bot) {
    bot.on('inline_query', async (c) => {
      const query = c.inlineQuery.query.trim().toLowerCase();
      const current_username = c.from?.username?.toLowerCase();

      if (!current_username) {
        await c.answerInlineQuery([], {
          button: {
            text: '⚠️ لطفاً اول یوزرنیم تنظیم کنید.',
            start_parameter: 'no_username',
          },
        });
        return;
      }

      try {
        const files = await this.storage.list_all_user_files(current_username);

        // Filter by query
        let filtered = files;
        if (query) {
          // Support type filter: "music:", "images:", etc.
          const typeMatch = query.match(/^(music|images|videos|documents):/);
          if (typeMatch) {
            const typeFilter = typeMatch[1];
            const searchTerm = query.substring(typeMatch[0].length).trim();
            filtered = files.filter(f => {
              const parts = f.key.split('/');
              const matchesType = parts.length > 1 && parts[1] === typeFilter;
              if (!matchesType) return false;
              if (!searchTerm) return true;
              const filename = parts[parts.length - 1].toLowerCase();
              return filename.includes(searchTerm);
            });
          } else {
            filtered = files.filter(f => {
              const filename = f.key.split('/').pop()?.toLowerCase() || '';
              return filename.includes(query);
            });
          }
        }

        // Limit to 50 results (Telegram max)
        // Use article type for all results for reliable typing
        const results: Array<{
          type: 'article';
          id: string;
          title: string;
          description: string;
          input_message_content: { message_text: string };
          reply_markup?: { inline_keyboard: Array<Array<{ text: string; url: string }>> };
        }> = filtered.slice(0, 50).map((file, index) => {
          const filename = file.key.split('/').pop() || file.key;
          const parts = file.key.split('/');
          const fileType = parts.length > 1 ? parts[1] : '';
          const typeEmoji = fileType === 'music' ? '🎵' : fileType === 'images' ? '🖼️' : fileType === 'videos' ? '🎬' : '📄';

          return {
            type: 'article' as const,
            id: `file_${index}`,
            title: `${typeEmoji} ${filename}`,
            description: `${file.author} • ${format_size(file.size)}`,
            input_message_content: {
              message_text: `📎 ${filename}\n🔗 ${file.url}\n👤 ${file.author}\n📏 ${format_size(file.size)}`,
            },
            reply_markup: {
              inline_keyboard: [
                [{ text: '📥 دانلود', url: file.url }],
              ],
            },
          };
        });

        await c.answerInlineQuery(results, {
          cache_time: 300,
          is_personal: true,
        });
      } catch (e) {
        console.error('Error handling inline query:', e);
        await c.answerInlineQuery([], {
          button: {
            text: '❌ خطا در جستجو.',
            start_parameter: 'error',
          },
        });
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
    // media includes photo and video: https://grammy.dev/guide/filter-queries#media
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
        '❌ ویدیو یا عکس نامعتبره. لطفاً گزارش بدید: https://github.com/fwqaaq/telegram-to-r2',
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
      // Video — use VIDEOS type instead of IMAGES
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
      return await c.reply('❌ فایل صوتی نامعتبره.');
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
      return await c.reply('❌ فایل نامعتبره.');
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

    // Get file information from #fetch_telegram_file
    const file = await this.#fetch_telegram_file(c, file_id);
    if (!file) return;

    // Get uploader information
    const uploader = c.from?.username?.toLowerCase() || 'unknown';

    // Check if user is in a folder
    const currentFolderId = get_current_folder(uploader);
    let folderPath: string | undefined;
    if (currentFolderId !== null) {
      folderPath = await get_folder_path(c.env.DB, currentFolderId);
    }

    const uploaded_information: UploadedFileInfo = {
      key,
      file_type,
      file_buffer: file,
      content_type,
      author: uploader,
    };

    try {
      const result = await this.storage.upload_file(uploaded_information, folderPath);
      await c.reply(MessageFormatter.format_upload_success(result), {
        parse_mode: 'MarkdownV2',
      });
    } catch (err) {
      console.error('[Error uploading file to R2]:', err);
      await c.reply(
        `❌ خطا در آپلود فایل. لطفاً گزارش بدید: https://github.com/fwqaaq/telegram-to-r2`,
      );
    }
  }

  async #fetch_telegram_file(c: Context, file_id: string) {
    try {
      // Get file information from Telegram API
      const file = await c.api.getFile(file_id);

      // Construct the file URL to download the file
      const fileUrl = `https://api.telegram.org/file/bot${c.env.BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);

      if (!response.ok) {
        await c.reply(`❌ دانلود ناموفق (HTTP ${response.status})`);
        return null;
      }

      return await response.arrayBuffer();
    } catch (e) {
      let errorMessage = '❌ خطا در دانلود:';
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
      // Skip authorization for callback queries and inline queries
      if (c.callbackQuery || c.inlineQuery) {
        return await next();
      }

      const current_username = c.from?.username?.toLowerCase();
      const chat_id = c.from?.id;

      // Check allowed user IDs (whitelist)
      try {
        const allowedIds: number[] = JSON.parse(c.env.ALLOWED_USER_IDS || '[]');
        if (allowedIds.length > 0 && chat_id && !allowedIds.includes(chat_id)) {
          return await c.reply('🚫 شما اجازه استفاده از این بات رو ندارید.');
        }
      } catch (e) {
        console.error('ALLOWED_USER_IDS parse error:', e);
      }

      try {
        const is_banned = await is_user_banned(
          c.env.DB,
          chat_id,
          current_username,
        );
        if (is_banned) {
          return await c.reply('🚫 حساب شما بلاک شده و اجازه استفاده از بات رو ندارید.');
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

  with_callback_handlers() {
    this.#commandHandler.setup_callback_handlers(this.#bot);
    return this;
  }

  with_inline_mode() {
    this.#commandHandler.setup_inline_mode(this.#bot);
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
