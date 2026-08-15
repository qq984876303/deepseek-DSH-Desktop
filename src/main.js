const { app, BrowserWindow, safeStorage, ipcMain, Menu, nativeTheme, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const HOST = '127.0.0.1';
const REPO = 'qq984876303/deepseek-DSH-Desktop';
let dshProc = null;
let mainWindow = null;
let setupWindow = null;

function resolveDshBin() {
  try {
    return require.resolve('@deepseek-ai/dsh/lib/bin.js');
  } catch {
    return path.join(__dirname, '..', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
  }
}

function apiKeyFile() {
  return path.join(app.getPath('userData'), 'apikey');
}

function readApiKey() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const f = apiKeyFile();
    if (!fs.existsSync(f)) return null;
    return safeStorage.decryptString(fs.readFileSync(f));
  } catch {
    return null;
  }
}

function writeApiKey(key) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('SafeStorage/Keychain unavailable on this system');
  }
  fs.writeFileSync(apiKeyFile(), safeStorage.encryptString(key));
}

function clearApiKey() {
  try {
    fs.unlinkSync(apiKeyFile());
  } catch {
    /* ignore */
  }
}

function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function defaultSettings() {
  return { backend: 'deepseek', ollamaBaseUrl: 'http://localhost:11434/v1', ollamaModel: '', theme: 'system' };
}

function readSettings() {
  try {
    return Object.assign(defaultSettings(), JSON.parse(fs.readFileSync(settingsFile(), 'utf8')));
  } catch {
    return defaultSettings();
  }
}

function writeSettings(s) {
  fs.writeFileSync(settingsFile(), JSON.stringify(Object.assign(readSettings(), s), null, 2));
}

function spawnDsh(apiKey, settings) {
  const dshBin = resolveDshBin();
  const home = path.join(app.getPath('userData'), 'dsh-home');
  fs.mkdirSync(home, { recursive: true });

  const env = Object.assign({}, process.env, {
    DSH_HOME: home,
    ELECTRON_RUN_AS_NODE: '1',
  });

  if (settings.backend === 'ollama') {
    // Ollama 暴露 OpenAI 兼容端点；把 DeepSeek provider 的 baseURL 指过去即可复用协议。
    env.DEEPSEEK_BASE_URL = settings.ollamaBaseUrl || 'http://localhost:11434/v1';
    // Ollama 不需要真实 key，但 dsh 凭证策略通常要求非空，给一个占位值。
    env.DEEPSEEK_API_KEY = apiKey || 'sk-ollama-local';
  } else if (apiKey) {
    env.DEEPSEEK_API_KEY = apiKey;
  }

  dshProc = spawn(
    process.execPath,
    ['--expose-internals', dshBin, 'web', '--port', '0', '--host', HOST],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const logChunk = (d) => process.stdout.write('[dsh] ' + d.toString());
  dshProc.stdout.on('data', logChunk);
  dshProc.stderr.on('data', logChunk);

  return new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(
      () => reject(new Error('dsh web did not report a URL within 30s\n' + buf)),
      30000,
    );
    const onData = (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/https?:\/\/127\.0\.0\.1:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve('http://' + HOST + ':' + m[1]);
      }
    };
    dshProc.stdout.on('data', onData);
    dshProc.stderr.on('data', onData);
    dshProc.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    dshProc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('dsh web exited with code ' + code + '\n' + buf));
    });
  });
}

function waitForServer(url, { timeoutMs = 20000, intervalMs = 300 } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('dsh web not reachable within ' + timeoutMs + 'ms at ' + url));
        } else {
          setTimeout(tryOnce, intervalMs);
        }
      });
    };
    tryOnce();
  });
}

function escapeHtml(s) {
  return String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

function showErrorWindow(msg) {
  const w = new BrowserWindow({ width: 600, height: 360 });
  const html =
    '<!doctype html><meta charset="utf-8"><body style="font-family:-apple-system,monospace;background:#1e1e1e;color:#e6e6e6"><pre style="white-space:pre-wrap;padding:16px">' +
    escapeHtml(msg) +
    '</pre></body>';
  w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

// ---- Settings / setup window (first-run + reconfigure) ----
function openSetupWindow(mode) {
  return new Promise((resolve, reject) => {
    const w = new BrowserWindow({
      width: 540,
      height: 500,
      resizable: false,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        node: false,
      },
    });
    setupWindow = w;
    w.once('ready-to-show', () => w.show());
    w.loadFile(path.join(__dirname, 'setup.html'));

    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      setTimeout(() => {
        try {
          w.close();
        } catch {
          /* ignore */
        }
      }, 120);
      resolve(result);
    };

    ipcMain.handleOnce('setup:initial', () => ({ hasKey: !!readApiKey(), settings: readSettings(), mode }));
    ipcMain.handleOnce('setup:submit', async (_e, payload) => {
      try {
        if (payload.clear) {
          clearApiKey();
        } else if (payload.key) {
          writeApiKey(payload.key);
        }
        if (payload.settings) writeSettings(payload.settings);
        const action = mode === 'firstrun' ? 'continue' : 'restart';
        finish({ action });
        return { action };
      } catch (err) {
        return { action: 'error', error: String(err && err.message ? err.message : err) };
      }
    });
    w.on('closed', () => {
      ipcMain.removeHandler('setup:initial');
      ipcMain.removeHandler('setup:submit');
      if (!done) {
        if (mode === 'firstrun') reject(new Error('setup window closed'));
        else resolve({ action: 'cancel' });
      }
    });
  });
}

async function openSettings() {
  const res = await openSetupWindow('reconfigure');
  if (res.action === 'restart') {
    app.relaunch();
    app.quit();
  }
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      node: false,
    },
  });
  let failCount = 0;
  mainWindow.webContents.on('did-fail-load', () => {
    failCount += 1;
    if (failCount <= 5) setTimeout(() => mainWindow.loadURL(url), 600);
  });
  mainWindow.loadURL(url);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---- Menu / appearance / updates ----
function showAbout() {
  dialog
    .showMessageBox({
      type: 'info',
      title: 'About DSH Desktop',
      message: 'DSH Desktop ' + app.getVersion(),
      detail:
        'macOS desktop shell for DeepSeek Harness (dsh).\n\n' +
        'Repository: https://github.com/' + REPO + '\n' +
        'License: MIT\n\n' +
        'Your API key is stored locally in the macOS Keychain and never leaves this machine.',
      buttons: ['OK', 'Open Repository'],
      defaultId: 0,
      cancelId: 0,
    })
    .then((r) => {
      if (r.response === 1) shell.openExternal('https://github.com/' + REPO);
    });
}

function setTheme(theme) {
  nativeTheme.themeSource = theme;
  const s = readSettings();
  s.theme = theme;
  writeSettings(s);
  buildAppMenu();
}

function buildAppMenu() {
  const theme = nativeTheme.themeSource;
  const template = [
    {
      label: 'DSH Desktop',
      submenu: [
        { label: 'About DSH Desktop', click: showAbout },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'Cmd+,', click: openSettings },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Appearance',
          submenu: [
            { label: 'System', type: 'radio', checked: theme === 'system', click: () => setTheme('system') },
            { label: 'Dark', type: 'radio', checked: theme === 'dark', click: () => setTheme('dark') },
            { label: 'Light', type: 'radio', checked: theme === 'light', click: () => setTheme('light') },
          ],
        },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'GitHub Repository', click: () => shell.openExternal('https://github.com/' + REPO) },
        { label: 'Check for Updates…', click: checkForUpdates },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function compareVersion(a, b) {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

async function checkForUpdates() {
  const current = app.getVersion();
  try {
    const res = await fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-desktop' },
    });
    if (!res.ok) throw new Error('GitHub API returned ' + res.status);
    const data = await res.json();
    const latest = String(data.tag_name || '').replace(/^v/, '');
    if (!latest) throw new Error('no release tag found');
    if (compareVersion(latest, current) > 0) {
      const r = await dialog.showMessageBox({
        type: 'info',
        title: 'Update available',
        message: 'Version ' + data.tag_name + ' is available (you have ' + current + ').',
        detail: data.body ? String(data.body).slice(0, 600) : '',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      });
      if (r.response === 0) shell.openExternal(data.html_url);
    } else {
      dialog.showMessageBox({
        type: 'info',
        title: 'Up to date',
        message: 'You are running the latest version (' + current + ').',
      });
    }
  } catch (e) {
    dialog.showMessageBox({
      type: 'error',
      title: 'Update check failed',
      message: String(e && e.message ? e.message : e),
    });
  }
}

// ---- Boot ----
async function boot() {
  const settings = readSettings();
  let apiKey = readApiKey();

  if (settings.backend !== 'ollama' && !apiKey) {
    try {
      const res = await openSetupWindow('firstrun');
      if (res.action !== 'continue') return;
      apiKey = readApiKey();
    } catch (e) {
      showErrorWindow(String(e && e.message ? e.message : e));
      return;
    }
  }

  let url;
  try {
    url = await spawnDsh(apiKey, settings);
    await waitForServer(url);
  } catch (e) {
    showErrorWindow(String(e && e.message ? e.message : e));
    return;
  }

  createMainWindow(url);
}

app.whenReady().then(() => {
  const s = readSettings();
  nativeTheme.themeSource = s.theme || 'system';
  buildAppMenu();
  boot();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (dshProc) {
    try {
      dshProc.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
});
