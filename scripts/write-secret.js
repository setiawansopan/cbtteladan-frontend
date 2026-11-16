// Menulis app-secret.js dari variabel lingkungan CBT_APP_SECRET saat build.
// Kunci TIDAK disimpan di repo: di GitHub Actions diambil dari secret
// repository CBT_APP_SECRET. Tanpa kunci, aplikasi tetap jalan tetapi tidak
// mengirim tanda tangan (hanya untuk pengembangan).
const fs = require("fs");
const path = require("path");

const secret = process.env.CBT_APP_SECRET || "";

// Build rilis (tag v*) wajib punya kunci agar aplikasi tidak ditolak server.
if (!secret && process.env.CBT_REQUIRE_SECRET === "1") {
  console.error("CBT_APP_SECRET belum diisi di GitHub Secrets. Build rilis dihentikan.");
  process.exit(1);
}
const target = path.join(__dirname, "..", "app-secret.js");

fs.writeFileSync(
  target,
  `// Dibuat otomatis oleh scripts/write-secret.js — jangan di-commit.\nmodule.exports = ${JSON.stringify(secret)};\n`,
);

console.log(secret ? "app-secret.js ditulis (kunci tersedia)." : "PERINGATAN: CBT_APP_SECRET kosong, aplikasi tidak akan mengirim tanda tangan.");
