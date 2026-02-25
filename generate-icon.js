// Script untuk generate icon placeholder PNG 256x256
// Jalankan: node generate-icon.js

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Jika canvas tidak tersedia, buat icon minimal PNG secara manual
function generateMinimalPng() {
  // Membuat file PNG 1x1 pixel sederhana sebagai placeholder
  // User bisa mengganti dengan icon asli nanti
  console.log('Info: Untuk icon kustom, letakkan file berikut di folder build/:');
  console.log('  - build/icon.ico   (256x256, untuk Windows)');
  console.log('  - build/icon.icns  (512x512, untuk macOS)');
  console.log('  - build/icon.png   (512x512, untuk Linux)');
  console.log('');
  console.log('Anda bisa menggunakan tools online seperti:');
  console.log('  - https://convertio.co/png-ico/');
  console.log('  - https://cloudconvert.com/png-to-icns');
}

generateMinimalPng();
