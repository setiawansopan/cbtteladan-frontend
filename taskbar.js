// ================================================
// TASKBAR CBT TELADAN — Di-inject ke halaman web
// ================================================
// File ini di-inject via webContents.executeJavaScript()
// Akses data sistem via window.cbtTaskbar (dari preload.js)

(function () {
  'use strict';

  // Cegah inject ganda
  if (document.getElementById('cbt-taskbar')) return;

  // === 1. BUAT ELEMEN TASKBAR ===
  const taskbar = document.createElement('div');
  taskbar.id = 'cbt-taskbar';

  taskbar.innerHTML = `
    <div class="cbt-tb-left">
      <span class="cbt-tb-logo">📝</span>
      <span class="cbt-tb-appname">CBT Teladan</span>
      <span class="cbt-tb-divider">|</span>
      <span class="cbt-tb-school">SMA Negeri 1 Yogyakarta</span>
    </div>
    <div class="cbt-tb-right">
      <div class="cbt-tb-item cbt-tb-wifi" id="cbt-wifi-btn" title="Klik untuk melihat jaringan WiFi">
        <span class="cbt-tb-icon" id="cbt-wifi-icon">📶</span>
        <span id="cbt-wifi-name">Memuat...</span>
      </div>
      <div class="cbt-tb-item cbt-tb-battery" id="cbt-battery-info" title="Info Baterai">
        <span class="cbt-tb-icon" id="cbt-battery-icon">🔋</span>
        <span id="cbt-battery-text">--</span>
      </div>
      <div class="cbt-tb-item cbt-tb-clock">
        <span class="cbt-tb-icon">🕐</span>
        <span id="cbt-clock-time">--:--</span>
        <span class="cbt-tb-date" id="cbt-clock-date">--</span>
      </div>
      <div class="cbt-tb-separator"></div>
      <div class="cbt-tb-item cbt-tb-exit" id="cbt-exit-btn" title="Keluar dari aplikasi">
        <span class="cbt-tb-icon">⏻</span>
        <span>Keluar</span>
      </div>
    </div>

    <!-- Panel WiFi (tersembunyi, muncul saat diklik) -->
    <div class="cbt-wifi-panel" id="cbt-wifi-panel">
      <div class="cbt-wifi-panel-header">
        <span>Jaringan WiFi Tersedia</span>
        <button id="cbt-wifi-refresh" title="Refresh">🔄</button>
        <button id="cbt-wifi-close" title="Tutup">✕</button>
      </div>
      <div class="cbt-wifi-list" id="cbt-wifi-list">
        <div class="cbt-wifi-loading">Memindai jaringan...</div>
      </div>
    </div>
  `;

  document.body.appendChild(taskbar);

  // === 2. INJECT CSS ===
  const style = document.createElement('style');
  style.textContent = `
    /* Geser konten halaman agar tidak tertutup taskbar */
    html {
      margin-bottom: 44px !important;
    }

    /* === TASKBAR UTAMA === */
    #cbt-taskbar {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 44px !important;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%) !important;
      border-top: 1px solid #0f3460 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 0 16px !important;
      z-index: 2147483647 !important;
      font-family: 'Segoe UI', -apple-system, sans-serif !important;
      font-size: 13px !important;
      color: #e0e0e0 !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.3) !important;
    }

    /* Sisi kiri */
    .cbt-tb-left {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    .cbt-tb-logo {
      font-size: 18px !important;
    }
    .cbt-tb-appname {
      font-weight: 600 !important;
      color: #fff !important;
      font-size: 13px !important;
    }
    .cbt-tb-divider {
      color: #444 !important;
      margin: 0 2px !important;
    }
    .cbt-tb-school {
      color: #8892b0 !important;
      font-size: 11px !important;
    }

    /* Sisi kanan */
    .cbt-tb-right {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    /* Item di taskbar */
    .cbt-tb-item {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 4px 10px !important;
      border-radius: 6px !important;
      transition: background 0.15s !important;
      cursor: default !important;
      white-space: nowrap !important;
    }
    .cbt-tb-item:hover {
      background: rgba(255,255,255,0.08) !important;
    }
    .cbt-tb-icon {
      font-size: 16px !important;
      line-height: 1 !important;
    }

    /* WiFi button */
    .cbt-tb-wifi {
      cursor: pointer !important;
    }
    .cbt-tb-wifi:hover {
      background: rgba(255,255,255,0.12) !important;
    }

    /* Battery warning */
    .cbt-battery-low {
      color: #ff6b6b !important;
      animation: cbt-blink 1s infinite !important;
    }
    @keyframes cbt-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Clock */
    .cbt-tb-clock {
      min-width: 130px !important;
      justify-content: center !important;
    }

    /* Separator */
    .cbt-tb-separator {
      width: 1px !important;
      height: 24px !important;
      background: #333 !important;
      margin: 0 4px !important;
    }

    /* Tombol Keluar */
    .cbt-tb-exit {
      cursor: pointer !important;
      color: #ff6b6b !important;
      border-radius: 6px !important;
      transition: all 0.15s !important;
    }
    .cbt-tb-exit:hover {
      background: rgba(255, 107, 107, 0.15) !important;
      color: #ff4757 !important;
    }
    .cbt-tb-exit .cbt-tb-icon {
      font-size: 15px !important;
    }
    #cbt-clock-time {
      font-weight: 600 !important;
      font-size: 13px !important;
      color: #fff !important;
      font-variant-numeric: tabular-nums !important;
    }
    .cbt-tb-date {
      font-size: 11px !important;
      color: #8892b0 !important;
      margin-left: 4px !important;
    }

    /* === PANEL WiFi === */
    .cbt-wifi-panel {
      display: none;
      position: fixed !important;
      bottom: 50px !important;
      right: 16px !important;
      width: 320px !important;
      max-height: 380px !important;
      background: #1a1a2e !important;
      border: 1px solid #0f3460 !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
      z-index: 2147483647 !important;
      overflow: hidden !important;
      font-family: 'Segoe UI', -apple-system, sans-serif !important;
    }
    .cbt-wifi-panel.open {
      display: block !important;
    }
    .cbt-wifi-panel-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 12px 16px !important;
      background: #16213e !important;
      border-bottom: 1px solid #0f3460 !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #fff !important;
    }
    .cbt-wifi-panel-header button {
      background: none !important;
      border: none !important;
      color: #8892b0 !important;
      cursor: pointer !important;
      font-size: 14px !important;
      padding: 4px 6px !important;
      border-radius: 4px !important;
    }
    .cbt-wifi-panel-header button:hover {
      background: rgba(255,255,255,0.1) !important;
      color: #fff !important;
    }
    .cbt-wifi-list {
      max-height: 300px !important;
      overflow-y: auto !important;
      padding: 8px !important;
    }
    .cbt-wifi-loading {
      text-align: center !important;
      padding: 20px !important;
      color: #8892b0 !important;
      font-size: 12px !important;
    }

    /* Item WiFi */
    .cbt-wifi-item {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 10px 12px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      transition: background 0.15s !important;
      margin-bottom: 2px !important;
    }
    .cbt-wifi-item:hover {
      background: rgba(255,255,255,0.08) !important;
    }
    .cbt-wifi-item.connected {
      background: rgba(46, 213, 115, 0.12) !important;
      border: 1px solid rgba(46, 213, 115, 0.3) !important;
    }
    .cbt-wifi-item-left {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }
    .cbt-wifi-item-name {
      font-size: 13px !important;
      color: #e0e0e0 !important;
    }
    .cbt-wifi-item-status {
      font-size: 11px !important;
      color: #2ed573 !important;
    }
    .cbt-wifi-item-signal {
      font-size: 14px !important;
    }

    /* Password dialog */
    .cbt-wifi-password-dialog {
      padding: 12px 16px !important;
      background: #16213e !important;
      border-top: 1px solid #0f3460 !important;
    }
    .cbt-wifi-password-dialog input {
      width: 100% !important;
      padding: 8px 12px !important;
      border: 1px solid #0f3460 !important;
      border-radius: 6px !important;
      background: #1a1a2e !important;
      color: #fff !important;
      font-size: 13px !important;
      outline: none !important;
      box-sizing: border-box !important;
      margin-bottom: 8px !important;
    }
    .cbt-wifi-password-dialog input:focus {
      border-color: #3b82f6 !important;
    }
    .cbt-wifi-password-btns {
      display: flex !important;
      gap: 8px !important;
      justify-content: flex-end !important;
    }
    .cbt-wifi-password-btns button {
      padding: 6px 16px !important;
      border-radius: 6px !important;
      border: none !important;
      cursor: pointer !important;
      font-size: 12px !important;
    }
    .cbt-wifi-btn-connect {
      background: #3b82f6 !important;
      color: #fff !important;
    }
    .cbt-wifi-btn-connect:hover {
      background: #2563eb !important;
    }
    .cbt-wifi-btn-cancel {
      background: #333 !important;
      color: #ccc !important;
    }

    /* Scrollbar */
    .cbt-wifi-list::-webkit-scrollbar {
      width: 6px !important;
    }
    .cbt-wifi-list::-webkit-scrollbar-track {
      background: transparent !important;
    }
    .cbt-wifi-list::-webkit-scrollbar-thumb {
      background: #333 !important;
      border-radius: 3px !important;
    }
  `;
  document.head.appendChild(style);

  // === 3. LOGIC JAM & TANGGAL ===
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');

    const hari = HARI[now.getDay()];
    const tgl = now.getDate();
    const bulan = BULAN[now.getMonth()];
    const tahun = now.getFullYear();

    document.getElementById('cbt-clock-time').textContent = `${hours}:${mins}:${secs}`;
    document.getElementById('cbt-clock-date').textContent = `${hari}, ${tgl} ${bulan} ${tahun}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // === 4. LOGIC WIFI ===
  const wifiBtn = document.getElementById('cbt-wifi-btn');
  const wifiPanel = document.getElementById('cbt-wifi-panel');
  const wifiList = document.getElementById('cbt-wifi-list');
  const wifiClose = document.getElementById('cbt-wifi-close');
  const wifiRefresh = document.getElementById('cbt-wifi-refresh');
  const wifiNameEl = document.getElementById('cbt-wifi-name');
  const wifiIconEl = document.getElementById('cbt-wifi-icon');

  // Update info WiFi saat ini
  async function updateWifiInfo() {
    try {
      if (!window.cbtTaskbar) return;
      const info = await window.cbtTaskbar.getWifiInfo();
      if (info && info.connected) {
        wifiNameEl.textContent = info.ssid || 'Terhubung';
        wifiIconEl.textContent = getSignalIcon(info.signal || 100);
      } else {
        wifiNameEl.textContent = 'Tidak terhubung';
        wifiIconEl.textContent = '📡';
      }
    } catch (err) {
      wifiNameEl.textContent = 'WiFi';
      wifiIconEl.textContent = '📶';
    }
  }

  // Dapatkan ikon signal berdasarkan kekuatan
  function getSignalIcon(signal) {
    if (signal >= 75) return '📶';
    if (signal >= 50) return '📶';
    if (signal >= 25) return '📡';
    return '📡';
  }

  // Muat daftar jaringan WiFi
  async function loadWifiNetworks() {
    wifiList.innerHTML = '<div class="cbt-wifi-loading">⏳ Memindai jaringan...</div>';
    try {
      if (!window.cbtTaskbar) return;
      const networks = await window.cbtTaskbar.getWifiNetworks();
      if (!networks || networks.length === 0) {
        wifiList.innerHTML = '<div class="cbt-wifi-loading">Tidak ada jaringan ditemukan</div>';
        return;
      }

      wifiList.innerHTML = '';
      networks.forEach((net) => {
        const item = document.createElement('div');
        item.className = 'cbt-wifi-item' + (net.connected ? ' connected' : '');
        item.innerHTML = `
          <div class="cbt-wifi-item-left">
            <span class="cbt-wifi-item-signal">${getSignalIcon(net.signal)}</span>
            <div>
              <div class="cbt-wifi-item-name">${escapeHtml(net.ssid)}</div>
              ${net.connected ? '<div class="cbt-wifi-item-status">✓ Terhubung</div>' : ''}
            </div>
          </div>
          ${net.secured ? '<span style="font-size:12px;color:#8892b0">🔒</span>' : ''}
        `;

        if (!net.connected) {
          item.addEventListener('click', () => promptWifiPassword(net.ssid));
        }

        wifiList.appendChild(item);
      });
    } catch (err) {
      wifiList.innerHTML = '<div class="cbt-wifi-loading">Gagal memindai jaringan</div>';
    }
  }

  // Tampilkan dialog password WiFi
  function promptWifiPassword(ssid) {
    // Hapus dialog lama jika ada
    const oldDialog = document.getElementById('cbt-wifi-pwd-dialog');
    if (oldDialog) oldDialog.remove();

    const dialog = document.createElement('div');
    dialog.id = 'cbt-wifi-pwd-dialog';
    dialog.className = 'cbt-wifi-password-dialog';
    dialog.innerHTML = `
      <div style="font-size:12px;color:#8892b0;margin-bottom:6px;">Sambungkan ke <strong style="color:#fff">${escapeHtml(ssid)}</strong></div>
      <input type="password" id="cbt-wifi-pwd-input" placeholder="Masukkan kata sandi..." autocomplete="off" />
      <div class="cbt-wifi-password-btns">
        <button class="cbt-wifi-btn-cancel" id="cbt-wifi-pwd-cancel">Batal</button>
        <button class="cbt-wifi-btn-connect" id="cbt-wifi-pwd-connect">Sambungkan</button>
      </div>
    `;
    wifiPanel.appendChild(dialog);

    const pwdInput = document.getElementById('cbt-wifi-pwd-input');
    pwdInput.focus();

    document.getElementById('cbt-wifi-pwd-cancel').addEventListener('click', () => dialog.remove());
    document.getElementById('cbt-wifi-pwd-connect').addEventListener('click', async () => {
      const password = pwdInput.value;
      dialog.innerHTML = '<div class="cbt-wifi-loading">⏳ Menyambungkan...</div>';
      try {
        const result = await window.cbtTaskbar.connectWifi(ssid, password);
        if (result && result.success) {
          dialog.innerHTML = '<div class="cbt-wifi-loading" style="color:#2ed573">✓ Berhasil terhubung!</div>';
          setTimeout(() => {
            dialog.remove();
            loadWifiNetworks();
            updateWifiInfo();
          }, 1500);
        } else {
          dialog.innerHTML = `<div class="cbt-wifi-loading" style="color:#ff6b6b">✗ Gagal: ${escapeHtml(result?.error || 'Tidak diketahui')}</div>`;
          setTimeout(() => dialog.remove(), 2500);
        }
      } catch (err) {
        dialog.innerHTML = '<div class="cbt-wifi-loading" style="color:#ff6b6b">✗ Gagal menyambungkan</div>';
        setTimeout(() => dialog.remove(), 2500);
      }
    });

    // Enter key untuk connect
    pwdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('cbt-wifi-pwd-connect')?.click();
      if (e.key === 'Escape') dialog.remove();
      e.stopPropagation(); // Agar tidak terblokir oleh anti-cheat
    });
  }

  // Toggle panel WiFi
  wifiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = wifiPanel.classList.contains('open');
    if (isOpen) {
      wifiPanel.classList.remove('open');
    } else {
      wifiPanel.classList.add('open');
      loadWifiNetworks();
    }
  });

  wifiClose.addEventListener('click', () => wifiPanel.classList.remove('open'));
  wifiRefresh.addEventListener('click', loadWifiNetworks);

  // Tutup panel jika klik di luar
  document.addEventListener('click', (e) => {
    if (!wifiPanel.contains(e.target) && !wifiBtn.contains(e.target)) {
      wifiPanel.classList.remove('open');
    }
  });

  // === 5. LOGIC BATERAI ===
  const batteryTextEl = document.getElementById('cbt-battery-text');
  const batteryIconEl = document.getElementById('cbt-battery-icon');
  const batteryInfoEl = document.getElementById('cbt-battery-info');

  function getBatteryIcon(percent, charging) {
    if (charging) return '🔌';
    if (percent >= 80) return '🔋';
    if (percent >= 50) return '🔋';
    if (percent >= 20) return '🪫';
    return '🪫';
  }

  async function updateBatteryInfo() {
    try {
      if (!window.cbtTaskbar) return;
      const info = await window.cbtTaskbar.getBatteryInfo();
      if (info && info.hasBattery) {
        batteryIconEl.textContent = getBatteryIcon(info.percent, info.charging);
        batteryTextEl.textContent = `${info.percent}%`;
        batteryInfoEl.title = `Baterai: ${info.percent}%${info.charging ? ' (Mengisi)' : ''}`;

        // Warning jika baterai rendah
        if (info.percent <= 15 && !info.charging) {
          batteryTextEl.classList.add('cbt-battery-low');
          batteryInfoEl.title = `⚠️ Baterai Rendah: ${info.percent}%! Segera hubungkan charger.`;
        } else {
          batteryTextEl.classList.remove('cbt-battery-low');
        }
      } else {
        // Desktop / tidak ada baterai
        batteryIconEl.textContent = '🔌';
        batteryTextEl.textContent = 'AC';
        batteryInfoEl.title = 'Daya listrik (tanpa baterai)';
      }
    } catch (err) {
      batteryIconEl.textContent = '🔋';
      batteryTextEl.textContent = '--';
    }
  }

  // === 6. HELPER ===
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // === 7. TOMBOL KELUAR ===
  const exitBtn = document.getElementById('cbt-exit-btn');
  exitBtn.addEventListener('click', async () => {
    if (window.cbtTaskbar && window.cbtTaskbar.requestExit) {
      window.cbtTaskbar.requestExit();
    }
  });

  // === 8. MULAI UPDATE PERIODIK ===
  updateWifiInfo();
  updateBatteryInfo();

  // Update WiFi setiap 15 detik
  setInterval(updateWifiInfo, 15000);

  // Update baterai setiap 30 detik
  setInterval(updateBatteryInfo, 30000);

})();
