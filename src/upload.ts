/**
 * Web upload page and API endpoints
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
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0f; color: #e0e0e0; font-family: 'Vazirmatn', Tahoma, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background-image: radial-gradient(ellipse at 50% 0%, rgba(74,158,255,0.08) 0%, transparent 60%); }
    .container { background: linear-gradient(145deg, #141420, #1a1a2e); border-radius: 20px; padding: 40px; width: 100%; max-width: 480px; border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 20px 60px rgba(0,0,0,0.5); backdrop-filter: blur(10px); }
    .logo { text-align: center; margin-bottom: 28px; }
    .logo svg { width: 48px; height: 48px; }
    h1 { text-align: center; margin-bottom: 8px; color: #fff; font-size: 1.5em; font-weight: 700; }
    .subtitle { text-align: center; color: #666; font-size: 0.85em; margin-bottom: 28px; }
    .login-form { display: flex; flex-direction: column; gap: 14px; }
    input[type="password"], select { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 18px; color: #fff; font-size: 0.95em; font-family: 'Vazirmatn', Tahoma; direction: ltr; text-align: left; transition: all 0.2s; }
    input:focus, select:focus { outline: none; border-color: rgba(74,158,255,0.5); background: rgba(74,158,255,0.05); box-shadow: 0 0 0 3px rgba(74,158,255,0.1); }
    input::placeholder { color: #555; }
    button { background: linear-gradient(135deg, #4a9eff, #3575d4); color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 0.95em; cursor: pointer; font-family: 'Vazirmatn', Tahoma; font-weight: 500; transition: all 0.2s; }
    button:hover { background: linear-gradient(135deg, #5aaeff, #4585e4); transform: translateY(-1px); box-shadow: 0 4px 15px rgba(74,158,255,0.3); }
    button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
    .error { color: #ff6b6b; text-align: center; font-size: 0.85em; margin-top: 4px; }
    .drop-zone { border: 2px dashed rgba(255,255,255,0.1); border-radius: 16px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all 0.3s; margin: 18px 0; position: relative; overflow: hidden; }
    .drop-zone::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(74,158,255,0.04) 0%, transparent 70%); opacity: 0; transition: opacity 0.3s; }
    .drop-zone:hover, .drop-zone.dragover { border-color: rgba(74,158,255,0.4); background: rgba(74,158,255,0.03); }
    .drop-zone:hover::before, .drop-zone.dragover::before { opacity: 1; }
    .drop-icon { font-size: 2.5em; margin-bottom: 12px; display: block; opacity: 0.6; }
    .drop-zone p { color: #666; font-size: 0.9em; line-height: 1.6; }
    .drop-zone p span { color: #4a9eff; }
    .file-name { color: #fff; font-weight: 500; word-break: break-all; font-size: 0.95em; }
    .file-meta { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: 10px; }
    .file-meta .icon { font-size: 1.4em; }
    .file-meta .info { flex: 1; }
    .file-meta .info .name { color: #fff; font-size: 0.9em; word-break: break-all; }
    .file-meta .info .size { color: #666; font-size: 0.8em; margin-top: 2px; }
    .file-meta .remove { background: rgba(255,107,107,0.1); color: #ff6b6b; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1em; transition: all 0.2s; }
    .file-meta .remove:hover { background: rgba(255,107,107,0.2); }
    .progress { display: none; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; height: 6px; margin: 18px 0 8px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #4a9eff, #7b61ff); width: 0%; transition: width 0.3s; border-radius: 10px; }
    .progress-text { display: none; text-align: center; color: #666; font-size: 0.8em; margin-bottom: 12px; }
    .result { display: none; padding: 14px 18px; border-radius: 12px; margin-top: 16px; word-break: break-all; font-size: 0.9em; line-height: 1.6; }
    .result.success { background: rgba(46,200,100,0.08); border: 1px solid rgba(46,200,100,0.2); color: #2ec864; }
    .result.error { background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.2); color: #ff6b6b; }
    .result a { color: #4a9eff; text-decoration: none; }
    .result a:hover { text-decoration: underline; }
    .hidden { display: none !important; }
    select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 16px center; padding-left: 36px; }
    select option { background: #1a1a2e; color: #fff; }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .uploading { animation: pulse 1.5s infinite; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="rgba(74,158,255,0.1)"/><path d="M24 14l8 8h-5v10h-6V22h-5l8-8z" fill="#4a9eff"/><path d="M14 32h20v2H14v-2z" fill="rgba(74,158,255,0.3)"/></svg>
    </div>
    <h1>آپلود فایل</h1>
    <p class="subtitle">فایل‌هات رو مستقیم روی فضای ابری آپلود کن</p>

    <div id="loginPanel" class="login-form">
      <input type="password" id="password" placeholder="رمز عبور" />
      <button id="loginBtn">ورود</button>
      <div id="loginError" class="error"></div>
    </div>

    <div id="uploadPanel" class="hidden">
      <div class="drop-zone" id="dropZone">
        <span class="drop-icon">☁️</span>
        <p>فایل رو بکش اینجا یا <span>انتخاب کن</span></p>
        <input type="file" id="fileInput" style="display:none" />
      </div>
      <div id="fileInfo" class="hidden fade-in">
        <div class="file-meta">
          <span class="icon" id="fileIcon">📄</span>
          <div class="info">
            <div class="name" id="fileName"></div>
            <div class="size" id="fileSize"></div>
          </div>
          <button class="remove" id="removeFile" title="حذف">✕</button>
        </div>
      </div>
      <select id="fileType">
        <option value="auto">تشخیص خودکار نوع فایل</option>
        <option value="images">🖼️ عکس</option>
        <option value="videos">🎬 ویدیو</option>
        <option value="music">🎵 موسیقی</option>
        <option value="documents">📄 سند</option>
      </select>
      <button id="uploadBtn" class="hidden fade-in">آپلود فایل</button>
      <div class="progress" id="progress"><div class="progress-fill" id="progressFill"></div></div>
      <div class="progress-text" id="progressText">0%</div>
      <div class="result" id="uploadResult"></div>
    </div>
  </div>

  <script>
    let authToken = localStorage.getItem('upload_token');
    let selectedFile = null;

    const loginPanel = document.getElementById('loginPanel');
    const uploadPanel = document.getElementById('uploadPanel');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileIcon = document.getElementById('fileIcon');
    const removeFile = document.getElementById('removeFile');
    const fileType = document.getElementById('fileType');
    const uploadBtn = document.getElementById('uploadBtn');
    const progress = document.getElementById('progress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadResult = document.getElementById('uploadResult');

    if (authToken) {
      loginPanel.classList.add('hidden');
      uploadPanel.classList.remove('hidden');
    }

    loginBtn.onclick = async () => {
      const pw = document.getElementById('password').value;
      if (!pw) return;
      loginBtn.disabled = true;
      try {
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', password: pw }),
        });
        const data = await resp.json();
        if (data.ok) {
          authToken = pw;
          localStorage.setItem('upload_token', pw);
          loginPanel.classList.add('hidden');
          uploadPanel.classList.remove('hidden');
        } else {
          loginError.textContent = data.error || 'خطا';
        }
      } catch (e) {
        loginError.textContent = 'خطا در اتصال';
      }
      loginBtn.disabled = false;
    };

    document.getElementById('password').addEventListener('keydown', e => {
      if (e.key === 'Enter') loginBtn.click();
    });

    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
    dropZone.ondragleave = () => dropZone.classList.remove('dragover');
    dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]); };
    fileInput.onchange = (e) => { if (e.target.files[0]) selectFile(e.target.files[0]); };

    removeFile.onclick = () => {
      selectedFile = null;
      fileInfo.classList.add('hidden');
      uploadBtn.classList.add('hidden');
      fileInput.value = '';
      uploadResult.style.display = 'none';
      progress.style.display = 'none';
    };

    function getFileIcon(name) {
      const ext = name.split('.').pop().toLowerCase();
      const map = { mp3:'🎵', wav:'🎵', flac:'🎵', ogg:'🎵', m4a:'🎵', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️', webp:'🖼️', svg:'🖼️', mp4:'🎬', mkv:'🎬', avi:'🎬', mov:'🎬', webm:'🎬', pdf:'📕', doc:'📘', docx:'📘', txt:'📄', zip:'📦', rar:'📦' };
      return map[ext] || '📄';
    }

    function selectFile(f) {
      selectedFile = f;
      fileName.textContent = f.name;
      fileSize.textContent = f.size > 1048576 ? (f.size / 1048576).toFixed(2) + ' MB' : (f.size / 1024).toFixed(1) + ' KB';
      fileIcon.textContent = getFileIcon(f.name);
      fileInfo.classList.remove('hidden');
      uploadBtn.classList.remove('hidden');
      uploadResult.style.display = 'none';
    }

    uploadBtn.onclick = async () => {
      if (!selectedFile) return;
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'دریافت لینک آپلود...';
      uploadBtn.classList.add('uploading');
      progress.style.display = 'block';
      progressText.style.display = 'block';
      progressFill.style.width = '0%';
      progressText.textContent = '0%';
      uploadResult.style.display = 'none';

      try {
        const urlResp = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: authToken,
            filename: selectedFile.name,
            type: fileType.value,
          })
        });
        const urlData = await urlResp.json();
        if (!urlData.ok) throw new Error(urlData.error || 'خطا در دریافت لینک آپلود');

        uploadBtn.textContent = 'محاسبه هش...';
        const buffer = await selectedFile.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha1 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        uploadBtn.textContent = 'در حال آپلود...';
        const xhr = new XMLHttpRequest();
        xhr.open('POST', urlData.uploadUrl);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            progressFill.style.width = pct + '%';
            progressText.textContent = pct + '%';
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            uploadResult.className = 'result success';
            uploadResult.innerHTML = 'آپلود شد!<br><a href="' + urlData.fileUrl + '" target="_blank">' + urlData.fileUrl + '</a>';
          } else {
            uploadResult.className = 'result error';
            uploadResult.textContent = 'خطا: ' + xhr.status + ' ' + xhr.responseText.substring(0, 200);
          }
          uploadResult.style.display = 'block';
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'آپلود فایل';
          uploadBtn.classList.remove('uploading');
          progressText.style.display = 'none';
        };

        xhr.onerror = () => {
          uploadResult.className = 'result error';
          uploadResult.textContent = 'خطا در اتصال';
          uploadResult.style.display = 'block';
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'آپلود فایل';
          uploadBtn.classList.remove('uploading');
          progressText.style.display = 'none';
        };

        xhr.setRequestHeader('Authorization', urlData.authToken);
        xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');
        xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(urlData.key));
        xhr.setRequestHeader('X-Bz-Content-Sha1', sha1);
        xhr.send(buffer);

      } catch (e) {
        uploadResult.className = 'result error';
        uploadResult.textContent = 'خطا: ' + e.message;
        uploadResult.style.display = 'block';
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'آپلود فایل';
        uploadBtn.classList.remove('uploading');
        progressText.style.display = 'none';
      }
    };
  </script>
</body>
</html>`;
}

/**
 * Handle web upload requests
 */
export async function handle_web_upload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Serve upload page
  if (url.pathname === '/upload' && request.method === 'GET') {
    return new Response(get_upload_page_html(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Login check
  if (request.method === 'POST' && url.pathname === '/api/upload') {
    const body = await request.json() as any;
    if (body.action === 'login') {
      if (body.password === env.WEB_UPLOAD_PASSWORD) {
        return jsonResponse({ ok: true });
      }
      return jsonResponse({ ok: false, error: 'رمز اشتباهه' }, 401);
    }
    return jsonResponse({ ok: false, error: 'invalid action' }, 400);
  }

  // Get B2 upload URL (Native API)
  if (request.method === 'POST' && url.pathname === '/api/upload-url') {
    return await handle_upload_url(request, env);
  }

  // TEMPORARY: Update B2 CORS rules
  if (url.pathname === '/api/setup-cors' && url.searchParams.get('key') === 'doit123') {
    return await handle_update_cors(env);
  }

  // TEMPORARY: Create EU bucket
  if (url.pathname === '/api/setup-eu-bucket' && url.searchParams.get('key') === 'doit123') {
    return await handle_create_eu_bucket(env);
  }

  return new Response('Not Found', { status: 404 });
}

/**
 * Get B2 Native API upload URL
 */
async function handle_upload_url(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;

  if (body.password !== env.WEB_UPLOAD_PASSWORD) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  const filename = body.filename || 'file';
  const fileType = body.type || 'documents';

  try {
    const StorageManager = (await import('./storage')).default;
    const storage = new StorageManager(env);
    const key = `web/${fileType}/${filename}`;
    const uploadInfo = await storage.get_upload_url_info();

    const baseUrl = env.BASE_URL || `https://${new URL(request.url).host}`;
    const fileUrl = `${baseUrl}/file/${encodeURIComponent(key)}`;

    return jsonResponse({
      ok: true,
      uploadUrl: uploadInfo.uploadUrl,
      authToken: uploadInfo.authToken,
      key: key,
      fileUrl: fileUrl,
    });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message || 'خطا' }, 500);
  }
}

/**
 * TEMPORARY: Update B2 CORS rules via API
 */
async function handle_update_cors(env: Env): Promise<Response> {
  try {
    const creds = btoa(`${env.B2_KEY_ID}:${env.B2_APPLICATION_KEY}`);
    const authResp = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${creds}` },
    });
    const auth = await authResp.json() as any;

    // Get accountId from auth response
    const accountId = auth.accountId;

    const updateResp = await fetch(`${auth.apiUrl}/b2api/v2/b2_update_bucket`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: accountId,
        bucketId: env.B2_BUCKET_ID,
        corsRules: [{
          corsRuleName: 'allowUpload',
          allowedOrigins: ['*'],
          allowedOperations: ['b2_upload_file'],
          allowedHeaders: ['authorization', 'content-type', 'x-bz-file-name', 'x-bz-content-sha1'],
          maxAgeSeconds: 3600,
        }],
      }),
    });
    const result = await updateResp.json();
    return jsonResponse({ ok: true, result });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * TEMPORARY: Create EU bucket + apply CORS
 */
async function handle_create_eu_bucket(env: Env): Promise<Response> {
  try {
    const creds = btoa(`${env.B2_KEY_ID}:${env.B2_APPLICATION_KEY}`);
    const authResp = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${creds}` },
    });
    const auth = await authResp.json() as any;

    // Create bucket in EU region
    const createResp = await fetch(`${auth.apiUrl}/b2api/v2/b2_create_bucket`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: auth.accountId,
        bucketName: 'telegram-r2-eu',
        bucketType: 'allPrivate',
        bucketInfo: {},
        corsRules: [{
          corsRuleName: 'allowUpload',
          allowedOrigins: ['*'],
          allowedOperations: ['b2_upload_file'],
          allowedHeaders: ['authorization', 'content-type', 'x-bz-file-name', 'x-bz-content-sha1'],
          maxAgeSeconds: 3600,
        }],
        lifecycleRules: [],
        'fileLockEnabled': false,
      }),
    });
    const result = await createResp.json() as any;

    return jsonResponse({ ok: true, result });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
}
