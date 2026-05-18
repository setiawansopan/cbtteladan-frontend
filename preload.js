const { contextBridge, ipcRenderer } = require("electron");

// === BLOKIR KEYBOARD BERBAHAYA DI LEVEL DOM ===
// Ini sebagai lapisan pertahanan tambahan di renderer process.
// Tidak mempengaruhi SweetAlert, karena hanya memblokir kombinasi
// tombol modifier (Alt, Meta/Win) dan bukan tombol biasa.
window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    // Blokir semua kombinasi tombol Alt (Alt+Tab, Alt+Escape, dll)
    // KECUALI jika sedang mengetik di input/textarea (agar karakter khusus tetap bisa)
    if (e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }

    // Blokir tombol Windows/Meta (Super key)
    if (e.metaKey || e.key === 'Meta' || e.key === 'OS') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }

    // Blokir Escape (keluar fullscreen)
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }

    // Blokir PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }

    // Blokir F11 (toggle fullscreen)
    if (e.key === 'F11') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }

    // Blokir F12 (DevTools)
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true); // 'true' = capture phase, agar dijalankan SEBELUM event handler lain

  // Blokir juga pada keyup untuk mencegah Alt key release membuka menu
  document.addEventListener('keyup', (e) => {
    if (e.altKey || e.key === 'Alt' || e.key === 'Meta' || e.key === 'OS') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);
});

// === BRIDGE PRE-CHECK: API untuk halaman pengecekan sistem ===
// Tersedia via window.cbtPrecheck di precheck.html
contextBridge.exposeInMainWorld("cbtPrecheck", {
  getSystemInfo: () => ipcRenderer.invoke("precheck-system-info"),
  checkInternet: () => ipcRenderer.invoke("precheck-internet"),
  launchExam: () => ipcRenderer.invoke("precheck-launch-exam"),
});

// === BRIDGE AMAN: Expose API ke renderer tanpa akses Node.js langsung ===
// Semua fungsi di sini bisa dipanggil dari halaman web via window.cbtTaskbar
contextBridge.exposeInMainWorld("cbtTaskbar", {
  // Ambil info WiFi saat ini (nama jaringan, signal strength)
  getWifiInfo: () => ipcRenderer.invoke("get-wifi-info"),

  // Ambil daftar jaringan WiFi yang tersedia
  getWifiNetworks: () => ipcRenderer.invoke("get-wifi-networks"),

  // Sambungkan ke jaringan WiFi tertentu
  connectWifi: (ssid, password) =>
    ipcRenderer.invoke("connect-wifi", ssid, password),

  // Ambil info baterai (persentase, status charging)
  getBatteryInfo: () => ipcRenderer.invoke("get-battery-info"),

  // Request refresh halaman ujian
  requestRefresh: () => ipcRenderer.invoke("request-refresh"),

  // Request keluar dari aplikasi (konfirmasi via SweetAlert di renderer, lalu panggil ini)
  requestExit: () => ipcRenderer.invoke("request-exit"),
});
