// === TANDA TANGAN REQUEST (v5) ===
// Setiap request ke domain ujian diberi header:
//   X-CBT-Timestamp: detik Unix saat request dibuat
//   X-CBT-Signature: HMAC-SHA256(kunci, "<timestamp>.<METHOD>.<path>") dalam hex
// Server CBT Teladan memeriksa tanda tangan ini sehingga penanda
// User-Agent/header saja tidak cukup untuk menyamar sebagai aplikasi.
const crypto = require("crypto");

function signRequest(secret, method, url, now = Date.now()) {
  if (!secret) return null; // build tanpa kunci (mis. pengembangan lokal)

  const timestamp = Math.floor(now / 1000).toString();
  const path = new URL(url).pathname || "/";
  const payload = `${timestamp}.${String(method).toUpperCase()}.${path}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  return { timestamp, signature };
}

module.exports = { signRequest };
