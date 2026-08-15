# Security Policy / 安全政策

> This document is bilingual: English first, 中文 follows.
> 本文档为双语：英文在前，中文在后。

---

## English

### Overview
**DSH Desktop** is an Electron wrapper around the official
[`@deepseek-ai/dsh`](https://www.npmjs.com/package/@deepseek-ai/dsh) package.
It does **not** reimplement or fork DeepSeek's code — it only launches the
published CLI and loads its built-in web UI in a local `BrowserWindow`.

### How your API key is handled
- The DeepSeek API key is **never** hardcoded, compiled into the binary, or
  bundled into the distributed `.dmg`.
- On first launch the app shows a setup window where **you** type your key.
- The key is encrypted with Electron's `safeStorage` (backed by the macOS
  **Keychain**) and stored only on **your local machine** at:
  `~/Library/Application Support/DSH Desktop/apikey`
- At runtime the key is passed to the `dsh` child process via the
  `DEEPSEEK_API_KEY` environment variable and is **never** written into `dsh`'s
  own data directory. It exists in memory only and disappears when the process
  exits.
- The encrypted file on disk is useless without the matching Keychain entry.

### Repository hygiene (verified)
A secret scan was performed against all **tracked** files using patterns for
real credentials (`sk-…`, `ghp_…`, AWS `AKIA…`, `bearer …`, private keys).
Result: **0 matches**. The following are not secrets, only identifiers/names:
- `src/main.js` function names like `readApiKey` / `writeApiKey`
- `src/setup.html` placeholder text `sk-...` (input hint, not a real key)
- `package-lock.json` dependency names such as `dsh-token-meter`, `js-tokens`
- `README.md` path references like `…/apikey` (documentation only)

Large local-only directories (`node_modules/`, `out/`) and icon backups
(`*.bak.*`) are excluded by `.gitignore` and are **not** committed.

### Reporting a vulnerability
Please **do not** open a public issue for security problems.
Instead, report privately by opening a
[security advisory](https://github.com/qq984876303/deepseek-DSH-Desktop/security/advisories/new)
on this repository, or contact the maintainer directly. We will respond as
soon as possible.

---

## 中文

### 概述
**DSH Desktop** 是官方
[`@deepseek-ai/dsh`](https://www.npmjs.com/package/@deepseek-ai/dsh) 包的
Electron 外壳。它**没有**复刻或 fork DeepSeek 的代码，只是启动已发布的 CLI，
并在本地 `BrowserWindow` 中加载其内置 Web UI。

### API key 如何处理
- DeepSeek API key **绝不会**被硬编码、编译进二进制，或打包进分发的 `.dmg`。
- 首次启动时，应用会弹出一个设置窗口，由**你**输入 key。
- key 使用 Electron `safeStorage`（底层为 macOS **钥匙串 / Keychain**）加密，
  仅存储在你**本机**：
  `~/Library/Application Support/DSH Desktop/apikey`
- 运行时，key 通过 `DEEPSEEK_API_KEY` 环境变量传给 `dsh` 子进程，**从不**写入
  `dsh` 自身的数据目录。它只存在于内存，进程退出即消失。
- 磁盘上的加密文件若无对应的钥匙串条目则无法解密。

### 仓库卫生（已核验）
已对**所有入库文件**使用真实凭据特征（`sk-…`、`ghp_…`、AWS `AKIA…`、
`bearer …`、私钥）进行扫描，结果：**0 命中**。以下并非密钥，仅为标识符/名称：
- `src/main.js` 中的函数名 `readApiKey` / `writeApiKey`
- `src/setup.html` 中的占位提示 `sk-...`（输入提示，非真实 key）
- `package-lock.json` 中的依赖包名，如 `dsh-token-meter`、`js-tokens`
- `README.md` 中的路径说明，如 `…/apikey`（仅文档）

本地的超大目录（`node_modules/`、`out/`）与图标备份（`*.bak.*`）已被
`.gitignore` 排除，**不会**被提交。

### 报告漏洞
请**不要**就安全问题公开提 Issue。请通过本仓库的
[security advisory](https://github.com/qq984876303/deepseek-DSH-Desktop/security/advisories/new)
私下报告，或直接联系维护者。我们会尽快回复。
