"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parse, compare, status, isSafeUrl } = require("../update-check");

test("membaca versi dan mengabaikan akhiran", () => {
  assert.deepEqual(parse("5.0.2"), [5, 0, 2]);
  assert.deepEqual(parse("5.0.2-rc.1"), [5, 0, 2]);
  assert.deepEqual(parse(" 5 "), [5]);
  assert.equal(parse("v5"), null);
  assert.equal(parse(""), null);
  assert.equal(parse(null), null);
});

test("membandingkan angka bukan teks", () => {
  assert.ok(compare("5.0.10", "5.0.9") > 0);
  assert.ok(compare("5.1", "5.0.9") > 0);
  assert.equal(compare("5.0", "5.0.0"), 0);
  assert.ok(compare("4.9.9", "5.0.0") < 0);
  assert.equal(compare("abc", "5.0.0"), null);
});

test("status tersedia, tidak ada, dan wajib", () => {
  assert.equal(status("5.0.1", "5.0.2", "5.0.0"), "available");
  assert.equal(status("5.0.2", "5.0.2", "5.0.0"), "none");
  assert.equal(status("5.0.3", "5.0.2", "5.0.0"), "none");
  assert.equal(status("4.0.1", "5.0.2", "5.0.0"), "required");
});

test("info kosong atau rusak tidak memunculkan pemberitahuan", () => {
  assert.equal(status("5.0.1", null, null), "none");
  assert.equal(status("5.0.1", "rusak", "rusak"), "none");
});

test("hanya link https yang aman", () => {
  assert.ok(isSafeUrl("https://github.com/x/y/releases/latest"));
  assert.ok(!isSafeUrl("http://example.test/a.exe"));
  assert.ok(!isSafeUrl("javascript:alert(1)"));
  assert.ok(!isSafeUrl("https://a.test/ b"));
  assert.ok(!isSafeUrl(null));
});
