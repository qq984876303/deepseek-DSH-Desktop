# DSH Desktop

macOS desktop shell for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness).

The Electron main process spawns the published `@deepseek-ai/dsh` CLI (`dsh web`,
run as a Node process via `ELECTRON_RUN_AS_NODE`) and a `BrowserWindow` loads the
served UI. No need to clone or build the dsh monorepo from source — the published
npm package already bundles the web frontend.

## Run (dev)

```sh
npm install
npm start
```

- First launch shows a setup window for the DeepSeek API key. It is encrypted with
  macOS Keychain (Electron `safeStorage`) and stored under
  `~/Library/Application Support/DSH Desktop/apikey`.
- dsh home (`DSH_HOME`) is redirected to
  `~/Library/Application Support/DSH Desktop/dsh-home` (profiles, session log,
  installed plugins).
- The main process starts `dsh web --port 0` (OS picks a free port), parses the
  printed URL, and loads it.

## Build (unsigned, internal)

```sh
npm run dist   # out/DSH Desktop-<version>-arm64.dmg + -x64.dmg
```

`identity: null` produces an unsigned build. Users open it via right-click → Open
the first time (Gatekeeper). asar is disabled so the spawned node process can read
the dsh files on disk.

## Architecture notes

- `src/main.js` — boot flow: API key → spawn dsh → parse URL → load window.
- `src/preload.js` — contextBridge for the setup window.
- `src/setup.html` — first-run API key entry form.
- `build/entitlements.mac.plist` — hardened-runtime entitlements (used when signing).
- `build/entitlements.mac.sandbox.plist` — App Sandbox entitlements (Phase 2, see below).

## Sandbox caveat (important)

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
