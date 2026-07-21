export interface Env {
  BASE_URL: string;
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  ADMIN_USERNAMES: string[];
  ALLOWED_USER_IDS: string;
  WEB_UPLOAD_PASSWORD: string;
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

export interface StorageConfig {
  bucket: R2Bucket;
  base_url: string;
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

export interface ShareTokenRow {
  id: number;
  token: string;
  file_key: string;
  expires_at: Date;
  created_by: string;
  created_at: Date;
}

export interface FolderRow {
  id: number;
  name: string;
  parent_id: number | null;
  user_id: string;
  created_at: Date;
}

export interface StorageStats {
  total_files: number;
  total_size: number;
  by_type: {
    music: { count: number; size: number };
    images: { count: number; size: number };
    videos: { count: number; size: number };
    documents: { count: number; size: number };
  };
}
