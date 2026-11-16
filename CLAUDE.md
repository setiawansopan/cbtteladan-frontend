# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CBT Teladan is an Electron-based kiosk exam application for SMA Negeri 1 Yogyakarta. It loads the exam website (`https://cbtteladan.com`) in a locked-down browser with anti-cheat controls, then injects a custom taskbar overlay into the page.

## Commands

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build installers
npm run build:win        # Windows NSIS installer (.exe)
npm run build:mac        # macOS DMG (x64 + arm64)
npm run build:linux      # Linux AppImage + .deb
npm run build:all        # All platforms
```

Build output goes to the `dist/` folder. Icons must be placed in `build/` (`icon.ico` for Windows, `icon.png` for macOS/Linux) before building.

CI/CD runs via GitHub Actions (`.github/workflows/build.yml`) on `v*` tag pushes or manual dispatch, producing a GitHub Release with Windows and macOS artifacts.

## Architecture

The app has exactly three source files:

### `main.js` — Electron main process
- Creates a kiosk-mode `BrowserWindow` (fullscreen, alwaysOnTop, no frame) that loads `EXAM_URL`
- Registers global shortcuts to block system keys (Alt+Tab, Win key, etc.)
- Listens for display events to detect secondary monitors and covers them with opaque black overlay windows (`blockSecondaryDisplays`)
- Handles all IPC channels called by the taskbar: `get-wifi-info`, `get-wifi-networks`, `connect-wifi`, `get-battery-info`, `request-refresh`, `request-exit`
- WiFi info uses platform-specific CLI commands: `netsh` (Windows), `system_profiler SPAirPortDataType` (macOS — `airport` was deprecated in 14.4+), `nmcli` (Linux)
- Battery info uses: `WMIC` (Windows), `pmset` (macOS), `/sys/class/power_supply/BAT0` (Linux)
- Injects `taskbar.js` into every page via `webContents.executeJavaScript()` on `did-finish-load`
- Secret exit sequence: Ctrl+C then Ctrl+B within 2 seconds shows a confirmation dialog

### `preload.js` — Context bridge (renderer security layer)
- Runs in the renderer process before page scripts
- Blocks Alt, Meta/Win, Escape, PrintScreen, F11, F12 at the DOM capture phase
- Exposes `window.cbtTaskbar` via `contextBridge.exposeInMainWorld`, which proxies all IPC calls to main

### `taskbar.js` — Injected UI (runs inside the exam webpage)
- Self-contained IIFE injected into the exam site's DOM; guards against double injection via `document.getElementById("cbt-taskbar")`
- Creates a fixed 44px bottom taskbar with: app branding, WiFi button + panel, battery status, clock, Refresh button, Exit button
- All CSS uses `!important` to override the exam site's styles
- The WiFi panel lists available networks and has an inline password prompt for connecting to new networks
- Exit confirmation uses SweetAlert v2 if `Swal` is available on the exam site, otherwise falls back to a custom CSS modal
- A `MutationObserver` watches for SweetAlert modals from the exam site and lowers the taskbar's z-index (`cbt-modal-active` class on `<body>`) so exam modals appear above the taskbar

## Key Design Constraints

**Client identification**: Main process appends `CBTTeladan/<version>` to the User-Agent (Electron already adds `cbt-teladan/<version>`) and adds `X-CBT-Client` / `X-CBT-Version` HTTP headers, but only for requests to the exam domain (`cbtteladan.com`) to avoid triggering CORS preflight on CDN/image domains. The version comes from `package.json` via `app.getVersion()`; the server can enforce a minimum version for students.

**Request signing (v5+)**: The same requests also get `X-CBT-Timestamp` and `X-CBT-Signature` (hex HMAC-SHA256 of the timestamp string, see `signature.js`; identical in the Android app and verified by the server's `StudentAccessPolicy::hasValidSignature`). The key is written to the git-ignored `app-secret.js` at build time by `scripts/write-secret.js` from the `CBT_APP_SECRET` environment variable (a GitHub Actions secret in CI); tag builds fail without it. Never commit the key.

**Navigation locking**: `will-navigate` and `setWindowOpenHandler` in main.js restrict all navigation and popups to the exam domain only, except `about:blank` (needed by some JS libraries before scripting).

**No code signing**: `hardenedRuntime: false`, `identity: null`, `signAndEditExecutable: false` — builds are unsigned.

**No build tooling beyond electron-builder**: No TypeScript, bundler, or test framework. Changes are plain JavaScript.
