const { contextBridge, ipcRenderer } = require('electron');

// === BRIDGE AMAN: Expose API ke renderer tanpa akses Node.js langsung ===
// Semua fungsi di sini bisa dipanggil dari halaman web via window.cbtTaskbar
contextBridge.exposeInMainWorld('cbtTaskbar', {
  // Ambil info WiFi saat ini (nama jaringan, signal strength)
  getWifiInfo: () => ipcRenderer.invoke('get-wifi-info'),

  // Ambil daftar jaringan WiFi yang tersedia
  getWifiNetworks: () => ipcRenderer.invoke('get-wifi-networks'),

  // Sambungkan ke jaringan WiFi tertentu
  connectWifi: (ssid, password) => ipcRenderer.invoke('connect-wifi', ssid, password),

  // Ambil info baterai (persentase, status charging)
  getBatteryInfo: () => ipcRenderer.invoke('get-battery-info'),

  // Request keluar dari aplikasi (akan tampilkan dialog konfirmasi)
  requestExit: () => ipcRenderer.invoke('request-exit'),
});
