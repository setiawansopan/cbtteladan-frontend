const {
  app,
  BrowserWindow,
  globalShortcut,
  dialog,
  session,
  ipcMain,
  screen,
} = require("electron");
const path = require("path");
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");

// URL ujian yang akan dimuat
const EXAM_URL = "https://cbtteladan.my.id";

// === PENANDA IDENTIFIKASI ELECTRON CLIENT ===
// Server bisa mendeteksi client ini melalui:
//   1. User-Agent mengandung "CBTTeladan/2.1"
//   2. HTTP Header "X-CBT-Client: CBTTeladan"
//   3. HTTP Header "X-CBT-Version: 2.2"
const CBT_CLIENT_ID = "CBTTeladan";
const CBT_CLIENT_VERSION = "3.0";

// Daftar keyboard shortcut yang harus diblokir
const BLOCKED_SHORTCUTS = [
  "Alt+Tab", // Pindah aplikasi
  "Alt+F4", // Tutup aplikasi
  "Alt+Escape", // Pindah window
  "Super", // Tombol Windows (Start Menu)
  "Meta+D", // Show Desktop
  "Meta+E", // File Explorer
  "Meta+R", // Run Dialog
  "Meta+L", // Lock Screen
  "Meta+Tab", // Task View
  "CommandOrControl+Escape", // Start Menu / Force Quit
];

// Variabel global untuk menyimpan referensi window
let mainWindow = null;

// === DUAL MONITOR PROTECTION ===
let overlayWindows = []; // Window overlay hitam untuk monitor sekunder

// Fungsi: buat overlay hitam di semua monitor selain primary
function blockSecondaryDisplays() {
  // Tutup overlay lama
  overlayWindows.forEach((w) => {
    if (w && !w.isDestroyed()) w.close();
  });
  overlayWindows = [];

  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();

  displays.forEach((display) => {
    // Skip primary display (tempat aplikasi ujian berjalan)
    if (display.id === primaryDisplay.id) return;

    // Buat window overlay hitam fullscreen di monitor sekunder
    const overlay = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      fullscreen: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      closable: false,
      focusable: false,
      transparent: false,
      backgroundColor: "#000000",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    overlay.setAlwaysOnTop(true, "screen-saver");
    overlay.setMenu(null);

    // Tampilkan pesan peringatan di layar yang diblokir
    overlay.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head><style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #000;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: 'Segoe UI', sans-serif;
          user-select: none;
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { font-size: 28px; margin-bottom: 12px; color: #ff4757; }
        p { font-size: 16px; color: #888; max-width: 500px; text-align: center; line-height: 1.6; }
        .app-name { margin-top: 30px; font-size: 13px; color: #444; }
      </style></head>
      <body>
        <div class="icon">🚫</div>
        <h1>Layar Ini Diblokir</h1>
        <p>Monitor sekunder tidak diperbolehkan selama ujian berlangsung. Harap gunakan hanya satu layar.</p>
        <div class="app-name">CBT Teladan — SMA Negeri 1 Yogyakarta</div>
      </body>
      </html>
    `),
    );

    // Cegah overlay ditutup
    overlay.on("close", (e) => e.preventDefault());

    // Jika overlay kehilangan fokus, jangan biarkan diminimize
    overlay.on("minimize", () => {
      if (!overlay.isDestroyed()) overlay.restore();
    });

    overlayWindows.push(overlay);
  });

  return displays.length;
}

// Fungsi: periksa dan peringatkan jika ada multi-monitor
function checkDisplaySecurity() {
  const displayCount = screen.getAllDisplays().length;

  if (displayCount > 1) {
    // Blokir semua layar sekunder
    blockSecondaryDisplays();

    // Tampilkan peringatan di window utama
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["Saya Mengerti"],
        title: "⚠️ Monitor Tambahan Terdeteksi",
        message: `Terdeteksi ${displayCount} monitor terhubung.\n\nMonitor sekunder telah diblokir. Selama ujian berlangsung, hanya satu layar yang diperbolehkan.\n\nJika ini bukan milik Anda, hubungi pengawas ujian.`,
        noLink: true,
      });
    }
  } else {
    // Hanya 1 monitor, tutup semua overlay jika ada
    overlayWindows.forEach((w) => {
      if (w && !w.isDestroyed()) {
        w.removeAllListeners("close");
        w.close();
      }
    });
    overlayWindows = [];
  }
}

// === SHORTCUT RAHASIA UNTUK KELUAR (Ctrl+C lalu Ctrl+B dalam 2 detik) ===
let exitSequenceStep = 0; // 0 = belum mulai, 1 = Ctrl+C sudah ditekan
let exitSequenceTimer = null; // Timer untuk reset jika terlalu lama

function createWindow() {
  mainWindow = new BrowserWindow({
    // === MODE KIOSK & ALWAYS ON TOP ===
    kiosk: true, // Layar penuh tanpa taskbar
    alwaysOnTop: true, // Selalu di atas aplikasi lain
    fullscreen: true, // Fullscreen sebagai fallback

    // === SEMBUNYIKAN ELEMEN UI ===
    autoHideMenuBar: true, // Sembunyikan menu bar
    menuBarVisible: false, // Pastikan menu bar tidak terlihat
    frame: false, // Hilangkan title bar & border window

    // === WEB PREFERENCES (KEAMANAN) ===
    webPreferences: {
      nodeIntegration: false, // Nonaktifkan akses Node.js di renderer
      contextIsolation: true, // Isolasi context untuk keamanan
      sandbox: false, // Off agar preload.js bisa akses IPC
      webSecurity: true, // Aktifkan web security
      allowRunningInsecureContent: false, // Blokir konten HTTP di HTTPS
      preload: path.join(__dirname, "preload.js"), // Bridge untuk taskbar
    },
  });

  // Hapus menu bar sepenuhnya
  mainWindow.setMenu(null);

  // === PENANDA 1: CUSTOM USER-AGENT ===
  // Tambahkan "CBTTeladan/2.1" ke User-Agent string
  const defaultUserAgent = mainWindow.webContents.getUserAgent();
  const customUserAgent = `${defaultUserAgent} ${CBT_CLIENT_ID}/${CBT_CLIENT_VERSION}`;
  mainWindow.webContents.setUserAgent(customUserAgent);

  // === PENANDA 2: CUSTOM HTTP HEADER ===
  // Sisipkan header X-CBT-Client dan X-CBT-Version HANYA untuk request ke domain ujian.
  // Tidak diaplikasikan ke domain lain (CDN, storage gambar, dll) agar tidak
  // memicu CORS preflight yang menyebabkan gambar soal gagal ditampilkan.
  const examHost = new URL(EXAM_URL).hostname; // "cbtteladan.my.id"
  const examUrlFilter = {
    urls: [`*://${examHost}/*`, `*://*.${examHost}/*`],
  };
  session.defaultSession.webRequest.onBeforeSendHeaders(
    examUrlFilter,
    (details, callback) => {
      details.requestHeaders["X-CBT-Client"] = CBT_CLIENT_ID;
      details.requestHeaders["X-CBT-Version"] = CBT_CLIENT_VERSION;
      callback({ requestHeaders: details.requestHeaders });
    },
  );

  // Tampilkan halaman pre-check sebelum ujian dimulai
  mainWindow.loadFile(path.join(__dirname, "precheck.html"));

  // ============================================
  // === FITUR ANTI-CURANG (LANGKAH 3) =========
  // ============================================

  const webContents = mainWindow.webContents;

  // --- 1. NONAKTIFKAN DEVELOPER TOOLS ---
  webContents.on("devtools-opened", () => {
    webContents.closeDevTools();
  });

  // --- 2. KONTROL PEMBUKAAN WINDOW/TAB BARU ---
  // Izinkan popup internal (same-origin) agar flow konfirmasi/ujian tetap berjalan.
  // Tolak popup ke domain luar demi keamanan.
  webContents.setWindowOpenHandler(({ url }) => {
    const allowedHost = new URL(EXAM_URL).hostname;

    // Beberapa library membuka popup lewat about:blank sebelum isi script dijalankan.
    if (url === "about:blank") {
      return { action: "allow" };
    }

    try {
      const targetHost = new URL(url).hostname;
      if (targetHost === allowedHost) {
        return { action: "allow" };
      }
    } catch {
      // URL tidak valid / non-HTTP(S), fallback ke deny.
    }

    return { action: "deny" };
  });

  // --- 3. BLOKIR NAVIGASI KE URL SELAIN DOMAIN UJIAN ---
  webContents.on("will-navigate", (event, url) => {
    const allowedHost = new URL(EXAM_URL).hostname;
    try {
      const targetHost = new URL(url).hostname;
      if (targetHost !== allowedHost) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  // --- 4. BLOKIR KEYBOARD SHORTCUT BERBAHAYA DI DALAM WEBCONTENTS ---
  webContents.on("before-input-event", (event, input) => {
    const key = (input.key || "").toLowerCase();
    const ctrl = input.control;
    const shift = input.shift;
    const alt = input.alt;
    const meta = input.meta;

    // Hanya proses event keyDown agar input normal tidak terganggu
    if (input.type !== "keyDown" && input.type !== "rawKeyDown") {
      return;
    }

    // Izinkan input huruf/angka saat tidak ada modifier
    // (agar soal isian singkat bisa diketik normal)
    const isSimpleTypingKey = /^[a-z0-9]$/.test(key);
    if (!ctrl && !alt && !meta && isSimpleTypingKey) {
      return;
    }

    // === DETEKSI SHORTCUT RAHASIA: Ctrl+C lalu Ctrl+B ===
    if (ctrl && !shift && !alt && key === "c") {
      // Langkah 1: Ctrl+C ditekan — mulai urutan
      exitSequenceStep = 1;
      clearTimeout(exitSequenceTimer);
      exitSequenceTimer = setTimeout(() => {
        exitSequenceStep = 0; // Reset jika Ctrl+B tidak ditekan dalam 2 detik
      }, 2000);
      event.preventDefault();
      return;
    }

    if (ctrl && !shift && !alt && key === "b" && exitSequenceStep === 1) {
      // Langkah 2: Ctrl+B ditekan setelah Ctrl+C — tampilkan konfirmasi lalu keluar
      exitSequenceStep = 0;
      clearTimeout(exitSequenceTimer);
      dialog
        .showMessageBox(mainWindow, {
          type: "question",
          buttons: ["Batal", "Ya, Keluar"],
          defaultId: 0,
          cancelId: 0,
          title: "Konfirmasi Keluar",
          message: "Apakah Anda yakin ingin keluar dari aplikasi ujian?",
          noLink: true,
        })
        .then((result) => {
          if (result.response === 1) {
            // Lepas semua pembatasan sebelum keluar
            globalShortcut.unregisterAll();
            app.quit();
          }
        });
      event.preventDefault();
      return;
    }

    // Reset urutan jika tombol lain ditekan
    // PENTING: Jangan reset jika yang ditekan adalah modifier key (Control, Shift, Alt, Meta)
    // karena user perlu melepas dan menekan ulang Ctrl antara C dan B
    const isModifierKey = ["control", "shift", "alt", "meta"].includes(key);
    if (exitSequenceStep === 1 && !(ctrl && key === "b") && !isModifierKey) {
      exitSequenceStep = 0;
      clearTimeout(exitSequenceTimer);
    }

    // Blokir F12 (DevTools)
    if (key === "f12") {
      event.preventDefault();
      return;
    }

    // F5 = Refresh halaman ujian (cadangan jika tombol refresh di taskbar error)
    if (key === "f5") {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.reloadIgnoringCache();
      }
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+Shift+I (DevTools)
    if (ctrl && shift && key === "i") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+Shift+J (Console)
    if (ctrl && shift && key === "j") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+Shift+C (Inspect Element)
    if (ctrl && shift && key === "c") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+U (View Source)
    if (ctrl && key === "u") {
      event.preventDefault();
      return;
    }

    // Ctrl+C sudah ditangani oleh logic shortcut rahasia di atas

    // Blokir Ctrl+V (Paste)
    if (ctrl && key === "v") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+X (Cut)
    if (ctrl && key === "x") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+A (Select All)
    if (ctrl && key === "a") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+R (Refresh)
    if (ctrl && key === "r") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+W (Close Tab)
    if (ctrl && key === "w") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+T (New Tab)
    if (ctrl && key === "t") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+N (New Window)
    if (ctrl && key === "n") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+P (Print)
    if (ctrl && key === "p") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+S (Save)
    if (ctrl && key === "s") {
      event.preventDefault();
      return;
    }

    // Blokir Ctrl+L (Address Bar)
    if (ctrl && key === "l") {
      event.preventDefault();
      return;
    }

    // Blokir Alt+F4 (Close)
    if (alt && key === "f4") {
      event.preventDefault();
      return;
    }

    // Blokir PrintScreen
    if (key === "printscreen") {
      event.preventDefault();
      return;
    }
  });

  // --- 5. PAKSA WINDOW TETAP FOKUS & KIOSK ---
  // Jika window kehilangan fokus, kembalikan fokus
  mainWindow.on("blur", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true, "screen-saver");
          mainWindow.setKiosk(true);
        }
      }, 100);
    }
  });

  // Cegah window keluar dari mode fullscreen/kiosk
  mainWindow.on("leave-full-screen", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setKiosk(true);
    }
  });

  // Cegah window diminimize
  mainWindow.on("minimize", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.setKiosk(true);
    }
  });

  // --- 6. NONAKTIFKAN KLIK KANAN (CONTEXT MENU) ---
  webContents.on("context-menu", (event) => {
    event.preventDefault();
  });

  // --- 8. ABAIKAN BEFOREUNLOAD DARI WEBSITE ---
  // Mencegah halaman menahan refresh atau close karena fungsi onbeforeunload dari website ujian.
  webContents.on("will-prevent-unload", (event) => {
    event.preventDefault(); // Izinkan proses reload atau close untuk dilanjutkan
  });

  // === 7. INJECT TASKBAR SETELAH HALAMAN DIMUAT ===
  // Hanya inject ke halaman ujian, bukan halaman pre-check (file://)
  webContents.on("did-finish-load", () => {
    if (!webContents.getURL().startsWith(EXAM_URL)) return;
    try {
      const taskbarCode = fs.readFileSync(
        path.join(__dirname, "taskbar.js"),
        "utf-8",
      );
      webContents.executeJavaScript(taskbarCode).catch(() => {});
    } catch (err) {
      console.log("Gagal inject taskbar:", err.message);
    }
  });

  // Ketika window ditutup, bersihkan referensi
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// =============================================
// === IPC HANDLERS (WIFI, BATERAI) ============
// =============================================

// Helper: jalankan perintah dan kembalikan output
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { encoding: "utf-8", shell: true, timeout: 10000 },
      (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout);
      },
    );
  });
}

// =============================================
// === IPC HANDLERS (PRE-CHECK SISTEM) =========
// =============================================

// --- IPC: PRECHECK — INFO SISTEM (OS, CPU, RAM, DISPLAY) ---
ipcMain.handle("precheck-system-info", async () => {
  const platform = process.platform;
  const arch = process.arch;

  // Nama OS
  let osName;
  try {
    if (platform === "win32") {
      const out = await runCommand("wmic", ["os", "get", "Caption", "/value"]);
      const m = out.match(/Caption=(.+)/i);
      osName = m ? m[1].trim() : "Windows";
    } else if (platform === "darwin") {
      const name = await runCommand("sw_vers", ["-productName"]);
      const ver  = await runCommand("sw_vers", ["-productVersion"]);
      osName = `${name.trim()} ${ver.trim()}`;
    } else {
      try {
        const out = await runCommand("lsb_release", ["-d", "-s"]);
        osName = out.trim().replace(/"/g, "");
      } catch {
        osName = "Linux";
      }
    }
  } catch {
    osName = platform === "win32" ? "Windows" : platform === "darwin" ? "macOS" : "Linux";
  }

  const archLabel = ["x64", "arm64"].includes(arch) ? "64-bit" : "32-bit";

  // CPU
  const cpus = os.cpus();
  const cpuModel = (cpus[0]?.model || "Unknown CPU").replace(/\s+/g, " ").trim();
  const cpuCores = cpus.length;

  // RAM
  const totalBytes = os.totalmem();
  const totalMB = Math.round(totalBytes / (1024 * 1024));
  const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(1);

  // Display (dari primary display Electron)
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  return {
    os:      { name: osName, arch: archLabel },
    cpu:     { model: cpuModel, cores: cpuCores },
    ram:     { mb: totalMB, gb: totalGB },
    display: { width, height },
  };
});

// --- IPC: PRECHECK — STATUS KARTU SUARA ---
ipcMain.handle("precheck-audio", async () => {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      const out = await runCommand("wmic", [
        "sounddev", "get", "Name,Status", "/Format:List",
      ]);
      // Cari blok pertama yang punya Status=OK
      const blocks = out.split(/\r?\n\r?\n/);
      for (const block of blocks) {
        if (/Status=OK/i.test(block)) {
          const m = block.match(/Name=(.+)/i);
          return { active: true, name: m ? m[1].trim() : "Audio Device" };
        }
      }
      return { active: false };
    } else if (platform === "darwin") {
      const out = await runCommand("system_profiler", ["SPAudioDataType"]);
      if (out.includes("Output Channels:") || out.includes("Built-in Output")) {
        return { active: true, name: "Built-in Audio" };
      }
      return { active: false };
    } else {
      // Linux: cek /proc/asound/cards
      if (fs.existsSync("/proc/asound/cards")) {
        const cards = fs.readFileSync("/proc/asound/cards", "utf-8").trim();
        if (cards && !cards.includes("no soundcards")) {
          const m = cards.match(/\[([^\]]+)\]/);
          return { active: true, name: m ? m[1].trim() : "ALSA Audio" };
        }
      }
      return { active: false };
    }
  } catch (err) {
    return { active: false, error: err.message };
  }
});

// --- IPC: PRECHECK — CEK KONEKSI INTERNET ---
ipcMain.handle("precheck-internet", async () => {
  const platform = process.platform;

  // Cek konektivitas pakai domain publik (bukan domain ujian)
  const isOnline = () =>
    new Promise((resolve) => {
      require("dns").lookup("www.google.com", (err) => resolve(!err));
    });

  // 1. Cek WiFi aktif dan ambil SSID
  try {
    let ssid = null;
    if (platform === "win32") {
      const out = await runCommand("netsh", ["wlan", "show", "interfaces"]);
      const stateMatch = out.match(/State\s*:\s*(\S+)/i);
      const ssidMatch  = out.match(/\bSSID\s*:\s*(.+)/i);
      if (stateMatch && stateMatch[1].toLowerCase() === "connected" && ssidMatch) {
        ssid = ssidMatch[1].trim();
      }
    } else if (platform === "darwin") {
      const out = await runCommand("system_profiler", ["SPAirPortDataType"]);
      const m = out.match(/Current Network Information:\s*\n\s{12,}(.+?):/m);
      if (m) ssid = m[1].trim();
    } else {
      const out = await runCommand("nmcli", ["-t", "-f", "ACTIVE,SSID", "dev", "wifi"]);
      for (const line of out.trim().split("\n")) {
        const p = line.split(":");
        if (p[0] === "yes" && p[1]) { ssid = p[1]; break; }
      }
    }
    if (ssid) {
      const connected = await isOnline();
      return { connected, type: "wifi", name: `WiFi — ${ssid}` };
    }
  } catch {}

  // 2. Cek LAN / Ethernet via os.networkInterfaces()
  const nets = os.networkInterfaces();
  for (const [ifName, addrs] of Object.entries(nets)) {
    if (/loopback|^lo$/i.test(ifName)) continue;
    if (/wi.?fi|wlan|wireless/i.test(ifName)) continue;
    const hasIp = addrs.some((a) => a.family === "IPv4" && !a.internal);
    if (hasIp) {
      const connected = await isOnline();
      return { connected, type: "lan", name: "LAN / Ethernet" };
    }
  }

  return { connected: false, type: "none", name: "Tidak Terhubung" };
});

// --- IPC: PRECHECK — LUNCURKAN UJIAN ---
ipcMain.handle("precheck-launch-exam", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(EXAM_URL);
  }
});

// --- IPC: GET WIFI INFO (koneksi saat ini) ---
ipcMain.handle("get-wifi-info", async () => {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      const output = await runCommand("netsh", ["wlan", "show", "interfaces"]);
      const ssidMatch = output.match(/\bSSID\s*:\s*(.+)/i);
      const signalMatch = output.match(/Signal\s*:\s*(\d+)%/i);
      const stateMatch = output.match(/State\s*:\s*(\S+)/i);

      if (stateMatch && stateMatch[1].toLowerCase() === "connected") {
        return {
          connected: true,
          ssid: ssidMatch ? ssidMatch[1].trim() : "Unknown",
          signal: signalMatch ? parseInt(signalMatch[1]) : 100,
        };
      }
      return { connected: false };
    } else if (platform === "darwin") {
      // Gunakan system_profiler karena airport deprecated di macOS 14.4+
      const output = await runCommand("system_profiler", ["SPAirPortDataType"]);
      // Cari bagian "Current Network Information" lalu ambil nama SSID di baris berikutnya
      const currentNetMatch = output.match(
        /Current Network Information:\s*\n\s{12,}(.+?):/m,
      );
      if (currentNetMatch) {
        const ssid = currentNetMatch[1].trim();
        // Ambil RSSI dari "Signal / Noise: -49 dBm / -95 dBm"
        const afterCurrentNet = output.substring(
          output.indexOf("Current Network Information:"),
        );
        const rssiMatch = afterCurrentNet.match(
          /Signal \/ Noise:\s*(-?\d+)\s*dBm/i,
        );
        const rssi = rssiMatch ? parseInt(rssiMatch[1]) : -50;
        const signal = Math.min(100, Math.max(0, 2 * (rssi + 100)));
        return { connected: true, ssid, signal };
      }
      return { connected: false };
    } else {
      const output = await runCommand("nmcli", [
        "-t",
        "-f",
        "ACTIVE,SSID,SIGNAL",
        "dev",
        "wifi",
      ]);
      const lines = output.trim().split("\n");
      for (const line of lines) {
        const parts = line.split(":");
        if (parts[0] === "yes") {
          return {
            connected: true,
            ssid: parts[1],
            signal: parseInt(parts[2]),
          };
        }
      }
      return { connected: false };
    }
  } catch (err) {
    return { connected: false, error: err.message };
  }
});

// --- IPC: GET WIFI NETWORKS (daftar jaringan tersedia) ---
ipcMain.handle("get-wifi-networks", async () => {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      // Dapatkan koneksi aktif dulu
      const ifOutput = await runCommand("netsh", [
        "wlan",
        "show",
        "interfaces",
      ]);
      const currentSsidMatch = ifOutput.match(/\bSSID\s*:\s*(.+)/i);
      const currentSsid = currentSsidMatch ? currentSsidMatch[1].trim() : "";

      const output = await runCommand("netsh", [
        "wlan",
        "show",
        "networks",
        "mode=bssid",
      ]);
      const networks = [];
      const blocks = output.split(/SSID\s+\d+\s+:\s+/i);

      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        
        // The first line is now the SSID name itself because we split on "SSID \d+ : "
        const name = block.split("\n")[0].trim();
        if (!name) continue;

        const signalMatch = block.match(/Signal\s*:\s*(\d+)%/i);
        const authMatch = block.match(/Authentication\s*:\s*(.+)/i);
        const signal = signalMatch ? parseInt(signalMatch[1]) : 0;
        const auth = authMatch ? authMatch[1].trim() : "";

        // Hindari duplikat
        if (!networks.find((n) => n.ssid === name)) {
          networks.push({
            ssid: name,
            signal,
            secured: auth.toLowerCase() !== "open",
            connected: name === currentSsid,
          });
        }
      }

      // Sort: connected pertama, lalu signal terkuat
      networks.sort((a, b) => {
        if (a.connected && !b.connected) return -1;
        if (!a.connected && b.connected) return 1;
        return b.signal - a.signal;
      });

      return networks;
    } else if (platform === "darwin") {
      // Gunakan system_profiler karena airport deprecated di macOS 14.4+
      const output = await runCommand("system_profiler", ["SPAirPortDataType"]);
      const networks = [];
      let currentSsid = "";

      // Deteksi SSID yang sedang terkoneksi
      const currentNetMatch = output.match(
        /Current Network Information:\s*\n\s{12,}(.+?):/m,
      );
      if (currentNetMatch) {
        currentSsid = currentNetMatch[1].trim();
      }

      // Parse jaringan dari "Current Network Information" dan "Other Local Wi-Fi Networks"
      // Format: nama SSID diikuti properti indent
      const networkRegex = /^\s{12,}(.+?):\s*$/gm;
      const signalRegex = /Signal \/ Noise:\s*(-?\d+)\s*dBm/i;
      const securityRegex = /Security:\s*(.+)/i;

      // Ambil semua blok jaringan (Current + Other)
      const sections = output.split(
        /Current Network Information:|Other Local Wi-Fi Networks:/,
      );
      for (let s = 1; s < sections.length; s++) {
        const section = sections[s];
        // Split per jaringan: setiap jaringan dimulai dengan nama di indent 12+ spasi
        const netBlocks = section.split(/\n(?=\s{12,}\S+.*?:\s*$)/m);
        for (const block of netBlocks) {
          const nameMatch = block.match(/^\s{12,}(.+?):\s*$/m);
          if (nameMatch) {
            const ssid = nameMatch[1].trim();
            // Skip properti yang bukan nama jaringan (misal: PHY Mode, Channel, dll)
            if (
              ssid.includes("PHY Mode") ||
              ssid.includes("Channel") ||
              ssid.includes("Security") ||
              ssid.includes("Network Type") ||
              ssid.includes("Signal") ||
              ssid.includes("Transmit") ||
              ssid.includes("MCS") ||
              ssid.includes("Country") ||
              ssid.includes("BSSID")
            )
              continue;

            const rssiMatch = block.match(signalRegex);
            const rssi = rssiMatch ? parseInt(rssiMatch[1]) : -70;
            const signal = Math.min(100, Math.max(0, 2 * (rssi + 100)));
            const secMatch = block.match(securityRegex);
            const secured = secMatch
              ? secMatch[1].trim().toLowerCase() !== "none"
              : true;
            const isConnected = ssid === currentSsid;

            // Hindari duplikat
            if (!networks.find((n) => n.ssid === ssid)) {
              networks.push({ ssid, signal, secured, connected: isConnected });
            }
          }
        }
      }

      // Sort: connected pertama, lalu signal terkuat
      networks.sort((a, b) => {
        if (a.connected && !b.connected) return -1;
        if (!a.connected && b.connected) return 1;
        return b.signal - a.signal;
      });

      return networks;
    } else {
      const output = await runCommand("nmcli", [
        "-t",
        "-f",
        "ACTIVE,SSID,SIGNAL,SECURITY",
        "dev",
        "wifi",
        "list",
      ]);
      const lines = output.trim().split("\n");
      const networks = [];
      for (const line of lines) {
        const parts = line.split(":");
        if (parts[1]) {
          networks.push({
            ssid: parts[1],
            signal: parseInt(parts[2]),
            secured: parts[3] !== "" && parts[3] !== "--",
            connected: parts[0] === "yes",
          });
        }
      }
      return networks;
    }
  } catch (err) {
    return [];
  }
});

// --- IPC: CONNECT WIFI ---
ipcMain.handle("connect-wifi", async (event, ssid, password) => {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      // Cek apakah profil sudah ada
      try {
        await runCommand("netsh", [
          "wlan",
          "show",
          "profile",
          `name="${ssid}"`,
        ]);
        // Profil ada, langsung connect
        await runCommand("netsh", ["wlan", "connect", `name="${ssid}"`, `ssid="${ssid}"`]);
        return { success: true };
      } catch {
        // Profil belum ada, buat profil baru dulu
        if (!password) {
          return { success: false, error: "Password diperlukan" };
        }
        // Buat XML profil WiFi sementara
        const profileXml = `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${ssid}</name>
  <SSIDConfig><SSID><name>${ssid}</name></SSID></SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>auto</connectionMode>
  <MSM><security>
    <authEncryption><authentication>WPA2PSK</authentication><encryption>AES</encryption><useOneX>false</useOneX></authEncryption>
    <sharedKey><keyType>passPhrase</keyType><protected>false</protected><keyMaterial>${password}</keyMaterial></sharedKey>
  </security></MSM>
</WLANProfile>`;

        const tempPath = path.join(app.getPath("temp"), "cbt-wifi-profile.xml");
        fs.writeFileSync(tempPath, profileXml, "utf-8");

        try {
          await runCommand("netsh", [
            "wlan",
            "add",
            "profile",
            `filename="${tempPath}"`,
          ]);
          await runCommand("netsh", ["wlan", "connect", `name="${ssid}"`, `ssid="${ssid}"`]);
          return { success: true };
        } finally {
          // Hapus file profil sementara
          try {
            fs.unlinkSync(tempPath);
          } catch {}
        }
      }
    } else if (platform === "linux") {
      await runCommand("nmcli", [
        "dev",
        "wifi",
        "connect",
        ssid,
        "password",
        password || "",
      ]);
      return { success: true };
    } else {
      return {
        success: false,
        error: "Koneksi WiFi manual tidak didukung di macOS",
      };
    }
  } catch (err) {
    return { success: false, error: err.message || "Gagal menyambungkan" };
  }
});

// --- IPC: GET BATTERY INFO ---
ipcMain.handle("get-battery-info", async () => {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      const output = await runCommand("WMIC", [
        "Path",
        "Win32_Battery",
        "Get",
        "EstimatedChargeRemaining,BatteryStatus",
        "/Format:List",
      ]);
      const percentMatch = output.match(/EstimatedChargeRemaining=(\d+)/i);
      const statusMatch = output.match(/BatteryStatus=(\d+)/i);

      if (percentMatch) {
        const percent = parseInt(percentMatch[1]);
        // BatteryStatus: 1=discharging, 2=AC/charging, 3-5=various charging
        const charging = statusMatch ? parseInt(statusMatch[1]) >= 2 : false;
        return { hasBattery: true, percent, charging };
      }
      return { hasBattery: false };
    } else if (platform === "darwin") {
      const output = await runCommand("pmset", ["-g", "batt"]);
      const match = output.match(/(\d+)%;\s*(\w+)/i);
      if (match) {
        return {
          hasBattery: true,
          percent: parseInt(match[1]),
          charging:
            match[2].toLowerCase() === "charging" ||
            match[2].toLowerCase() === "charged",
        };
      }
      return { hasBattery: false };
    } else {
      // Linux: baca dari /sys/class/power_supply/
      const batPath = "/sys/class/power_supply/BAT0";
      if (fs.existsSync(batPath)) {
        const capacity = parseInt(
          fs.readFileSync(`${batPath}/capacity`, "utf-8").trim(),
        );
        const status = fs.readFileSync(`${batPath}/status`, "utf-8").trim();
        return {
          hasBattery: true,
          percent: capacity,
          charging:
            status.toLowerCase() === "charging" ||
            status.toLowerCase() === "full",
        };
      }
      return { hasBattery: false };
    }
  } catch (err) {
    return { hasBattery: false, error: err.message };
  }
});

// --- IPC: REQUEST EXIT (tombol keluar di taskbar) ---
// Konfirmasi sudah ditangani di sisi renderer (SweetAlert / custom modal),
// IPC ini hanya dipanggil setelah user mengkonfirmasi → langsung quit.
ipcMain.handle("request-exit", async () => {
  globalShortcut.unregisterAll();
  app.quit();
});

// --- IPC: REQUEST REFRESH (tombol refresh di taskbar) ---
ipcMain.handle("request-refresh", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.reloadIgnoringCache();
});

// === APP LIFECYCLE ===

// Ketika Electron sudah siap, buat window dan daftarkan global shortcut blocker
app.whenReady().then(() => {
  // === IZINKAN AKSES KAMERA UNTUK WEBCAM PREVIEW ===
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    callback(permission === "media");
  });

  createWindow();

  // === CEK DUAL MONITOR SAAT STARTUP ===
  checkDisplaySecurity();

  // === MONITOR PERUBAHAN DISPLAY (colok/cabut monitor) ===
  screen.on("display-added", () => {
    console.log("Monitor baru terdeteksi — memblokir...");
    checkDisplaySecurity();
  });

  screen.on("display-removed", () => {
    console.log("Monitor dicabut — memperbarui...");
    checkDisplaySecurity();
  });

  // === DAFTARKAN GLOBAL SHORTCUT BLOCKER ===
  // Blokir shortcut sistem agar siswa tidak bisa keluar dari aplikasi
  BLOCKED_SHORTCUTS.forEach((shortcut) => {
    try {
      globalShortcut.register(shortcut, () => {
        // Tidak melakukan apa-apa — shortcut diblokir
      });
    } catch (err) {
      // Beberapa shortcut mungkin tidak bisa didaftarkan di semua OS
      console.log(`Tidak bisa mendaftarkan shortcut: ${shortcut}`);
    }
  });
});

// Keluar saat semua window ditutup (termasuk macOS)
app.on("window-all-closed", () => {
  app.quit();
});

// Bersihkan global shortcut dan overlay saat app akan keluar
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  // Tutup semua overlay monitor sekunder
  overlayWindows.forEach((w) => {
    if (w && !w.isDestroyed()) {
      w.removeAllListeners("close");
      w.close();
    }
  });
  overlayWindows = [];
});

// macOS: buat ulang window jika dock icon diklik
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
