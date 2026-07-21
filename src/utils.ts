import { type FileInfo, FileType, type StorageStats, type UploadResult } from './type';

export function file_type_to_string(file_type: FileType): string {
  switch (file_type) {
    case FileType.MUSIC:
      return '🎵 موسیقی';
    case FileType.DOCUMENTS:
      return '📄 اسناد';
    case FileType.IMAGES:
      return '🖼️ تصاویر';
    case FileType.VIDEOS:
      return '🎬 ویدیوها';
    default:
      return '📂 همه فایل‌ها';
  }
}

export function format_size(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} گیگابایت`;
}

export function parse_duration(duration_str: string): number | null {
  const match = duration_str.match(/^(\d+)(h|d|m)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

export class MessageFormatter {
  /**
   * 转义 MarkdownV2 特殊字符
   */
  static escape_md(text: string): string {
    // 仅转义 MarkdownV2 规定的特殊字符
    return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }

  /**
   * 转义 URL 中的 MarkdownV2 特殊字符（用于链接文本和 URL）
   */
  static escape_url(text: string): string {
    // URL 中需要转义 ) 和 \，因为 MarkdownV2 链接语法是 [text](url)
    return text.replace(/[)\\]/g, '\\$&');
  }

  static format_file_list(files: FileInfo[], file_type: FileType): string {
    const file_type_str = file_type_to_string(file_type);

    let message = `📂 *لیست ${this.escape_md(file_type_str)} در B2*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const file of files) {
      const data_str = new Date(file.uploaded).toLocaleString('fa-IR');
      const size_str = format_size(file.size);

      message += `📄 \`${this.escapeCodeBlock(file.key)}\`\n`;
      message += `├ 👤 *آپلودکننده:* ${this.escape_md(file.author)}\n`;
      message += `├ 📏 *حجم:* ${this.escape_md(size_str)}\n`;
      message += `├ 🕒 *زمان:* ${this.escape_md(data_str)}\n`;
      const escaped_url = this.escape_url(file.url);
      message += `└ 🔗 [دانلود فایل](${escaped_url})\n\n`;
    }

    return message;
  }

  /**
   * 在 MarkdownV2 的 ``` 代码块内，仅需转义反斜杠和反引号。
   */
  static escapeCodeBlock(text: string): string {
    return text.replace(/[`\\]/g, '\\$&');
  }

  static format_upload_success(file: UploadResult): string {
    const size_str = format_size(file.size);
    const data_str = new Date(file.uploaded).toLocaleString('fa-IR');

    const lines = [
      `✅ *فایل با موفقیت آپلود شد*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📄 *نام فایل:* \`${this.escapeCodeBlock(file.key)}\``,
      `👤 *آپلودکننده:* ${this.escape_md(file.author)}`,
      `📏 *حجم فایل:* ${this.escape_md(size_str)}`,
      `🕒 *زمان آپلود:* ${this.escape_md(data_str)}`,
      ``,
      `🔗 [دانلود فایل](${this.escape_url(file.url)})`,
    ];

    if (file.content_type.startsWith('image/')) {
      const filename = file.key.split('/').pop() || file.key;
      const markdown = `![${filename}](${file.url})`;
      lines.push(
        ``,
        `📋 *Markdown \\(برای کپی\\):*`,
        `\`\`\``,
        this.escapeCodeBlock(markdown),
        `\`\`\``,
      );
    }

    return lines.join('\n');
  }

  static get_help_message(): string {
    return (
      '🎮 *دستورات بات:*\n\n' +
      '📌 `/start` — پیام خوش‌آمدگویی\n' +
      '📌 `/help` — راهنمای دستورات\n' +
      '📌 `/list` — لیست فایل‌ها (مثال: `/list -t music`)\n' +
      '📌 `/delete key` — حذف فایل\n' +
      '📌 `/stats` — آمار ذخیره‌سازی\n' +
      '📌 `/search کلمه` — جستجوی فایل\n' +
      '📌 `/share فایل مدت` — لینک موقت (مثال: `/share file.mp3 24h`)\n' +
      '📌 `/folders` — مدیریت فولدرها\n' +
      '📌 `/mkdir نام` — ساخت فولدر\n' +
      '📌 `/cd نام` — ورود به فولدر\n' +
      '📌 `/move فایل فولدر` — انتقال فایل\n\n' +
      '🛡️ *دستورات ادمین:*\n' +
      '📌 `/admin` — پنل مدیریت\n' +
      '📌 `/block @username` — بلاک کاربر\n' +
      '📌 `/unblock @username` — آنبلاک کاربر\n' +
      '📌 `/list_blocked` — لیست کاربران بلاک‌شده\n\n' +
      '💡 *نکته:* در هر چتی میتونی @botname رو تایپ کنی تا فایل‌هات رو مستقیم بفرستی!'
    );
  }

  static format_stats(stats: StorageStats, username: string): string {
    const total_size_str = format_size(stats.total_size);
    const lines = [
      `📊 *آمار ذخیره‌سازی برای* @${this.escape_md(username)}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `📦 *کل فایل‌ها:* ${stats.total_files}`,
      `💾 *حجم کل:* ${this.escape_md(total_size_str)}`,
      ``,
      `🎵 *موسیقی:* ${stats.by_type.music.count} فایل \\(${this.escape_md(format_size(stats.by_type.music.size))}\\)`,
      `🖼️ *تصاویر:* ${stats.by_type.images.count} فایل \\(${this.escape_md(format_size(stats.by_type.images.size))}\\)`,
      `🎬 *ویدیوها:* ${stats.by_type.videos.count} فایل \\(${this.escape_md(format_size(stats.by_type.videos.size))}\\)`,
      `📄 *اسناد:* ${stats.by_type.documents.count} فایل \\(${this.escape_md(format_size(stats.by_type.documents.size))}\\)`,
    ];
    return lines.join('\n');
  }

  static format_admin_panel(): string {
    return (
      '🔧 *پنل مدیریت*\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      'یکی از گزینه‌ها رو انتخاب کن:'
    );
  }

  static format_search_results(files: FileInfo[], keyword: string, page: number, totalPages: number): string {
    const lines = [
      `🔍 *نتایج جستجو برای:* ${this.escape_md(keyword)}`,
      `📄 *صفحه ${page} از ${totalPages}*`,
      `━━━━━━━━━━━━━━━━━━━━\n`,
    ];

    for (const file of files) {
      const size_str = format_size(file.size);
      const filename = file.key.split('/').pop() || file.key;
      lines.push(`📎 \`${this.escapeCodeBlock(filename)}\` — ${this.escape_md(size_str)}`);
    }

    return lines.join('\n');
  }

  static format_share_link(baseUrl: string, token: string): string {
    const url = `${baseUrl}/file/${token}`;
    const lines = [
      `🔗 *لینک موقت ساخته شد!*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `📎 لینک دانلود:`,
      this.escape_url(url),
    ];
    return lines.join('\n');
  }

  static format_folder_list(folders: { id: number; name: string }[], currentPath: string): string {
    const breadcrumb = currentPath || '/';
    const lines = [
      `📂 *فولدرها* \\(${this.escape_md(breadcrumb)}\\)`,
      `━━━━━━━━━━━━━━━━━━━━\n`,
    ];

    if (folders.length === 0) {
      lines.push(`📁 فولدری وجود ندارد.`);
    } else {
      for (const folder of folders) {
        lines.push(`📁 \`${this.escapeCodeBlock(folder.name)}\``);
      }
    }

    lines.push(`\n💡 از /mkdir برای ساخت فولدر جدید استفاده کنید.`);
    lines.push(`💡 از /cd نام برای ورود به فولدر استفاده کنید.`);
    lines.push(`💡 از /cd .. برای بازگشت استفاده کنید.`);

    return lines.join('\n');
  }
}

/**
 * Parse command arguments in the format: -t(ype) value -u(username) value
 * Example: -t music -u fwqaaq
 * Returns: { t: 'music', u: 'fwqaaq' }
 * Also supports long options: --type music --username fwqaaq
 * @param text string
 */
export function arguments_parser(text: string) {
  const args: Record<string, string> = {};

  // Match short options: -t value, -u value (value can contain hyphens)
  const short_regex = /-([a-zA-Z])\s+([^\s-]+(?:\s+[^\s-]+)*)?/g;
  // Match long options: --type value, --username value
  const long_regex = /--([a-zA-Z]+)\s+([^\s-]+(?:\s+[^\s-]+)*)?/g;

  let m;
  while ((m = short_regex.exec(text)) !== null) {
    args[m[1]] = m[2];
  }
  while ((m = long_regex.exec(text)) !== null) {
    args[m[1]] = m[2];
  }

  return args;
}
