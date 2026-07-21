/**
 * Web upload page for uploading files to B2 via Cloudflare Worker
 * Access: https://your-worker.dev/upload
 */
import type { Env } from "./type";

export function get_upload_page_html(): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>آپلود فایل</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Vazirmatn', sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 500px;
      padding: 20px;
    }
    .card {
      background: #1a1a2e;
      border-radius: 16px;
      padding: 40px 30px;
      border: 1px solid #2a2a4a;
    }
    h1 {
      text-align: center;
      font-size: 1.5em;
      margin-bottom: 8px;
      color: #fff;
    }
    .subtitle {
      text-align: center;
      color: #888;
      font-size: 0.9em;
      margin-bottom: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #aaa;
      font-size: 0.9em;
    }
    input[type="password"],
    input[type="text"],
    select {
      width: 100%;
      padding: 12px 16px;
      background: #0f0f1a;
      border: 1px solid #3a3a5a;
      border-radius: 10px;
      color: #fff;
      font-family: inherit;
      font-size: 1em;
      outline: none;
      transition: border-color 0.3s;
    }
    input:focus, select:focus {
      border-color: #6c63ff;
    }
    .upload-zone {
      border: 2px dashed #3a3a5a;
      border-radius: 12px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      margin-bottom: 20px;
    }
    .upload-zone:hover, .upload-zone.dragover {
      border-color: #6c63ff;
      background: rgba(108, 99, 255, 0.05);
    }
    .upload-zone .icon {
      font-size: 3em;
      margin-bottom: 10px;
    }
    .upload-zone p {
      color: #888;
      font-size: 0.9em;
    }
    .upload-zone .filename {
      color: #6c63ff;
      font-weight: 600;
      margin-top: 10px;
      font-size: 0.95em;
    }
    input[type="file"] {
      display: none;
    }
    .btn {
      width: 100%;
      padding: 14px;
      background: #6c63ff;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-family: inherit;
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }
    .btn:hover { background: #5a52e0; }
    .btn:disabled { background: #3a3a5a; cursor: not-allowed; }
    .progress-bar {
      width: 100%;
      height: 6px;
      background: #2a2a4a;
      border-radius: 3px;
      margin: 15px 0;
      overflow: hidden;
      display: none;
    }
    .progress-bar .fill {
      height: 100%;
      background: #6c63ff;
      border-radius: 3px;
      width: 0%;
      transition: width 0.3s;
    }
    .result {
      text-align: center;
      padding: 15px;
      border-radius: 10px;
      margin-top: 15px;
      display: none;
      font-size: 0.9em;
    }
    .result.success {
      background: rgba(76, 175, 80, 0.15);
      border: 1px solid rgba(76, 175, 80, 0.3);
      color: #4caf50;
    }
    .result.error {
      background: rgba(244, 67, 54, 0.15);
      border: 1px solid rgba(244, 67, 54, 0.3);
      color: #f44336;
    }
    .result a {
      color: #6c63ff;
      word-break: break-all;
    }
    #login-section, #upload-section { display: none; }
    #login-section.active, #upload-section.active { display: block; }
    .file-types {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 10px;
    }
    .file-types span {
      background: #2a2a4a;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75em;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>آپلود فایل</h1>
      <p class="subtitle">فایل‌هات رو روی فضای ابری ذخیره کن</p>

      <!-- Login Section -->
      <div id="login-section" class="active">
        <div class="form-group">
          <label>رمز عبور</label>
          <input type="password" id="password" placeholder="رمز رو وارد کن..." autocomplete="current-password">
        </div>
        <button class="btn" id="login-btn">ورود</button>
        <div class="result error" id="login-error"></div>
      </div>

      <!-- Upload Section -->
      <div id="upload-section">
        <div class="form-group">
          <label>نوع فایل</label>
          <select id="file-type">
            <option value="auto">تشخیص خودکار</option>
            <option value="music">موسیقی</option>
            <option value="images">تصاویر</option>
            <option value="videos">ویدیو</option>
            <option value="documents">اسناد</option>
          </select>
        </div>

        <div class="upload-zone" id="drop-zone">
          <div class="icon">📁</div>
          <p>فایل رو بکش اینجا یا کلیک کن</p>
          <div class="filename" id="file-name"></div>
          <div class="file-types">
            <span>MP3</span><span>MP4</span><span>JPG</span><span>PNG</span><span>PDF</span><span>ZIP</span>
          </div>
        </div>
        <input type="file" id="file-input">

        <button class="btn" id="upload-btn" disabled>آپلود</button>
        <div class="progress-bar" id="progress">
          <div class="fill" id="progress-fill"></div>
        </div>
        <div class="result" id="upload-result"></div>
      </div>
    </div>
  </div>

  <script>
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    const loginSection = document.getElementById('login-section');
    const uploadSection = document.getElementById('upload-section');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const uploadBtn = document.getElementById('upload-btn');
    const fileType = document.getElementById('file-type');
    const progress = document.getElementById('progress');
    const progressFill = document.getElementById('progress-fill');
    const uploadResult = document.getElementById('upload-result');

    let selectedFile = null;
    let authToken = null;

    // Check if already logged in
    if (sessionStorage.getItem('upload_token')) {
      authToken = sessionStorage.getItem('upload_token');
      showUploadSection();
    }

    // Login
    loginBtn.onclick = async () => {
      const pwd = passwordInput.value.trim();
      if (!pwd) { showError(loginError, 'رمز رو وارد کن'); return; }
      loginBtn.disabled = true;
      loginBtn.textContent = 'صبر کن...';
      try {
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', password: pwd })
        });
        const data = await resp.json();
        if (data.ok) {
          authToken = pwd;
          sessionStorage.setItem('upload_token', pwd);
          showUploadSection();
        } else {
          showError(loginError, data.error || 'رمز اشتباهه');
        }
      } catch (e) {
        showError(loginError, 'خطا در اتصال');
      }
      loginBtn.disabled = false;
      loginBtn.textContent = 'ورود';
    };

    passwordInput.onkeydown = (e) => { if (e.key === 'Enter') loginBtn.click(); };

    function showUploadSection() {
      loginSection.classList.remove('active');
      uploadSection.classList.add('active');
    }

    // File selection
    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
    dropZone.ondragleave = () => dropZone.classList.remove('dragover');
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        selectedFile = e.dataTransfer.files[0];
        fileName.textContent = selectedFile.name;
        uploadBtn.disabled = false;
        autoDetectType(selectedFile.name);
      }
    };
    fileInput.onchange = () => {
      if (fileInput.files.length) {
        selectedFile = fileInput.files[0];
        fileName.textContent = selectedFile.name;
        uploadBtn.disabled = false;
        autoDetectType(selectedFile.name);
      }
    };

    function autoDetectType(name) {
      const ext = name.split('.').pop().toLowerCase();
      const music = ['mp3','wav','flac','aac','ogg','m4a','wma'];
      const images = ['jpg','jpeg','png','gif','webp','bmp','svg'];
      const videos = ['mp4','mkv','avi','mov','wmv','flv','webm'];
      if (music.includes(ext)) fileType.value = 'music';
      else if (images.includes(ext)) fileType.value = 'images';
      else if (videos.includes(ext)) fileType.value = 'videos';
      else fileType.value = 'documents';
    }

    // Upload
    uploadBtn.onclick = async () => {
      if (!selectedFile) return;
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'در حال آپلود...';
      progress.style.display = 'block';
      progressFill.style.width = '0%';
      uploadResult.style.display = 'none';

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', fileType.value);
      formData.append('password', authToken);

      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            progressFill.style.width = Math.round((e.loaded / e.total) * 100) + '%';
          }
        };

        xhr.onload = () => {
          const data = JSON.parse(xhr.responseText);
          if (data.ok) {
            uploadResult.className = 'result success';
            uploadResult.innerHTML = 'آپلود شد!<br><a href="' + data.url + '" target="_blank">' + data.url + '</a>';
          } else {
            uploadResult.className = 'result error';
            uploadResult.textContent = data.error || 'خطا در آپلود';
          }
          uploadResult.style.display = 'block';
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'آپلود';
        };

        xhr.onerror = () => {
          uploadResult.className = 'result error';
          uploadResult.textContent = 'خطا در اتصال';
          uploadResult.style.display = 'block';
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'آپلود';
        };

        xhr.send(formData);
      } catch (e) {
        uploadResult.className = 'result error';
        uploadResult.textContent = 'خطا: ' + e.message;
        uploadResult.style.display = 'block';
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'آپلود';
      }
    };

    function showError(el, msg) {
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 3000);
    }
  </script>
</body>
</html>`;
}

/**
 * Handle web file upload
 */
export async function handle_web_upload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Serve upload page
  if (request.method === 'GET' && url.pathname === '/upload') {
    return new Response(get_upload_page_html(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Handle API requests
  if (request.method === 'POST' && url.pathname === '/api/upload') {
    return await handle_upload_api(request, env);
  }

  return new Response('Not Found', { status: 404 });
}

async function handle_upload_api(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get('Content-Type') || '';

  // Handle JSON (login check)
  if (contentType.includes('application/json')) {
    const body = await request.json() as any;
    if (body.action === 'login') {
      if (body.password === env.WEB_UPLOAD_PASSWORD) {
        return jsonResponse({ ok: true });
      }
      return jsonResponse({ ok: false, error: 'رمز اشتباهه' }, 401);
    }
    return jsonResponse({ ok: false, error: 'invalid action' }, 400);
  }

  // Handle FormData (file upload)
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const password = formData.get('password') as string;
    const file = formData.get('file') as unknown as File;
    const type = (formData.get('type') as string) || 'auto';

    if (password !== env.WEB_UPLOAD_PASSWORD) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
    }

    if (!file) {
      return jsonResponse({ ok: false, error: 'فایلی انتخاب نشده' }, 400);
    }

    // Detect file type
    let fileType = type;
    if (fileType === 'auto') {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const music = ['mp3','wav','flac','aac','ogg','m4a','wma'];
      const images = ['jpg','jpeg','png','gif','webp','bmp','svg'];
      const videos = ['mp4','mkv','avi','mov','wmv','flv','webm'];
      if (music.includes(ext)) fileType = 'music';
      else if (images.includes(ext)) fileType = 'images';
      else if (videos.includes(ext)) fileType = 'videos';
      else fileType = 'documents';
    }

    try {
      const StorageManager = (await import('./storage')).default;
      const storage = new StorageManager(env);

      const buffer = await file.arrayBuffer();
      const result = await storage.upload_file({
        key: file.name,
        file_type: fileType as any,
        file_buffer: buffer,
        content_type: file.type || 'application/octet-stream',
        author: 'web',
      });

      return jsonResponse({
        ok: true,
        url: result.url,
        key: result.key,
        size: result.size,
      });
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e.message || 'خطا در آپلود' }, 500);
    }
  }

  return jsonResponse({ ok: false, error: 'invalid content type' }, 400);
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
