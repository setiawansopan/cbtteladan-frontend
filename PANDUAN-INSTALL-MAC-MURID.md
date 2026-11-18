# Panduan Instal CBT Teladan di Mac (Untuk Murid)

Dokumen ini membantu instal aplikasi CBT Teladan di macOS jika muncul peringatan keamanan dari Gatekeeper.

Untuk panduan lengkap semua sistem operasi (macOS, Windows, Linux), lihat:
`PANDUAN-INSTALL-SEMUA-OS-MURID.md`

## 1) Pilih file installer yang sesuai

- Untuk Mac Apple Silicon (M1/M2/M3): `CBT-Teladan-5.0.0-arm64.dmg`
- Untuk Mac Intel: `CBT-Teladan-5.0.0-x64.dmg`

Tidak tahu Mac kamu yang mana? Klik logo Apple di pojok kiri atas, pilih
**Tentang Mac Ini** (About This Mac). Jika tertulis **Chip: Apple M...**, pakai
file `-arm64`. Jika tertulis **Prosesor: Intel**, pakai file `-x64`.

## 2) Instal aplikasi

1. Buka file `.dmg`.
2. Drag **CBT Teladan.app** ke folder **Applications**.
3. Tutup jendela installer.

## 3) Jika muncul pesan “tidak bisa dibuka”

> Jangan menonaktifkan Gatekeeper untuk seluruh sistem.

Lakukan salah satu cara berikut:

### Cara A (paling mudah)

1. Buka folder **Applications**.
2. Klik kanan **CBT Teladan.app**.
3. Pilih **Open**.
4. Klik **Open** lagi pada pop-up.

### Cara B (kalau masih diblokir)

1. Buka **System Settings**.
2. Masuk ke **Privacy & Security**.
3. Scroll ke bawah, cari pesan bahwa aplikasi diblokir.
4. Klik **Open Anyway**.
5. Masukkan password Mac jika diminta.

## 4) Jika tetap gagal (opsi Terminal)

Buka aplikasi **Terminal**, lalu jalankan:

```bash
xattr -dr com.apple.quarantine "/Applications/CBT Teladan.app"
```

Setelah itu, coba buka lagi aplikasi dari folder **Applications**.

## 5) Catatan penting

- Langkah izin ini biasanya cukup dilakukan **sekali** di tiap Mac.
- Setelah berhasil dibuka sekali, berikutnya aplikasi biasanya berjalan normal.
- Jangan jalankan perintah nonaktifkan Gatekeeper global seperti:

```bash
sudo spctl --master-disable
```

Perintah tersebut menurunkan keamanan seluruh Mac.

## 6) Bantuan cepat (format kirim ke admin/guru)

Jika masih gagal, kirim informasi ini:

- Tipe Mac: Apple Silicon / Intel
- Versi macOS
- Pesan error yang muncul (foto/screenshot)
- Sudah coba Cara A/B atau belum
