// Hook electron-builder "afterPack": tanda tangan ad-hoc untuk build macOS.
//
// Tanpa tanda tangan, macOS Apple Silicon menolak aplikasi hasil unduhan
// Safari dengan pesan '"CBT Teladan" is damaged and can't be opened' karena
// electron-builder mengubah isi paket Electron sehingga tanda tangan bawaan
// Electron tidak valid lagi. Tanda tangan ad-hoc ("-") gratis dan membuat
// paket konsisten. Pembukaan pertama tetap lewat klik kanan > Open (Gatekeeper
// meminta konfirmasi untuk aplikasi tanpa Developer ID).
const { execFileSync } = require("child_process");
const path = require("path");

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  console.log(`  • ad-hoc signing  app=${appPath}`);
  execFileSync(
    "codesign",
    ["--force", "--deep", "--sign", "-", "--timestamp=none", appPath],
    { stdio: "inherit" },
  );
  execFileSync("codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath], {
    stdio: "inherit",
  });
};
