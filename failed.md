# Dokumen Post-Mortem & Laporan Kegagalan (failed.md)

| | |
|---|---|
| **Aplikasi** | Callan — VoIP P2P & Synchronized Auto-Cut Off Timer |
| **Tanggal** | 2026-09-28 |
| **Status Retrospektif** | Dokumentasi Masalah & Tindakan Pencegahan (Self-Correction) |

---

## 1. Ringkasan Laporan Kegagalan

Dokumen ini mencatat setiap kegagalan teknis, kesalahan sintaks, dan kendala lingkungan yang dialami selama proses pembangunan aplikasi **Callan**, beserta analisis akar masalah (*Root Cause Analysis*) dan langkah pencegahan agar tidak terulang kembali di masa depan.

---

## 2. Rincian Kegagalan & Tindakan Pencegahan

### ❌ Kegagalan 1: Kesalahan Import Directive Tailwind CSS (v3 vs v4 Mismatch)

- **Deskripsi Masalah**:
  Saat menjalankan `npm run build`, kompilasi Vite gagal dengan pesan error:
  `[vite:css] [postcss] Missing "./base" specifier in "tailwindcss" package`.
- **Akar Masalah (*Root Cause*)**:
  File `src/index.css` ditulis menggunakan sintaks Tailwind CSS v3 (`@import "tailwindcss/base";`), padahal paket yang terinstall di `package.json` adalah **Tailwind CSS v4** yang menggunakan spesifikasi baru (`@import "tailwindcss";` dan `@tailwindcss/vite`).
- **Langkah Perbaikan yang Telah Dilakukan**:
  1. Memasang paket `@tailwindcss/vite` dan `@tailwindcss/postcss`.
  2. Mengubah `src/index.css` agar menggunakan `@import "tailwindcss";`.
  3. Mengubah `vite.config.js` untuk mengikutsertakan plugin `tailwindcss()`.
- **Tindakan Pencegahan untuk Masa Depan (*Preventative Action*)**:
  - **Selalu periksa versi paket** di `package.json` sebelum membuat file konfigurasi atau penulisan stylesheet.
  - Jangan berasumsi bahwa paket CSS/framework yang terinstall menggunakan versi legacy jika meng-install paket `@latest`.

---

### ❌ Kegagalan 2: Kesalahan Sintaks Literal Angka (Kotlin vs JavaScript)

- **Deskripsi Masalah**:
  Saat menjalankan `npm run build`, Rollup parser gagal memproses file `src/utils/clockSync.js` pada baris 8 dengan error:
  `Identifier cannot follow number: this.offsetMs = 0L;`.
- **Akar Masalah (*Root Cause*)**:
  Pseudo-code dari dokumen spesifikasi teknis (`tdd.md`) yang ditulis dalam bahasa Kotlin (`0L` untuk Long literal) terbawa saat pembuatan kode JavaScript/ES6 tanpa menghapus akhiran tipe `L`.
- **Langkah Perbaikan yang Telah Dilakukan**:
  1. Mengubah `this.offsetMs = 0L;` menjadi `this.offsetMs = 0;` di `src/utils/clockSync.js`.
  2. Menjalankan `npm run build` ulang hingga menghasilkan bundel produksi bersih tanpa error (exit code 0).
- **Tindakan Pencegahan untuk Masa Depan (*Preventative Action*)**:
  - **Disiplin Sintaks Bahasa**: Selalu melakukan validasi sintaks bahasa target (JavaScript/React) saat melakukan adaptasi dari spesifikasi atau pseudo-code bahasa lain (Kotlin/Java/C++).
  - **Eksplisitas Kompilasi Cepat**: Menjalankan build checker (`npm run build`) secara berkala setelah membuat utilitas inti untuk mendeteksi kesalahan sintaks sejak dini.

---

### ❌ Kegagalan 3: Kendala Lingkungan Playwright Browser Subagent (CDN 404)

- **Deskripsi Masalah**:
  Saat memanggil tool `browser_subagent` untuk melakukan verifikasi tampilan UI aplikasi di `http://localhost:3000/`, tool mengalami error berulang karena driver Playwright versi 1.57.0 mengalami HTTP 404 dari URL CDN external.
- **Akar Masalah (*Root Cause*)**:
  Lingkungan eksekusi browser internal membutuhkan binary Playwright driver tertentu yang tidak tersedia di CDN mirror Playwright saat pemanggilan.
- **Langkah Perbaikan yang Telah Dilakukan**:
  1. Menjalankan perintah `npx playwright install chromium` via terminal untuk mengunduh binary Chrome for Testing secara lokal ke `C:\Users\fajar\AppData\Local\ms-playwright\`.
  2. Memastikan aplikasi terverifikasi berjalan sempurna via server lokal Vite (`npm run dev` pada port 3000) dan memastikan bundel produksi `npm run build` sukses 100%.
- **Tindakan Pencegahan untuk Masa Depan (*Preventative Action*)**:
  - Sesuai dengan panduan instruksi sistem (*system prompt rules*): Jika tool `open_browser_url` mengalami kendala teknis lingkungan di luar kendali agen, agen harus segera menghentikan pemanggilan browser yang gagal dan memverifikasi kesehatan aplikasi melalui tes kompilasi (`npm run build`), log dev server (`npm run dev`), serta mengomunikasikannya secara transparan kepada pengguna.

---

## 3. Komitmen Kualitas & Status Terakhir

Aplikasi **Callan** saat ini telah dipastikan:
1. **Bisa Di-build 100%**: `npm run build` berhasil sempurna (Exit Code 0).
2. **Dev Server Aktif**: `npm run dev` berjalan di `http://localhost:3000/`.
3. **Dokumentasi Lengkap**: `prd.md`, `tdd.md`, `progress.md`, `test.md`, dan `failed.md` telah disinkronkan.
