# Panduan Instal CBT Teladan (macOS, Windows, Linux)

Dokumen ini dipakai untuk instal aplikasi CBT Teladan di semua sistem operasi yang digunakan murid.

## 0) Pilih installer sesuai sistem operasi

- macOS Apple Silicon (M1/M2/M3): file berakhiran `-arm64.dmg`
- macOS Intel: file berakhiran `-x64.dmg`
- Windows 64-bit: file `Setup` berakhiran `.exe`
- Linux: file berakhiran `.AppImage`

---

## A. macOS

### 1) Instal aplikasi

1. Buka file `.dmg`.
2. Drag **CBT Teladan.app** ke folder **Applications**.
3. Tutup jendela installer.

### 2) Jika muncul peringatan Gatekeeper

> Jangan menonaktifkan Gatekeeper untuk seluruh sistem.

Gunakan salah satu cara berikut:

#### Cara A (disarankan)

1. Buka folder **Applications**.
2. Klik kanan **CBT Teladan.app**.
3. Pilih **Open**.
4. Klik **Open** lagi pada pop-up.

#### Cara B

1. Buka **System Settings**.
2. Masuk ke **Privacy & Security**.
3. Scroll ke bawah, cari notifikasi aplikasi diblokir.
4. Klik **Open Anyway**.

### 3) Jika masih diblokir (opsi Terminal)

Jalankan:

```bash
xattr -dr com.apple.quarantine "/Applications/CBT Teladan.app"
```

---

## B. Windows

### 1) Instal aplikasi

1. Jalankan file installer `.exe`.
2. Ikuti proses instal sampai selesai.
3. Buka aplikasi dari Start Menu/Desktop shortcut.

### 2) Jika muncul SmartScreen "Windows protected your PC"

1. Klik **More info**.
2. Klik **Run anyway**.

### 3) Jika diblokir antivirus/Defender

1. Buka **Windows Security**.
2. Masuk ke **Virus & threat protection**.
3. Di bagian riwayat proteksi, izinkan file installer/app jika terdeteksi false positive.
4. Jalankan ulang aplikasi.

---

## C. Linux

### 1) Persiapan AppImage

1. Simpan file `.AppImage` ke folder yang diinginkan (misalnya `~/Applications`).
2. Buka Terminal di folder tersebut.
3. Jalankan:

```bash
chmod +x CBT-Teladan-*.AppImage
```

### 2) Menjalankan aplikasi

Jalankan:

```bash
./CBT-Teladan-*.AppImage
```

### 3) Jika aplikasi tidak bisa berjalan

- Pastikan `glibc` distro tidak terlalu lama.
- Coba jalankan dari terminal untuk melihat pesan error.
- Jika muncul masalah sandbox di distro tertentu, jalankan sementara:

```bash
./CBT-Teladan-*.AppImage --no-sandbox
```

> Gunakan `--no-sandbox` hanya bila diperlukan untuk troubleshooting.

---

## D. Troubleshooting cepat (semua OS)

Jika masih gagal, kirim ke admin/guru:

- Sistem operasi + versinya
- Tipe perangkat (Intel/Apple Silicon untuk Mac)
- Screenshot pesan error
- Langkah yang sudah dicoba

## E. Catatan keamanan

- Jangan matikan proteksi keamanan sistem secara global.
- Izinkan aplikasi ini secara spesifik (per aplikasi), bukan semua aplikasi.
