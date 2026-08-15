const { app, BrowserWindow, safeStorage, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const HOST = '127.0.0.1';
let dshProc = null;
let mainWindow = null;

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

function spawnDsh(apiKey) {
  const dshBin = resolveDshBin();
  const home = path.join(app.getPath('userData'), 'dsh-home');
  fs.mkdirSync(home, { recursive: true });

  const env = Object.assign({}, process.env, {
    DSH_HOME: home,
    ELECTRON_RUN_AS_NODE: '1',
  });
  if (apiKey) env.DEEPSEEK_API_KEY = apiKey;

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

function openSetupWindow() {
  return new Promise((resolve, reject) => {
    const w = new BrowserWindow({
      width: 480,
      height: 340,
      resizable: false,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        node: false,
      },
    });
    w.once('ready-to-show', () => w.show());
    w.loadFile(path.join(__dirname, 'setup.html'));
    ipcMain.once('setup:save-key', (_e, key) => {
      try {
        writeApiKey((key || '').trim());
        w.close();
        resolve((key || '').trim());
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function boot() {
  let apiKey = readApiKey();
  if (!apiKey) {
    try {
      apiKey = await openSetupWindow();
    } catch (e) {
      showErrorWindow(String(e && e.message ? e.message : e));
      return;
    }
  }

  let url;
  try {
    url = await spawnDsh(apiKey);
    await waitForServer(url);
  } catch (e) {
    showErrorWindow(String(e && e.message ? e.message : e));
    return;
  }

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
}

app.whenReady().then(boot);

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
