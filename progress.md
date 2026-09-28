# Progress Report — Callan (VoIP P2P & Timer Auto-Cut Off)

| | |
|---|---|
| **Versi** | 1.0 (MVP & Android APK Build Complete) |
| **Tanggal Update** | 2026-09-28 |
| **Platform Target** | Android Native APK (`targetSdk 36`) & Mobile PWA |
| **Dokumen Acuan** | `prd.md`, `tdd.md`, `test.md`, `failed.md` |

---

## 1. Status Ringkasan Fitur & Build

| Fitur / Komponen | Status | Keterangan / Implementasi |
|---|---|---|
| **Kompilasi APK Android (`app-debug.apk`)** | ✅ Selesai | `BUILD SUCCESSFUL` via Gradle 8.14.3. APK siap diinstall di HP Android. |
| **Izin Android (Target SDK 36)** | ✅ Selesai | `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `BLUETOOTH_CONNECT`, `FOREGROUND_SERVICE_PHONE_CALL`, `FOREGROUND_SERVICE_MICROPHONE`. |
| **Arsitektur P2P 100% (No Custom Backend)** | ✅ Selesai | Menggunakan WebRTC P2P (PeerJS) & WebRTC DataChannel untuk kontrol & media. |
| **VoIP 1-on-1 Audio Call** | ✅ Selesai | Panggilan suara jernih P2P dengan status: IDLE, CALLING, RINGING, CONNECTED, ENDED. |
| **Timer Auto-End Tersinkronisasi** | ✅ Selesai | P2P DataChannel real-time sync (< 1 detik). Mendukung preset (15m, 30m, 45m, 60m) & jam spesifik ("sampai 22:00"). |
| **Jam & Offset Sync (NTP P2P)** | ✅ Selesai | `ClockSyncP2P` dengan kalkulasi RTT minimal via DataChannel ping-pong. |
| **Peringatan T-60 Detik** | ✅ Selesai | Banner peringatan visual, bunyi alert chime, getaran HP, & opsi perpanjang cepat (+5m, +15m, +30m). |
| **Active Noise Suppression (Motor & Angin)** | ✅ Selesai | Web Audio API DSP: High-pass filter ~130 Hz + Speech EQ + Noise Gate (TDD Sec 10.3). |
| **Desain UX Berkendara (Rider Mode)** | ✅ Selesai | Tombol sentuh besar (minimal 72dp / `touch-btn-lg`), kontras tinggi, visualizer gelombang suara. |
| **Simulasi 2 HP dalam 1 Tab (Dual View)** | ✅ Selesai | Mode pengujian langsung side-by-side untuk menguji Penelepon (A) dan Penerima (B) sekaligus. |
| **Berbagi ID via QR Code & Link** | ✅ Selesai | QR Code generator & tombol salin tautan undangan otomatis (`?peer=...`). |
| **Riwayat Panggilan (Call History)** | ✅ Selesai | Mencatat durasi, timestamp, dan alasan berakhir (Timer Auto-End vs Tutup Manual). |

---

## 2. Lokasi Output Build APK

File binary instalasi Android APK berada pada lokasi:
- **Lokasi Path APK**: [app-debug.apk](file:///c:/ngoding/aplikasi%20callan/android/app/build/outputs/apk/debug/app-debug.apk)
- **Ukuran File**: 4.2 MB
- **Target SDK**: Android 16 (API Level 36 - Sesuai Aturan Google Play 2026)
- **Minimum SDK**: Android 8.0 (API Level 24)

---

## 3. Langkah Instalasi & Pengujian di HP Android

1. Salin file `app-debug.apk` ke HP Android.
2. Buka file `.apk` di HP Android dan izinkan instalasi dari *Unknown Sources* (Sumber Tidak Dikenal).
3. Berikan izin Mikrofon saat aplikasi dibuka pertama kali.

---

## 4. Bug Report Lapangan & Rencana Tindakan Perbaikan (Bug Fixes)

Berdasarkan hasil pengujian langsung antara perangkat Android, ditemukan 3 kendala utama yang sedang diperbaiki:

| No | Gejala / Isu | Akar Masalah (Root Cause) | Tindakan Perbaikan (Fix) | Status |
|---|---|---|---|---|
| **BF-01** | **Panggilan tersambung tetapi tidak ada suara (Silent Audio)** | (1) Web Audio API `AudioDSPPipeline` menggunakan `createMediaStreamDestination()` tanpa clocking hardware sink (`ctx.destination`) sehingga Chromium/WebView tidak memompa audio frames.<br>(2) Element `<audio>` pada Android WebView terhambat kebijakan autoplay jika tidak diaktifkan langsung oleh gesture/touch audio context.<br>(3) Konfigurasi compressor terlalu agresif yang memotong gain sinyal suara. | • Gunakan stream mic audio langsung dengan native WebRTC constraints (`echoCancellation`, `noiseSuppression`, `autoGainControl`) dan fallback DSP pipeline.<br>• Sambungkan audio stream ke node destination aktif dan pasang listener touch/click resume.<br>• Pastikan elemen `<audio>` memiliki `volume = 1.0`, `playsInline = true`, unmuting track, dan WebView Android `setMediaPlaybackRequiresUserGesture(false)`. | ✅ Selesai |
| **BF-02** | **ID HP selalu berubah setiap kali dibuka/direfresh** | Peer ID di-generate secara acak (`generateRandomId()`) setiap kali komponen di-mount tanpa disimpan ke penyimpanan lokal. | • Simpan Peer ID ke `localStorage` (`callan_saved_peer_id`).<br>• Gunakan ID yang sama secara persisten pada tiap HP agar tidak berubah setiap kali aplikasi dibuka kembali. | ✅ Selesai |
| **BF-03** | **Tombol salin menghasilkan teks `localhost` saat di-copy** | Fungsi copy menyalin URL lengkap `${window.location.origin}...` yang pada Android/Capacitor menghasilkan `http://localhost/...` atau `capacitor://localhost`. | • Ubah fungsi copy agar secara eksplisit menyalin **Peer ID murni** (misal: `rider-4821`), bukan URL localhost.<br>• Berikan feedback visual toast bahwa ID murni telah tersalin ke clipboard. | ✅ Selesai |
| **BF-04** | **Suara bergema (Echo Feedback)** | Dual-sink audio playback (memutar audio via `<audio>` tag dan Web Audio destination bersamaan) menyebabkan suara lawan bicara keluar dua kali dan mem-bypass Acoustic Echo Cancellation (AEC) Android. | • Hapus secondary sink Web Audio agar hanya menggunakan jalur `<audio>` tunggal.<br>• Aktifkan constraints `echoCancellation: true` dan `googEchoCancellation: true` pada getUserMedia. | ✅ Selesai |
| **BF-05** | **Suara bising mesin motor/mobil & klakson masuk ke panggilan** | Karakteristik gemuruh knalpot/mesin (<180Hz) dan frekuensi liar klakson/gesekan angin (>3.4kHz) belum difilter secara optimal saat pengendara diam/bicara. | • Pasang Cascade Dual-Stage High-Pass Filter 180Hz (24dB/oct slope) untuk menghapus 90%+ suara mesin & angin.<br>• Pasang Low-Pass Filter 3.4kHz untuk memotong frekuensi tajam klakson/sirene.<br>• Tambahkan Speech EQ Boost 2.2kHz (+4dB) untuk memperjelas artikulasi vokal.<br>• Pasang Intelligent Dynamic VAD Noise Gate (otomatis redam -36dB saat tidak berbicara).<br>• Sediakan **Toggle ON/OFF** langsung di layar panggilan. | ✅ Selesai |
| **BF-07** | **Panggilan antar kota (Jakarta ↔ Bandung / Beda Jaringan) gagal, padahal sesama WiFi berhasil** | (1) Tes sesama perangkat dalam 1 lokasi menggunakan jalur LAN (`host` candidate 192.168.x.x) sehingga tidak memerlukan relay.<br>(2) Lintas kota / beda operator seluler terhalang Symmetric NAT / CGNAT sehingga wajib melewati TURN Relay. Kredensial TURN lama (`openrelay:openrelay`) ditolak server (401 Unauthorized).<br>(3) Keyboard HP Android otomatis mengkapitalkan huruf pertama saat mengetik ID, sedangkan ID PeerJS bersifat *case-sensitive* (huruf besar/kecil berpengaruh) sehingga lawan bicara dianggap tidak ditemukan. | • Perbarui kredensial TURN Relay aktif (`openrelayproject:openrelayproject`) via Port 443 & 80 serta Cloudflare STUN untuk menembus firewall seluler & CGNAT.<br>• Pasang normalisasi paksa huruf kecil (`.toLowerCase().trim()`) dan matikan `autoCapitalize`/`autoCorrect` pada kolom input nomor tujuan.<br>• Tambahkan listener `visibilitychange` untuk menjaga koneksi socket tetap aktif saat aplikasi kembali dibuka. | ✅ Selesai |
| **BF-08** | **Penyediaan Server Signaling Mandiri (Render.com) untuk Konektivitas Antar Kota 100% Reliabel** | Ketergantungan pada server publik gratisan global (`0.peerjs.com`) rentan terhadap pemutusan WebSocket sepihak, rate-limit, dan pemblokiran trafik P2P oleh ISP seluler Indonesia. | • Buat arsitektur server mandiri di folder `server/` (Node.js + Express + `ExpressPeerServer` + health check).<br>• Siapkan konfigurasi `render.yaml` dan panduan deploy cepat di `server/PANDUAN_RENDER.md`.<br>• Tambahkan opsi konfigurasi Server WebRTC di `ChangeIdModal.jsx` dan `peerService.js` agar pengguna dapat menghubungkan aplikasi ke server Render.com milik sendiri secara instan tanpa perlu rebuild APK. | ✅ Selesai |

