const crypto = require("crypto");

// Tanda tangan request aplikasi CBT Teladan (v5+):
//   X-CBT-Timestamp: detik sejak epoch
//   X-CBT-Signature: HMAC-SHA256(kunci, "<timestamp>") dalam hex
// Sama persis dengan aplikasi Android dan pemeriksaan di server
// (StudentAccessPolicy::hasValidSignature). Tidak mengikat method/path karena
// WebView Android tidak bisa menandatangani ulang request yang di-redirect.
// Vektor uji: kunci "rahasia-uji", timestamp 1763290000 ->
// 9c1344be7afacfec0610dc3fb68daa5e7917129e124f27a2743132f0088caa57
function signRequest(secret, now = Date.now()) {
  if (!secret) return null;

  const timestamp = Math.floor(now / 1000).toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(timestamp)
    .digest("hex");

  return { timestamp, signature };
}

module.exports = { signRequest };
