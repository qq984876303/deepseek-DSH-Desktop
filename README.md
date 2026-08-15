# DSH Desktop

macOS desktop shell for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness).

macOS 版 DeepSeek Harness（dsh）桌面外壳。

> This document is bilingual: each section has an English version followed by a 中文 version.
> 本文档为双语：每个章节先给出英文，再给出中文对照。

---

## Run (dev) · 运行（开发模式）

```sh
npm install
npm start
```

**English**
The Electron main process spawns the published `@deepseek-ai/dsh` CLI (`dsh web`,
run as a Node process via `ELECTRON_RUN_AS_NODE`) and a `BrowserWindow` loads the
served UI. No need to clone or build the dsh monorepo from source — the published
npm package already bundles the web frontend.

- First launch shows a setup window for the DeepSeek API key. It is encrypted with
  macOS Keychain (Electron `safeStorage`) and stored under
  `~/Library/Application Support/DSH Desktop/apikey`.
- dsh home (`DSH_HOME`) is redirected to
  `~/Library/Application Support/DSH Desktop/dsh-home` (profiles, session log,
  installed plugins).
- The main process starts `dsh web --port 0` (OS picks a free port), parses the
  printed URL, and loads it.

**中文**
Electron 主进程会拉起已发布的 `@deepseek-ai/dsh` CLI（`dsh web`，通过
`ELECTRON_RUN_AS_NODE` 以 Node 进程方式运行），并由一个 `BrowserWindow` 加载其
提供的 Web UI。无需克隆或从源码构建 dsh 的 monorepo——已发布的 npm 包已经自带
前端界面。

- 首次启动会弹出一个设置窗口用于录入 DeepSeek API key。该 key 通过 macOS 钥匙串
  （Electron `safeStorage`）加密，保存在
  `~/Library/Application Support/DSH Desktop/apikey`。
- dsh 的主目录（`DSH_HOME`）被重定向到
  `~/Library/Application Support/DSH Desktop/dsh-home`（存放配置、会话日志、已安装插件）。
- 主进程启动 `dsh web --port 0`（由系统分配空闲端口），解析其打印出的 URL 并加载。

---

## Build from source · 本地重建 dmg

```sh
npm run dist   # outputs: out/DSH Desktop-<version>-arm64.dmg (and -x64.dmg)
```

**English — Prerequisites**
- macOS (Apple Silicon / arm64 recommended; x64 also produced).
- Node.js 18+ (this project was built with Node 22) and npm.
- Approx. 1.5 GB free disk for `node_modules` + build output.

**English — Steps**
1. Clone and enter the project:
   ```sh
   git clone https://github.com/qq984876303/deepseek-DSH-Desktop.git
   cd deepseek-DSH-Desktop
   ```
2. Install dependencies (this also downloads the Electron binary and the dsh
   runtime packages):
   ```sh
   npm install
   ```
   > If `node_modules/electron/dist` is missing after install, fetch the binary
   > manually:
   > `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js`
3. Package the dmg:
   ```sh
   npm run dist
   ```
4. Find the artifact in `out/`:
   `DSH Desktop-<version>-arm64.dmg` (and `-x64.dmg`).

**English — Notes**
- `identity: null` produces an **unsigned** build. On first open, macOS Gatekeeper
  blocks it — right-click the app → **Open** to allow it once.
- `asar` is disabled on purpose so the spawned Node process can read the dsh files
  on disk.
- The `.dmg` is **not** committed to this repo (it exceeds GitHub's 100 MB file
  limit). Download it from the **Releases** page instead.
- The API key is **never** bundled — it lives only in your local Keychain.

**中文 — 前置条件**
- macOS（推荐 Apple Silicon / arm64；也会同时产出 x64 版本）。
- Node.js 18+（本项目使用 Node 22）与 npm。
- 约 1.5 GB 空闲磁盘空间，用于 `node_modules` 与构建产物。

**中文 — 步骤**
1. 克隆并进入项目：
   ```sh
   git clone https://github.com/qq984876303/deepseek-DSH-Desktop.git
   cd deepseek-DSH-Desktop
   ```
2. 安装依赖（这一步会下载 Electron 二进制以及 dsh 运行时依赖包）：
   ```sh
   npm install
   ```
   > 若安装后 `node_modules/electron/dist` 为空，可手动补全二进制：
   > `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js`
3. 打包 dmg：
   ```sh
   npm run dist
   ```
4. 在 `out/` 目录下查看产物：
   `DSH Desktop-<version>-arm64.dmg`（以及 `-x64.dmg`）。

**中文 — 说明**
- `identity: null` 表示打包出的是**未签名**版本。首次打开时 macOS 的 Gatekeeper
  会拦截——右键 App →「打开」即可放行一次。
- `asar` 被刻意关闭，以便拉起的 Node 子进程能直接读取磁盘上的 dsh 文件。
- `.dmg` **不会**提交进本仓库（超过 GitHub 单文件 100 MB 上限）。请从 **Releases**
  页面下载安装包。
- API key **绝不会**被打进包里——它只存在于你本机的钥匙串中。

---

## Architecture notes · 架构说明

**English**
- `src/main.js` — boot flow: API key → spawn dsh → parse URL → load window.
- `src/preload.js` — contextBridge for the setup window.
- `src/setup.html` — first-run API key entry form.
- `build/entitlements.mac.plist` — hardened-runtime entitlements (used when signing).
- `build/entitlements.mac.sandbox.plist` — App Sandbox entitlements (future use).

**中文**
- `src/main.js` —— 启动流程：读 API key → 拉起 dsh → 解析 URL → 加载窗口。
- `src/preload.js` —— 设置窗口的 contextBridge 桥接。
- `src/setup.html` —— 首次启动录入 API key 的表单页。
- `build/entitlements.mac.plist` —— Hardened Runtime 权限（签名时使用）。
- `build/entitlements.mac.sandbox.plist` —— App Sandbox 权限（预留，未来启用）。

---

## Sandbox caveat (important) · 沙箱注意事项（重要）

**English**
dsh is a **code-execution harness**: it spawns subprocesses (shell, PTY, LSP). macOS
App Sandbox restricts arbitrary subprocess spawning, so App Sandbox is fundamentally
at odds with full code-execution agents.

- **v1 ships WITHOUT App Sandbox** and relies on dsh's own approval policy +
  hardened-runtime entitlements. This is reflected in the build config.
- `entitlements.mac.sandbox.plist` is provided for future enablement. Enabling it
  will require redirecting `DSH_HOME` into the sandbox container and will **limit
  shell-execution tools**.
- dsh's own Landlock sandbox is Linux-only and is already a no-op on macOS
  (the published package runs fine on macOS without it).

**中文**
dsh 是一个**代码执行型 harness**：它会拉起子进程（shell、PTY、LSP）。macOS 的
App Sandbox 会限制任意子进程拉起，因此 App Sandbox 与完整的代码执行型智能体
在根本上存在冲突。

- **v1 版本默认不开启 App Sandbox**，而是依赖 dsh 自身的审批策略 + hardened-runtime
  权限。这一点已体现在构建配置中。
- 仓库中提供了 `entitlements.mac.sandbox.plist` 以备将来启用。一旦启用，需要把
  `DSH_HOME` 重定向进沙箱容器，并且会**限制 shell 执行类工具**的能力。
- dsh 自带的 Landlock 沙箱仅支持 Linux，在 macOS 上本就是空操作（已发布的包在
  macOS 上无需它也能正常运行）。
