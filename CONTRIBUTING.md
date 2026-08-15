# Contributing / 贡献指南

> Bilingual: English first, 中文 follows.
> 双语：英文在前，中文在后。

---

## English

Thanks for your interest in contributing!

### Development setup
Requirements: macOS, Node.js 18+, ~1.5 GB free disk.

```bash
git clone https://github.com/qq984876303/deepseek-DSH-Desktop.git
cd deepseek-DSH-Desktop
npm install
```

If the Electron binary is missing after install (common on restricted
networks), restore it manually:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
  node node_modules/electron/install.js
```

### Run from source (dev)
```bash
npm start
```
This launches the Electron app, spawns `dsh web` on `127.0.0.1`, and loads the
DSH web UI. On first run a window asks for your DeepSeek API key.

### Build the dmg (production)
```bash
npm run dist
```
Output: `out/DSH Desktop-0.1.0-arm64.dmg`. The build is **unsigned**
(`identity: null`) for personal/internal use. First launch requires
right-click → "Open" to bypass Gatekeeper.

> The `.dmg` is **not** committed to git (it exceeds GitHub's 100 MB file
> limit). Get it from the project's **Releases** page, or build it yourself.

### Project layout
```
src/main.js            Electron main process (spawns dsh, key storage)
src/preload.js         Context bridge
src/setup.html         First-run API key entry
build/                 entitlements + app icon (icon.icns)
```

### Code / commit conventions
- Keep `node_modules/`, `out/`, and `*.bak.*` out of commits (see `.gitignore`).
- API keys must never be committed. Use the local setup window.
- Use clear, imperative commit messages (e.g. `fix: ...`, `feat: ...`,
  `docs: ...`).
- Open an issue first for non-trivial changes so we can discuss direction.

### Pull requests
- Fork, branch (`feat/...`, `fix/...`), and open a PR against `main`.
- Describe what and why; link the related issue.
- Ensure `npm start` still runs before submitting.

---

## 中文

感谢你对本项目的关注！

### 开发环境
要求：macOS、Node.js 18+、约 1.5 GB 可用磁盘。

```bash
git clone https://github.com/qq984876303/deepseek-DSH-Desktop.git
cd deepseek-DSH-Desktop
npm install
```

若安装后 Electron 二进制缺失（受限网络常见），手动补全：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
  node node_modules/electron/install.js
```

### 源码运行（开发）
```bash
npm start
```
启动 Electron 应用，在 `127.0.0.1` 拉起 `dsh web` 并加载 DSH Web UI。
首次运行会弹窗要求输入 DeepSeek API key。

### 构建 dmg（生产）
```bash
npm run dist
```
产物：`out/DSH Desktop-0.1.0-arm64.dmg`。该构建为**未签名**
（`identity: null`），供个人/内部使用。首次打开需右键 →「打开」绕 Gatekeeper。

> `.dmg` **不会**提交进 git（超过 GitHub 单文件 100 MB 上限）。请从项目
> **Releases** 页面获取，或自行构建。

### 目录结构
```
src/main.js            Electron 主进程（拉起 dsh、key 存储）
src/preload.js         上下文桥接
src/setup.html         首次运行录入 API key
build/                 授权文件 + 应用图标（icon.icns）
```

### 代码 / 提交规范
- 切勿将 `node_modules/`、`out/`、`*.bak.*` 提交（见 `.gitignore`）。
- API key 绝不提交，请使用本地设置窗口录入。
- 提交信息清晰、祈使句（如 `fix: ...`、`feat: ...`、`docs: ...`）。
- 较大的改动请先开 Issue 讨论方向。

### 拉取请求（PR）
- Fork 后新建分支（`feat/...`、`fix/...`），向 `main` 提 PR。
- 说明「做了什么、为什么」，并关联相关 Issue。
- 提交前请确保 `npm start` 仍可正常运行。
