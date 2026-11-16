# Changelog — CBT Teladan

## v5.0.0

### ✨ Features

- **Tanda tangan request untuk wajib aplikasi**
  - Setiap request ke domain ujian membawa header `X-CBT-Timestamp` dan `X-CBT-Signature` (HMAC-SHA256 atas `timestamp.METHOD.path`).
  - Kunci diambil saat build dari GitHub Secret `CBT_APP_SECRET` (`scripts/write-secret.js`), tidak disimpan di repo.
  - Build rilis (tag `v*`) gagal bila kunci belum diisi, agar tidak ada rilis yang ditolak server.
  - Server CBT Teladan memakai ini untuk membedakan aplikasi resmi dari browser yang memalsukan User-Agent.

### 🐛 Bug Fixes

- **Versi tidak konsisten**: User-Agent menulis `cbt-teladan/4.0.1` sementara header `X-CBT-Version` masih `4.0`. Versi kini diambil dari `package.json` (`app.getVersion()`), sehingga User-Agent dan header selalu sama.

### ⚠️ Penting

- Server CBT Teladan dapat mewajibkan versi minimum **5.0.0** untuk siswa. Aplikasi versi 4.x ke bawah akan ditolak saat mode Wajib aktif; siswa perlu memasang versi ini.

---

## v2.2.0 — 7 Maret 2026

### 🐛 Bug Fixes

- **Tombol Refresh & Keluar di taskbar tidak berfungsi**
  - Penyebab: Elemen SweetAlert dari website ujian tetap ada di DOM setelah ditutup (hanya di-hide), sehingga kelas `cbt-modal-active` menempel permanen dan menonaktifkan seluruh taskbar (`pointer-events: none`).
  - Perbaikan: Fungsi `isConfirmationModalOpen()` sekarang mengecek **visibility** elemen (`display`, `visibility`, `opacity`) — bukan hanya keberadaan di DOM.
  - Perbaikan: Menghapus `pointer-events: none` yang terlalu agresif pada taskbar saat modal aktif. Diganti dengan penurunan `z-index` saja, karena backdrop SweetAlert sudah cukup mencegah interaksi.

- **Shortcut rahasia Ctrl+C → Ctrl+B tidak berfungsi**
  - Penyebab: Saat user melepas tombol Ctrl antara menekan C dan B, event `keyDown` untuk key `Control` itu sendiri terdeteksi sebagai "tombol lain" dan me-reset exit sequence ke 0.
  - Perbaikan: Modifier keys (`Control`, `Shift`, `Alt`, `Meta`) tidak lagi me-reset exit sequence.

### ✨ Enhancements

- **Tombol F5 diaktifkan sebagai refresh cadangan**
  - Sebelumnya F5 diblokir sepenuhnya. Sekarang menekan F5 akan me-reload halaman ujian, sebagai cadangan jika tombol Refresh di taskbar mengalami masalah (misalnya saat soal direvisi dan perlu dimuat ulang).

---

## v2.1.0 — 6 Maret 2026

### 🐛 Bug Fixes

- **Gambar soal tidak tampil**
  - Custom HTTP header (`X-CBT-Client`, `X-CBT-Version`) dikirim ke semua request termasuk ke CDN/domain eksternal, menyebabkan CORS error pada resource gambar.
  - Header kustom sekarang hanya disisipkan untuk request ke domain ujian (`cbtteladan.online`).

---

## v2.0.0 — 5 Maret 2026

### ✨ Features

- Mode kiosk & always-on-top untuk penguncian layar ujian
- Blokir keyboard shortcut berbahaya (Alt+Tab, Alt+F4, Win key, dll)
- Proteksi dual monitor — layar sekunder diblokir dengan overlay hitam
- Shortcut rahasia Ctrl+C → Ctrl+B untuk keluar (khusus pengawas)
- Custom taskbar dengan info WiFi, baterai, jam, tombol refresh & keluar
- Manajemen WiFi langsung dari taskbar (scan, connect)
- Blokir DevTools, klik kanan, copy-paste, print screen
- Modal konfirmasi keluar dengan SweetAlert (fallback ke modal kustom)
- Penanda identifikasi Electron client via User-Agent dan HTTP header
- Periodic focus enforcer (setiap 300ms)
