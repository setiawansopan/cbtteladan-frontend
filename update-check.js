"use strict";

// Perbandingan versi untuk pemberitahuan pembaruan. Info versi terbaru diambil
// dari server di /app-update; aplikasi hanya memberi tahu dan tidak memasang
// pembaruan sendiri. Sama dengan UpdateCheck.kt di aplikasi Android.

/** "5.0.2" menjadi [5, 0, 2]; akhiran seperti "-rc.1" diabaikan. Tidak valid menjadi null. */
function parse(version) {
  const clean = String(version ?? "").trim().split("-")[0];
  if (!/^\d+(\.\d+){0,3}$/.test(clean)) return null;
  return clean.split(".").map(Number);
}

/** Positif bila a lebih baru dari b; null bila salah satunya tidak valid. */
function compare(a, b) {
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return null;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * "none" = sudah terbaru atau info tidak ada, "available" = ada versi lebih
 * baru, "required" = di bawah versi minimum server (login akan ditolak).
 */
function status(current, latest, minimum) {
  const toMinimum = compare(current, minimum);
  if (toMinimum !== null && toMinimum < 0) return "required";
  const toLatest = compare(latest, current);
  return toLatest !== null && toLatest > 0 ? "available" : "none";
}

/** Link unduhan hanya dibuka bila https, agar link aneh dari server tidak ikut terbuka. */
function isSafeUrl(url) {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.length <= 500 &&
    !/\s/.test(url)
  );
}

module.exports = { parse, compare, status, isSafeUrl };
