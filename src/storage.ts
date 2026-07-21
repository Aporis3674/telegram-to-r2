import type { Env, FileInfo, StorageStats, UploadedFileInfo, UploadResult } from "./type";
import { FileType } from "./type";

interface B2Auth {
  token: string;
  apiUrl: string;
  downloadUrl: string;
}

interface B2UploadUrl {
  uploadUrl: string;
  authorizationToken: string;
}

export default class StorageManager {
  #env: Env;
  #base_url: string;
  #auth: B2Auth | null = null;
  #uploadUrl: B2UploadUrl | null = null;

  constructor(env: Env) {
    this.#env = env;
    this.#base_url = env.BASE_URL.replace(/\/+$/, "") + "/";
  }

  async #get_auth(): Promise<B2Auth> {
    if (this.#auth) return this.#auth;

    const keyId = this.#env.B2_KEY_ID;
    const appKey = this.#env.B2_APPLICATION_KEY;

    const credentials = btoa(`${keyId}:${appKey}`);

    const resp = await fetch(
      "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
      {
        headers: { Authorization: `Basic ${credentials}` },
      }
    );

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`B2 auth failed: ${resp.status} - ${body}`);
    }

    const data = (await resp.json()) as any;
    this.#auth = {
      token: data.authorizationToken,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
    };
    return this.#auth;
  }

  async #get_upload_url(): Promise<B2UploadUrl> {
    if (this.#uploadUrl) return this.#uploadUrl;

    const auth = await this.#get_auth();
    const resp = await fetch(
      `${auth.apiUrl}/b2api/v2/b2_get_upload_url`,
      {
        method: "POST",
        headers: {
          Authorization: auth.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bucketId: this.#env.B2_BUCKET_ID }),
      }
    );

    if (!resp.ok) throw new Error(`B2 get upload url failed: ${resp.status}`);

    const data = (await resp.json()) as any;
    this.#uploadUrl = {
      uploadUrl: data.uploadUrl,
      authorizationToken: data.authorizationToken,
    };
    return this.#uploadUrl;
  }

  /**
   * Build Key: username/file_type/filename
   */
  #build_key(author: string, file_type: FileType, filename: string, folderPath?: string): string {
    if (folderPath) {
      return `${author}/${folderPath}/${file_type}/${filename}`;
    }
    return `${author}/${file_type}/${filename}`;
  }

  /**
   * Encode key preserving / separators
   */
  #encode_key(key: string): string {
    return key.split("/").map(encodeURIComponent).join("/");
  }

  /**
   * SHA1 hash for B2 upload (using Web Crypto)
   */
  async #sha1(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async list_files(
    file_type: FileType,
    target_user: string
  ): Promise<FileInfo[]> {
    const auth = await this.#get_auth();

    const prefix =
      target_user === "all"
        ? ""
        : [target_user, file_type]
            .filter((p) => p && p !== FileType.NULL)
            .join("/") + "/";

    const files: FileInfo[] = [];
    let startFileName: string | undefined = undefined;

    while (true) {
      const body: any = {
        bucketId: this.#env.B2_BUCKET_ID,
        maxFileCount: 100,
        prefix,
      };
      if (startFileName) body.startFileName = startFileName;

      const resp = await fetch(
        `${auth.apiUrl}/b2api/v2/b2_list_file_names`,
        {
          method: "POST",
          headers: {
            Authorization: auth.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) throw new Error(`B2 list failed: ${resp.status}`);

      const data = (await resp.json()) as any;

      for (const f of data.files) {
        const key = f.fileName;
        // If admin lists all but file_type is specified, filter
        if (target_user === "all" && file_type !== FileType.NULL) {
          const parts = key.split("/");
          if (parts[1] !== file_type) continue;
        }

        files.push({
          key,
          size: f.size,
          uploaded: new Date(f.uploadTimestamp).toLocaleString(),
          author: f.fileInfo?.uploadedBy || key.split("/")[0],
          url: this.#base_url.concat("file/", this.#encode_key(key)),
        });
      }

      if (!data.nextFileName) break;
      startFileName = data.nextFileName;
    }

    return files;
  }

  /**
   * List all files for a user (for stats and inline mode)
   */
  async list_all_user_files(target_user: string): Promise<FileInfo[]> {
    const auth = await this.#get_auth();

    const prefix = target_user === "all" ? "" : `${target_user}/`;

    const files: FileInfo[] = [];
    let startFileName: string | undefined = undefined;

    while (true) {
      const body: any = {
        bucketId: this.#env.B2_BUCKET_ID,
        maxFileCount: 100,
        prefix,
      };
      if (startFileName) body.startFileName = startFileName;

      const resp = await fetch(
        `${auth.apiUrl}/b2api/v2/b2_list_file_names`,
        {
          method: "POST",
          headers: {
            Authorization: auth.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) throw new Error(`B2 list failed: ${resp.status}`);

      const data = (await resp.json()) as any;

      for (const f of data.files) {
        files.push({
          key: f.fileName,
          size: f.size,
          uploaded: new Date(f.uploadTimestamp).toLocaleString(),
          author: f.fileInfo?.uploadedBy || f.fileName.split("/")[0],
          url: this.#base_url.concat(this.#encode_key(f.fileName)),
        });
      }

      if (!data.nextFileName) break;
      startFileName = data.nextFileName;
    }

    return files;
  }

  /**
   * Search files by keyword
   */
  async search_files(keyword: string, target_user: string): Promise<FileInfo[]> {
    const files = await this.list_all_user_files(target_user);
    const lowerKeyword = keyword.toLowerCase();
    return files.filter((f) => {
      const filename = f.key.split("/").pop()?.toLowerCase() || "";
      return filename.includes(lowerKeyword);
    });
  }

  /**
   * Get storage stats for a user
   */
  async get_stats(target_user: string): Promise<StorageStats> {
    const files = await this.list_all_user_files(target_user);
    const stats: StorageStats = {
      total_files: files.length,
      total_size: 0,
      by_type: {
        music: { count: 0, size: 0 },
        images: { count: 0, size: 0 },
        videos: { count: 0, size: 0 },
        documents: { count: 0, size: 0 },
      },
    };

    for (const file of files) {
      stats.total_size += file.size;
      const parts = file.key.split("/");
      const fileType = parts.length > 1 ? parts[1] : "documents";
      switch (fileType) {
        case FileType.MUSIC:
          stats.by_type.music.count++;
          stats.by_type.music.size += file.size;
          break;
        case FileType.IMAGES:
          stats.by_type.images.count++;
          stats.by_type.images.size += file.size;
          break;
        case FileType.VIDEOS:
          stats.by_type.videos.count++;
          stats.by_type.videos.size += file.size;
          break;
        case FileType.DOCUMENTS:
        default:
          stats.by_type.documents.count++;
          stats.by_type.documents.size += file.size;
          break;
      }
    }

    return stats;
  }

  async upload_file(info: UploadedFileInfo, folderPath?: string): Promise<UploadResult> {
    const { key: filename, file_type, file_buffer, content_type, author } = info;

    const fullKey = this.#build_key(author, file_type, filename, folderPath);
    const uploadUrlInfo = await this.#get_upload_url();

    // Convert to ArrayBuffer for SHA1
    let arrayBuffer: ArrayBuffer;
    if (file_buffer instanceof ArrayBuffer) {
      arrayBuffer = file_buffer;
    } else if (file_buffer instanceof Blob) {
      arrayBuffer = await file_buffer.arrayBuffer();
    } else if (typeof file_buffer === "string") {
      arrayBuffer = new TextEncoder().encode(file_buffer).buffer;
    } else if (file_buffer instanceof ReadableStream) {
      const reader = file_buffer.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      arrayBuffer = result.buffer;
    } else if (file_buffer) {
      // ArrayBufferView
      arrayBuffer = (file_buffer as ArrayBufferView).buffer;
    } else {
      throw new Error("Invalid file buffer");
    }

    const sha1 = await this.#sha1(arrayBuffer);

    const resp = await fetch(uploadUrlInfo.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: uploadUrlInfo.authorizationToken,
        "Content-Type": content_type,
        "X-Bz-File-Name": encodeURIComponent(fullKey),
        "X-Bz-Content-Sha1": sha1,
        "X-Bz-Info-uploadedby": encodeURIComponent(author),
      },
      body: arrayBuffer,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`B2 upload failed: ${resp.status} ${errText}`);
    }

    const data = (await resp.json()) as any;
    return {
      key: fullKey,
      size: data.size || arrayBuffer.byteLength,
      uploaded: new Date(data.uploadTimestamp || Date.now()).toLocaleString(),
      author,
      url: this.#base_url.concat("file/", this.#encode_key(fullKey)),
      content_type,
    };
  }

  async delete_file(key: string): Promise<void> {
    const auth = await this.#get_auth();

    // First get the file ID
    const listResp = await fetch(
      `${auth.apiUrl}/b2api/v2/b2_list_file_names`,
      {
        method: "POST",
        headers: {
          Authorization: auth.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketId: this.#env.B2_BUCKET_ID,
          maxFileCount: 1,
          startFileName: key,
        }),
      }
    );

    if (!listResp.ok) throw new Error(`B2 list for delete failed: ${listResp.status}`);

    const listData = (await listResp.json()) as any;
    const file = listData.files?.find((f: any) => f.fileName === key);
    if (!file) throw new Error("File not found");

    // Delete the file
    const delResp = await fetch(
      `${auth.apiUrl}/b2api/v2/b2_delete_file_version`,
      {
        method: "POST",
        headers: {
          Authorization: auth.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: key,
          fileId: file.fileId,
        }),
      }
    );

    if (!delResp.ok) throw new Error(`B2 delete failed: ${delResp.status}`);
  }

  async head_file(key: string): Promise<{ exists: boolean; size?: number }> {
    const auth = await this.#get_auth();

    const resp = await fetch(
      `${auth.apiUrl}/b2api/v2/b2_list_file_names`,
      {
        method: "POST",
        headers: {
          Authorization: auth.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketId: this.#env.B2_BUCKET_ID,
          maxFileCount: 1,
          startFileName: key,
        }),
      }
    );

    if (!resp.ok) return { exists: false };

    const data = (await resp.json()) as any;
    const file = data.files?.find((f: any) => f.fileName === key);
    if (!file) return { exists: false };

    return { exists: true, size: file.size };
  }

  /**
   * Copy a file within B2 (download + re-upload)
   */
  async copy_file(sourceKey: string, destKey: string): Promise<void> {
    const auth = await this.#get_auth();

    // Download the source file
    const downloadUrl = this.#env.B2_DOWNLOAD_URL || auth.downloadUrl;
    const resp = await fetch(
      `${downloadUrl}/file/${this.#env.B2_BUCKET_NAME}/${encodeURIComponent(sourceKey)}`,
      {
        headers: {
          Authorization: auth.token,
        },
      }
    );

    if (!resp.ok) throw new Error(`B2 download for copy failed: ${resp.status}`);

    const arrayBuffer = await resp.arrayBuffer();
    const contentType = resp.headers.get("Content-Type") || "application/octet-stream";
    const sha1 = await this.#sha1(arrayBuffer);

    // Upload to new location
    const uploadUrlInfo = await this.#get_upload_url();
    const uploadResp = await fetch(uploadUrlInfo.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: uploadUrlInfo.authorizationToken,
        "Content-Type": contentType,
        "X-Bz-File-Name": encodeURIComponent(destKey),
        "X-Bz-Content-Sha1": sha1,
      },
      body: arrayBuffer,
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      throw new Error(`B2 upload for copy failed: ${uploadResp.status} ${errText}`);
    }
  }

  /**
   * Proxy download from B2 - streams the file to the client
   */
  async serve_file(key: string): Promise<Response | null> {
    const auth = await this.#get_auth();
    const downloadUrl = this.#env.B2_DOWNLOAD_URL || auth.downloadUrl;

    const resp = await fetch(
      `${downloadUrl}/file/${this.#env.B2_BUCKET_NAME}/${encodeURIComponent(key)}`,
      {
        headers: {
          Authorization: auth.token,
        },
      }
    );

    if (!resp.ok) return null;

    return new Response(resp.body, {
      headers: {
        "Content-Type": resp.headers.get("Content-Type") || "application/octet-stream",
        "Content-Length": resp.headers.get("Content-Length") || "",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
