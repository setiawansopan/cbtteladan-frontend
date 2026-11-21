// ================================================
// TASKBAR CBT TELADAN — Di-inject ke halaman web
// ================================================
// File ini di-inject via webContents.executeJavaScript()
// Akses data sistem via window.cbtTaskbar (dari preload.js)

(function () {
  "use strict";

  // Diganti main.js dengan nomor versi dari package.json saat inject.
  const APP_VERSION = "__CBT_VERSION__";
  const versionLabel = APP_VERSION.startsWith("__") ? "" : "v" + APP_VERSION;

  // Logo kecil (data URI) diganti main.js; kosong bila tidak tersedia.
  const LOGO_SRC = "__CBT_LOGO__";
  const logoHtml =
    LOGO_SRC.startsWith("data:")
      ? `<img class="cbt-tb-logo-img" src="${LOGO_SRC}" alt="">`
      : "";

  // Ikon SVG (Material) mengikuti warna teks; emoji tidak dipakai agar tampil
  // sama di semua komputer.
  const svg = (d) =>
    `<svg class="cbt-tb-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON = {
    wifi: svg("M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zM9 17l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zM5 13l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"),
    battery: svg("M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"),
    batteryCharging: svg("M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM11 20v-5.5H9L13 7v5.5h2L11 20z"),
    plug: svg("M16.01 7L16 3h-2v4h-4V3H8v4h-.01C7 6.99 6 7.99 6 8.99v5.49L9.5 18v3h5v-3l3.5-3.51v-5.5c0-1.1-.9-2-1.99-1.99z"),
    refresh: svg("M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"),
    power: svg("M13 3h-2v10h2V3zm4.83 2.17-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"),
  };

  // Cegah inject ganda
  if (document.getElementById("cbt-taskbar")) return;

  // === 1. BUAT ELEMEN TASKBAR ===
  const taskbar = document.createElement("div");
  taskbar.id = "cbt-taskbar";

  taskbar.innerHTML = `
    <div class="cbt-tb-left">
      ${logoHtml}
      <div class="cbt-tb-brand">
        <span class="cbt-tb-appname">CBT Teladan</span>
        <span class="cbt-tb-version">${versionLabel ? versionLabel + " · " : ""}SMA Negeri 1 Yogyakarta</span>
      </div>
    </div>
    <div class="cbt-tb-right">
      <div class="cbt-tb-item cbt-tb-wifi" id="cbt-wifi-btn" title="Klik untuk melihat jaringan WiFi">
        <span class="cbt-tb-icon" id="cbt-wifi-icon">${ICON.wifi}</span>
        <span id="cbt-wifi-name">Memuat...</span>
      </div>
      <div class="cbt-tb-item cbt-tb-battery" id="cbt-battery-info" title="Info Baterai">
        <span class="cbt-tb-icon" id="cbt-battery-icon">${ICON.battery}</span>
        <span id="cbt-battery-text">--</span>
      </div>
      <div class="cbt-tb-item cbt-tb-clock">
        <span id="cbt-clock-time">--:--</span>
        <span class="cbt-tb-date" id="cbt-clock-date">--</span>
      </div>
      <div class="cbt-tb-separator"></div>
      <div class="cbt-tb-action cbt-tb-refresh" id="cbt-refresh-btn" title="Refresh halaman ujian">
        ${ICON.refresh}
        <span>Refresh</span>
      </div>
      <div class="cbt-tb-action cbt-tb-exit" id="cbt-exit-btn" title="Keluar dari aplikasi">
        ${ICON.power}
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
  const style = document.createElement("style");
  style.textContent = `
    /* Geser konten halaman agar tidak tertutup taskbar */
    html {
      margin-bottom: 52px !important;
    }

    /* === TASKBAR UTAMA === */
    #cbt-taskbar {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 52px !important;
      background: #0f172a !important;
      border-top: 1px solid #1e3a5f !important;
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

    /* Saat modal konfirmasi aktif (mis. SweetAlert),
       z-index taskbar diturunkan agar SweetAlert tampil di atasnya.
       TIDAK menggunakan pointer-events:none karena bisa menyebabkan
       taskbar mati permanen jika modal dari website ujian terdeteksi.
       SweetAlert backdrop (position:fixed inset:0) sudah cukup untuk
       mencegah interaksi dengan taskbar saat modal aktif. */
    body.cbt-modal-active #cbt-taskbar {
      z-index: 2147483640 !important;
    }

    /* Pastikan container SweetAlert selalu muncul di atas taskbar */
    .swal2-container,
    .swal2-backdrop-show,
    .swal2-shown,
    .swal-overlay,
    .sweet-overlay,
    .sweet-alert {
      z-index: 2147483646 !important;
    }

    /* Sisi kiri: logo + nama aplikasi dua baris (sama dengan aplikasi Android) */
    .cbt-tb-left {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      min-width: 0 !important;
    }
    .cbt-tb-logo-img {
      width: 30px !important;
      height: 30px !important;
      object-fit: contain !important;
      flex-shrink: 0 !important;
    }
    .cbt-tb-brand {
      display: flex !important;
      flex-direction: column !important;
      line-height: 1.25 !important;
    }
    .cbt-tb-appname {
      font-weight: 700 !important;
      color: #fff !important;
      font-size: 13px !important;
    }
    .cbt-tb-version {
      font-size: 10.5px !important;
      color: #94a3b8 !important;
    }

    /* Sisi kanan */
    .cbt-tb-right {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    /* Info: jaringan, baterai, jam */
    .cbt-tb-item {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 4px 10px !important;
      border-radius: 8px !important;
      transition: background 0.15s !important;
      cursor: default !important;
      white-space: nowrap !important;
      color: #fff !important;
      font-size: 12px !important;
    }
    .cbt-tb-item:hover {
      background: rgba(255,255,255,0.08) !important;
    }
    .cbt-tb-icon {
      display: flex !important;
      align-items: center !important;
    }
    .cbt-tb-wifi {
      cursor: pointer !important;
    }
    .cbt-tb-wifi:hover {
      background: rgba(255,255,255,0.12) !important;
    }
    .cbt-tb-wifi.cbt-off .cbt-tb-icon {
      opacity: 0.4 !important;
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

    /* Jam di atas, tanggal di bawah */
    .cbt-tb-clock {
      flex-direction: column !important;
      justify-content: center !important;
      gap: 0 !important;
      min-width: 70px !important;
      line-height: 1.2 !important;
    }
    #cbt-clock-time {
      font-weight: 700 !important;
      font-size: 14px !important;
      color: #fff !important;
      font-variant-numeric: tabular-nums !important;
    }
    .cbt-tb-date {
      font-size: 10.5px !important;
      color: #94a3b8 !important;
    }

    /* Separator */
    .cbt-tb-separator {
      width: 1px !important;
      height: 30px !important;
      background: #334155 !important;
      margin: 0 6px !important;
    }

    /* Tombol Refresh dan Keluar: ikon di atas, label di bawah */
    .cbt-tb-action {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 2px !important;
      min-width: 60px !important;
      height: 42px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      font-size: 10.5px !important;
      transition: background 0.15s !important;
    }
    .cbt-tb-action .cbt-tb-svg {
      width: 20px !important;
      height: 20px !important;
    }
    .cbt-tb-refresh {
      color: #70a1ff !important;
    }
    .cbt-tb-refresh:hover {
      background: rgba(112, 161, 255, 0.18) !important;
      color: #9ec1ff !important;
    }
    .cbt-tb-exit {
      color: #ff6b6b !important;
    }
    .cbt-tb-exit:hover {
      background: rgba(255, 107, 107, 0.15) !important;
      color: #ff4757 !important;
    }

    /* Ikon SVG mengikuti warna teks */
    .cbt-tb-svg {
      width: 18px !important;
      height: 18px !important;
      display: block !important;
      fill: currentColor !important;
    }

    /* === PANEL WiFi === */
    .cbt-wifi-panel {
      display: none;
      position: fixed !important;
      bottom: 58px !important;
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

    /* === MODAL KONFIRMASI KELUAR === */
    #cbt-exit-modal {
      display: none;
      position: fixed !important;
      inset: 0 !important;
      background: rgba(0,0,0,0.78) !important;
      z-index: 2147483645 !important;
      align-items: center !important;
      justify-content: center !important;
      backdrop-filter: blur(6px) !important;
      -webkit-backdrop-filter: blur(6px) !important;
    }
    #cbt-exit-modal.open {
      display: flex !important;
    }
    .cbt-exit-modal-card {
      background: #1a1a2e !important;
      border: 1px solid #ef4444 !important;
      border-radius: 16px !important;
      padding: 36px 32px 28px !important;
      max-width: 380px !important;
      width: 88% !important;
      text-align: center !important;
      box-shadow: 0 24px 64px rgba(0,0,0,0.85), 0 0 40px rgba(239,68,68,0.18) !important;
      animation: cbt-exit-in 0.2s cubic-bezier(.34,1.56,.64,1) both !important;
      font-family: 'Segoe UI', -apple-system, sans-serif !important;
    }
    @keyframes cbt-exit-in {
      from { transform: scale(0.82); opacity: 0; }
      to   { transform: scale(1);    opacity: 1; }
    }
    .cbt-exit-modal-icon {
      font-size: 52px !important;
      margin-bottom: 14px !important;
      display: block !important;
      filter: drop-shadow(0 0 12px rgba(239,68,68,0.5)) !important;
    }
    .cbt-exit-modal-title {
      font-size: 20px !important;
      font-weight: 700 !important;
      color: #fff !important;
      margin: 0 0 10px !important;
    }
    .cbt-exit-modal-msg {
      font-size: 14px !important;
      color: #8892b0 !important;
      margin: 0 0 26px !important;
      line-height: 1.6 !important;
    }
    .cbt-exit-modal-btns {
      display: flex !important;
      gap: 10px !important;
      justify-content: center !important;
    }
    .cbt-exit-btn-cancel {
      padding: 10px 26px !important;
      border-radius: 8px !important;
      border: 1px solid #374151 !important;
      background: #1f2937 !important;
      color: #d1d5db !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.15s !important;
      font-family: inherit !important;
    }
    .cbt-exit-btn-cancel:hover {
      background: #374151 !important;
      color: #fff !important;
    }
    .cbt-exit-btn-confirm {
      padding: 10px 26px !important;
      border-radius: 8px !important;
      border: none !important;
      background: #ef4444 !important;
      color: #fff !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.15s !important;
      font-family: inherit !important;
    }
    .cbt-exit-btn-confirm:hover:not(:disabled) {
      background: #dc2626 !important;
      box-shadow: 0 4px 14px rgba(239,68,68,0.45) !important;
    }
    .cbt-exit-btn-confirm:disabled {
      background: #6b7280 !important;
      cursor: not-allowed !important;
    }
  `;
  document.head.appendChild(style);

  // === 3. LOGIC JAM & TANGGAL ===
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const BULAN = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");

    const hari = HARI[now.getDay()].slice(0, 3);
    const tgl = now.getDate();
    const bulan = BULAN[now.getMonth()];

    document.getElementById("cbt-clock-time").textContent = `${hours}:${mins}`;
    document.getElementById("cbt-clock-date").textContent =
      `${hari}, ${tgl} ${bulan}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // === 4. LOGIC WIFI ===
  const wifiBtn = document.getElementById("cbt-wifi-btn");
  const wifiPanel = document.getElementById("cbt-wifi-panel");
  const wifiList = document.getElementById("cbt-wifi-list");
  const wifiClose = document.getElementById("cbt-wifi-close");
  const wifiRefresh = document.getElementById("cbt-wifi-refresh");
  const wifiNameEl = document.getElementById("cbt-wifi-name");
  const wifiIconEl = document.getElementById("cbt-wifi-icon");

  // Update info WiFi saat ini
  async function updateWifiInfo() {
    try {
      if (!window.cbtTaskbar) return;
      const info = await window.cbtTaskbar.getWifiInfo();
      if (info && info.connected) {
        wifiNameEl.textContent = info.ssid || "Terhubung";
        wifiIconEl.innerHTML = ICON.wifi;
        wifiBtn.classList.remove("cbt-off");
      } else {
        wifiNameEl.textContent = "Tidak terhubung";
        wifiIconEl.innerHTML = ICON.wifi;
        wifiBtn.classList.add("cbt-off");
      }
    } catch (err) {
      wifiNameEl.textContent = "WiFi";
      wifiIconEl.innerHTML = ICON.wifi;
    }
  }

  // Dapatkan ikon signal berdasarkan kekuatan
  function getSignalIcon(signal) {
    if (signal >= 75) return "📶";
    if (signal >= 50) return "📶";
    if (signal >= 25) return "📡";
    return "📡";
  }

  // Muat daftar jaringan WiFi
  async function loadWifiNetworks() {
    wifiList.innerHTML =
      '<div class="cbt-wifi-loading">⏳ Memindai jaringan...</div>';
    try {
      if (!window.cbtTaskbar) return;
      const networks = await window.cbtTaskbar.getWifiNetworks();
      if (!networks || networks.length === 0) {
        wifiList.innerHTML =
          '<div class="cbt-wifi-loading">Tidak ada jaringan ditemukan</div>';
        return;
      }

      wifiList.innerHTML = "";
      networks.forEach((net) => {
        const item = document.createElement("div");
        item.className = "cbt-wifi-item" + (net.connected ? " connected" : "");
        item.innerHTML = `
          <div class="cbt-wifi-item-left">
            <span class="cbt-wifi-item-signal">${getSignalIcon(net.signal)}</span>
            <div>
              <div class="cbt-wifi-item-name">${escapeHtml(net.ssid)}</div>
              ${net.connected ? '<div class="cbt-wifi-item-status">✓ Terhubung</div>' : ""}
            </div>
          </div>
          ${net.secured ? '<span style="font-size:12px;color:#8892b0">🔒</span>' : ""}
        `;

        if (!net.connected) {
          item.addEventListener("click", () => promptWifiPassword(net.ssid));
        }

        wifiList.appendChild(item);
      });
    } catch (err) {
      wifiList.innerHTML =
        '<div class="cbt-wifi-loading">Gagal memindai jaringan</div>';
    }
  }

  // Tampilkan dialog password WiFi
  function promptWifiPassword(ssid) {
    // Hapus dialog lama jika ada
    const oldDialog = document.getElementById("cbt-wifi-pwd-dialog");
    if (oldDialog) oldDialog.remove();

    const dialog = document.createElement("div");
    dialog.id = "cbt-wifi-pwd-dialog";
    dialog.className = "cbt-wifi-password-dialog";
    dialog.innerHTML = `
      <div style="font-size:12px;color:#8892b0;margin-bottom:6px;">Sambungkan ke <strong style="color:#fff">${escapeHtml(ssid)}</strong></div>
      <input type="password" id="cbt-wifi-pwd-input" placeholder="Masukkan kata sandi..." autocomplete="off" />
      <div class="cbt-wifi-password-btns">
        <button class="cbt-wifi-btn-cancel" id="cbt-wifi-pwd-cancel">Batal</button>
        <button class="cbt-wifi-btn-connect" id="cbt-wifi-pwd-connect">Sambungkan</button>
      </div>
    `;
    wifiPanel.appendChild(dialog);

    const pwdInput = document.getElementById("cbt-wifi-pwd-input");
    pwdInput.focus();

    document
      .getElementById("cbt-wifi-pwd-cancel")
      .addEventListener("click", () => dialog.remove());
    document
      .getElementById("cbt-wifi-pwd-connect")
      .addEventListener("click", async () => {
        const password = pwdInput.value;
        dialog.innerHTML =
          '<div class="cbt-wifi-loading">⏳ Menyambungkan...</div>';
        try {
          const result = await window.cbtTaskbar.connectWifi(ssid, password);
          if (result && result.success) {
            dialog.innerHTML =
              '<div class="cbt-wifi-loading" style="color:#2ed573">✓ Berhasil terhubung!</div>';
            setTimeout(() => {
              dialog.remove();
              loadWifiNetworks();
              updateWifiInfo();
            }, 1500);
          } else {
            dialog.innerHTML = `<div class="cbt-wifi-loading" style="color:#ff6b6b">✗ Gagal: ${escapeHtml(result?.error || "Tidak diketahui")}</div>`;
            setTimeout(() => dialog.remove(), 2500);
          }
        } catch (err) {
          dialog.innerHTML =
            '<div class="cbt-wifi-loading" style="color:#ff6b6b">✗ Gagal menyambungkan</div>';
          setTimeout(() => dialog.remove(), 2500);
        }
      });

    // Enter key untuk connect
    pwdInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        document.getElementById("cbt-wifi-pwd-connect")?.click();
      if (e.key === "Escape") dialog.remove();
      e.stopPropagation(); // Agar tidak terblokir oleh anti-cheat
    });
  }

  // Toggle panel WiFi
  wifiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = wifiPanel.classList.contains("open");
    if (isOpen) {
      wifiPanel.classList.remove("open");
    } else {
      wifiPanel.classList.add("open");
      loadWifiNetworks();
    }
  });

  wifiClose.addEventListener("click", () => wifiPanel.classList.remove("open"));
  wifiRefresh.addEventListener("click", loadWifiNetworks);

  // Tutup panel jika klik di luar
  document.addEventListener("click", (e) => {
    if (!wifiPanel.contains(e.target) && !wifiBtn.contains(e.target)) {
      wifiPanel.classList.remove("open");
    }
  });

  // === 5. LOGIC BATERAI ===
  const batteryTextEl = document.getElementById("cbt-battery-text");
  const batteryIconEl = document.getElementById("cbt-battery-icon");
  const batteryInfoEl = document.getElementById("cbt-battery-info");

  async function updateBatteryInfo() {
    try {
      if (!window.cbtTaskbar) return;
      const info = await window.cbtTaskbar.getBatteryInfo();
      if (info && info.hasBattery) {
        batteryIconEl.innerHTML = info.charging
          ? ICON.batteryCharging
          : ICON.battery;
        batteryTextEl.textContent = `${info.percent}%`;
        batteryInfoEl.title = `Baterai: ${info.percent}%${info.charging ? " (Mengisi)" : ""}`;

        // Warning jika baterai rendah
        if (info.percent <= 15 && !info.charging) {
          batteryTextEl.classList.add("cbt-battery-low");
          batteryIconEl.classList.add("cbt-battery-low");
          batteryInfoEl.title = `⚠️ Baterai Rendah: ${info.percent}%! Segera hubungkan charger.`;
        } else {
          batteryTextEl.classList.remove("cbt-battery-low");
          batteryIconEl.classList.remove("cbt-battery-low");
        }
      } else {
        // Desktop / tidak ada baterai
        batteryIconEl.innerHTML = ICON.plug;
        batteryTextEl.textContent = "AC";
        batteryInfoEl.title = "Daya listrik (tanpa baterai)";
      }
    } catch (err) {
      batteryIconEl.innerHTML = ICON.battery;
      batteryTextEl.textContent = "--";
    }
  }

  // === 6. HELPER ===
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // === 7. KOMPATIBILITAS MODAL KONFIRMASI (SweetAlert) ===
  function isConfirmationModalOpen() {
    // Cek modal keluar kita sendiri
    const exitModal = document.getElementById("cbt-exit-modal");
    if (exitModal && exitModal.classList.contains("open")) return true;

    // SweetAlert v2: class-based detection (class dihapus saat modal ditutup)
    const swal2 = document.querySelector(
      ".swal2-container.swal2-shown, .swal2-container.swal2-backdrop-show",
    );
    if (swal2) {
      const style = window.getComputedStyle(swal2);
      if (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity) > 0
      ) {
        return true;
      }
    }

    // SweetAlert v1: elemen bisa tetap di DOM setelah ditutup (hanya di-hide),
    // jadi HARUS cek visibility agar tidak salah deteksi
    const swalV1Selectors = [".swal-overlay", ".swal-modal", ".sweet-alert"];
    for (const sel of swalV1Selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const style = window.getComputedStyle(el);
        if (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          parseFloat(style.opacity) > 0
        ) {
          return true;
        }
      }
    }

    return false;
  }

  // Gunakan flag + requestAnimationFrame untuk mencegah infinite loop:
  let _syncModalScheduled = false;
  function syncModalState() {
    if (_syncModalScheduled) return;
    _syncModalScheduled = true;
    requestAnimationFrame(() => {
      _syncModalScheduled = false;
      const modalOpen = isConfirmationModalOpen();
      document.body.classList.toggle("cbt-modal-active", modalOpen);
      if (modalOpen) {
        wifiPanel.classList.remove("open");
      }
    });
  }

  const modalObserver = new MutationObserver(syncModalState);
  modalObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  syncModalState();

  // === 8. MODAL KONFIRMASI KELUAR ===

  // Buat elemen modal sekali lalu simpan referensinya
  const exitModal = document.createElement("div");
  exitModal.id = "cbt-exit-modal";
  exitModal.innerHTML = `
    <div class="cbt-exit-modal-card">
      <span class="cbt-exit-modal-icon">⏻</span>
      <h2 class="cbt-exit-modal-title">Keluar Aplikasi?</h2>
      <p class="cbt-exit-modal-msg">Apakah Anda yakin ingin keluar<br>dari aplikasi ujian CBT Teladan?</p>
      <div class="cbt-exit-modal-btns">
        <button id="cbt-exit-cancel-btn" class="cbt-exit-btn-cancel">Batal</button>
        <button id="cbt-exit-confirm-btn" class="cbt-exit-btn-confirm">Ya, Keluar</button>
      </div>
    </div>
  `;
  document.body.appendChild(exitModal);

  const exitCancelBtn = document.getElementById("cbt-exit-cancel-btn");
  const exitConfirmBtn = document.getElementById("cbt-exit-confirm-btn");

  function openExitModal() {
    exitModal.classList.add("open");
    exitConfirmBtn.disabled = false;
    exitConfirmBtn.textContent = "Ya, Keluar";
    exitConfirmBtn.focus();
  }

  function closeExitModal() {
    exitModal.classList.remove("open");
  }

  exitCancelBtn.addEventListener("click", closeExitModal);

  exitModal.addEventListener("click", (e) => {
    if (e.target === exitModal) closeExitModal();
  });

  exitConfirmBtn.addEventListener("click", async () => {
    exitConfirmBtn.disabled = true;
    exitConfirmBtn.textContent = "Keluar...";
    if (window.cbtTaskbar && window.cbtTaskbar.requestExit) {
      await window.cbtTaskbar.requestExit();
    }
  });

  // Fungsi utama: coba Swal dulu, fallback ke modal kustom
  function showExitConfirm() {
    if (typeof Swal !== "undefined" && typeof Swal.fire === "function") {
      Swal.fire({
        title: "Keluar Aplikasi?",
        html: "Apakah Anda yakin ingin keluar<br>dari aplikasi ujian CBT Teladan?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#374151",
        confirmButtonText: "Ya, Keluar",
        cancelButtonText: "Batal",
        reverseButtons: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        focusConfirm: false,
        focusCancel: true,
      }).then((result) => {
        if (
          result.isConfirmed &&
          window.cbtTaskbar &&
          window.cbtTaskbar.requestExit
        ) {
          window.cbtTaskbar.requestExit();
        }
      });
    } else {
      openExitModal();
    }
  }

  // === 8b. TOMBOL REFRESH & KELUAR ===
  const refreshBtn = document.getElementById("cbt-refresh-btn");
  refreshBtn.addEventListener("click", async () => {
    if (window.cbtTaskbar && window.cbtTaskbar.requestRefresh) {
      window.cbtTaskbar.requestRefresh();
    } else {
      window.location.reload();
    }
  });

  const exitBtn = document.getElementById("cbt-exit-btn");
  exitBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showExitConfirm();
  });

  // === 9. MULAI UPDATE PERIODIK ===
  updateWifiInfo();
  updateBatteryInfo();

  // Update WiFi setiap 15 detik
  setInterval(updateWifiInfo, 15000);

  // Update baterai setiap 30 detik
  setInterval(updateBatteryInfo, 30000);

  // === 10. WEBCAM PREVIEW (EFEK PSIKOLOGIS PENGAWASAN) ===
  (async function () {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });

      // Inject CSS webcam preview
      const camStyle = document.createElement("style");
      camStyle.textContent = `
        #cbt-cam-wrap {
          position: fixed !important;
          top: 12px !important;
          left: 12px !important;
          width: 152px !important;
          border-radius: 10px !important;
          overflow: hidden !important;
          background: #000 !important;
          border: 2px solid rgba(239, 68, 68, 0.55) !important;
          box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.12),
                      0 6px 24px rgba(0, 0, 0, 0.6) !important;
          z-index: 2147483643 !important;
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        #cbt-cam-video {
          width: 100% !important;
          display: block !important;
          transform: scaleX(-1) !important;
          aspect-ratio: 4 / 3 !important;
          object-fit: cover !important;
          background: #111 !important;
        }
        #cbt-cam-bar {
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          padding: 5px 8px !important;
          background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%) !important;
          display: flex !important;
          align-items: center !important;
          gap: 5px !important;
        }
        #cbt-cam-dot {
          width: 7px !important;
          height: 7px !important;
          background: #ef4444 !important;
          border-radius: 50% !important;
          flex-shrink: 0 !important;
          animation: cbt-cam-pulse 1.4s ease infinite !important;
        }
        @keyframes cbt-cam-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 5px rgba(239, 68, 68, 0.8); }
          50%       { opacity: 0.3; box-shadow: none; }
        }
        #cbt-cam-label {
          font-size: 10px !important;
          font-weight: 700 !important;
          color: #fff !important;
          letter-spacing: 0.1em !important;
          font-family: 'Segoe UI', sans-serif !important;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9) !important;
        }
      `;
      document.head.appendChild(camStyle);

      // Inject elemen preview
      const wrap = document.createElement("div");
      wrap.id = "cbt-cam-wrap";
      wrap.innerHTML = `
        <video id="cbt-cam-video" autoplay muted playsinline></video>
        <div id="cbt-cam-bar">
          <div id="cbt-cam-dot"></div>
          <span id="cbt-cam-label">LIVE</span>
        </div>
      `;
      document.body.appendChild(wrap);

      document.getElementById("cbt-cam-video").srcObject = stream;
    } catch {
      // Kamera tidak tersedia atau akses ditolak — tidak ditampilkan
    }
  })();

})();
