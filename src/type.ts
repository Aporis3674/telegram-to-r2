export interface Env {
  BASE_URL: string;
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  ADMIN_USERNAMES: string[];
  DB: D1Database;

  // B2 credentials
  B2_KEY_ID: string;
  B2_APPLICATION_KEY: string;
  B2_BUCKET_ID: string;
  B2_BUCKET_NAME: string;
  B2_DOWNLOAD_URL: string;
}

export enum FileType {
  MUSIC = "music",
  IMAGES = "images",
  VIDEOS = "videos",
  DOCUMENTS = "documents",
  NULL = "null",
}

export interface FileInfo {
  key: string;
  size: number;
  uploaded: string;
  url: string;
  author: string;
}

export type UploadedFileInfo = {
  key: string;
  file_type: FileType;
  file_buffer:
    | ReadableStream
    | ArrayBuffer
    | ArrayBufferView
    | string
    | null
    | Blob;
  content_type: string;
  author: string;
};

export type UploadResult = FileInfo & { content_type: string };
