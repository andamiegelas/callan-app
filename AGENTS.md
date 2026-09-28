# AGENTS.md — Dokumentasi & Panduan Agent Aplikasi Callan

| | |
|---|---|
| **Aplikasi** | Callan — VoIP P2P & Timer Auto-Cut Off |
| **Versi Dokumen** | 1.0 (MVP Complete) |
| **Tanggal Update** | 2026-09-28 |
| **Target Platform** | Android Native APK (`targetSdk 36`) & Mobile PWA |
| **Dokumen Sumber** | `prd.md`, `tdd.md`, `test.md`, `progress.md` |

---

## 1. Ringkasan Eksekutif & Visi Proyek

**Callan** adalah aplikasi telepon suara (VoIP 1-on-1) berbasis internet yang dirancang khusus untuk **pengendara motor (riders)** dan pengguna yang membutuhkan pembatasan waktu telepon yang tersinkronisasi.

### Fitur Pembeda Utama:
1. **Timer Auto-End Real-Time & Tersinkronisasi**: Salah satu atau kedua pihak dapat mengatur waktu berakhirnya panggilan (misal: "15 menit lagi" atau "sampai jam 22:00"). Timer tersinkronisasi secara P2P dengan presisi tinggi (selisih < 1 detik) menggunakan kalibrasi jam NTP P2P RTT.
2. **Active Noise Suppression (DSP Audio Engine)**: Filter audio berbasis Web Audio API (High-Pass Filter ~130 Hz + Speech EQ Gain Boost + Noise Gate) untuk meredam gemuruh angin, suara mesin motor, dan lalu lintas jalanan.
3. **Desain UX Berkendara (Rider Mode)**: Antarmuka kontras tinggi, tombol sentuh berukuran ekstra besar (minimal 72dp / `touch-btn-lg`), dukungan tombol headset/intercom helm hands-free, serta visualizer gelombang suara real-time.

---

## 2. Arsitektur Sistem & Stack Teknologi

| Lapisan | Teknologi | Deskripsi / Peran |
|---|---|---|
| **Frontend Framework** | React 18 + Vite | UI Komponen berbasis web modern, cepat, dan responsif. |
| **Styling & UX** | Tailwind CSS v3 | Utility-first CSS untuk styling komponen Rider Mode (72dp+ targets). |
| **Mobile Runtime** | Capacitor 7 | Wrapper aplikasi web menjadi APK Native Android. |
| **VoIP & Signaling** | WebRTC + PeerJS | Arsitektur 100% P2P tanpa custom backend server untuk media & kontrol. |
| **Audio Processing** | Web Audio API | DSP pipeline untuk noise suppression, equalizer vokal, & mute. |
| **Sound Synthesizer** | Web Audio Oscillator | Generator nada dering, chime sambungan, & alert peringatan T-60s. |
| **Android Target SDK** | Android 16 (API 36) | Memenuhi standar wajib Google Play 2026 (`minSdk 24` / Android 8.0+). |

---

## 3. Peta Direktori & Struktur Kode Utama

```
aplikasi callan/
├── android/                        # Projects Capacitor Android Native
│   └── app/build/outputs/apk/debug/app-debug.apk # Output Build Binary APK (4.2 MB)
├── src/
│   ├── components/                 # Komponen UI React
│   │   ├── AudioWaveform.jsx       # Visualizer gelombang suara real-time Canvas API
│   │   ├── CallControls.jsx        # Tombol utama (Mute, Speaker, NS Toggle, End Call)
│   │   ├── CallHistory.jsx         # Panel riwayat panggilan dan durasi
│   │   ├── Header.jsx              # Header aplikasi & status koneksi
│   │   ├── OnboardingModal.jsx     # Panduan izin mikrofon & tips pengendara
│   │   ├── SinglePhoneView.jsx     # Tampilan antarmuka telepon tunggal (HP Mode)
│   │   ├── TimerControlModal.jsx   # Modal pengaturan timer (Preset & Jam Spesifik)
│   │   └── TimerWarningBanner.jsx  # Banner peringatan visual T-60 detik (+Opsi Perpanjang)
│   ├── services/
│   │   └── peerService.js          # Pengelola WebRTC P2P PeerJS & DataChannel Protocol
│   ├── utils/
│   │   ├── audioDSP.js             # DSP Noise Suppression & Sound Synthesizer Engine
│   │   └── clockSync.js            # Algoritma Kalibrasi Jam NTP P2P RTT
│   ├── App.jsx                     # Utama Application State & Dual-View Simulator
│   ├── index.css                   # Custom CSS (Style 72dp touch target & Rider theme)
│   └── main.jsx                    # Entry point React
├── prd.md                          # Product Requirement Document
├── tdd.md                          # Technical Design Document
├── test.md                         # Rencana & Dokumen Pengujian (Test Suite)
├── progress.md                     # Laporan Progres & Status Build APK
└── agents.md / AGENTS.md           # Ringkasan & Panduan Agent AI (Dokumen ini)
```

---

## 4. Rangkuman Aturan Bisnis & Protokol Inti

### 4.1 Sinkronisasi Jam & Timer (`ClockSyncP2P` & `TimerManager`)
- **BR-01**: Hanya ada 1 timer aktif per panggilan.
- **BR-02**: Timer disimpan sebagai waktu absolut epoch milidetik (`endAtMs`). Tidak mengandalkan hitung mundur lokal HP.
- **BR-03**: Kedua pihak (A atau B) dapat mengatur, menambah (+5m, +15m, +30m), atau membatalkan timer.
- **BR-04**: Jika terjadi konflik perubahan bersamaan, versi tertinggi (`version`) yang diterima akan memenangkan state.
- **BR-05**: Input jam tertentu (misal: "06:00" saat pukul 23:00) secara otomatis dikonversi ke waktu besok hari.
- **BR-07**: Peringatan T-60s memicu banner visual, getaran HP, dan nada peringatan 880Hz pada sisa waktu ≤ 60 detik.
- **BR-09**: Ketika timer mencapai 00:00, panggilan otomatis terputus di kedua sisi dengan alasan `timer`.

### 4.2 Pipeline Audio DSP (`AudioDSPPipeline`)
- **High-Pass Filter**: Memotong frekuensi di bawah 130 Hz untuk menghilangkan gemuruh angin & deru mesin.
- **Speech EQ Boost**: Menambah penguatan gain +3.5 dB pada pita frekuensi 2.5 kHz (vokal manusia).
- **Noise Gate**: Meredam sinyal audio di bawah threshold desibel tertentu saat pengguna tidak berbicara.
- **Live Bypass**: Toggle NS On/Off bekerja secara instan tanpa mengganggu aliran stream WebRTC.

---

## 5. Ringkasan Status Pengujian (Test Suite Status)

Semua unit pengujian dan E2E skenario telah dikonfigurasi dan diverifikasi dengan status **LULUS (PASS)**:

| Modul / Kelompok Test | Deskripsi Pengujian | Status |
|---|---|---|
| **`ClockSyncP2P`** | UT-CS-01 s/d UT-CS-03: Kalkulasi Offset RTT, Seleksi RTT Minimum, Monotonic Fallback. | ✅ Pass |
| **`AudioDSPPipeline`** | UT-DSP-01 s/d UT-DSP-04: Cutoff 130Hz, Boost Speech 2.5kHz, Toggle NS Live, Mute Node. | ✅ Pass |
| **`AudioToneGenerator`** | UT-SND-01 s/d UT-SND-04: Ringtone Dual-Tone (440+480Hz), Alert T-60s (880Hz), Chimes. | ✅ Pass |
| **Logika Timer & BR** | UT-TMR-01 s/d UT-TMR-05: Preset 15m, Clock Today/Tomorrow (BR-05), Perpanjang, Konflik (BR-04). | ✅ Pass |
| **Integration & E2E** | E2E-01 s/d E2E-04: Call Flow P2P, Auto-Hangup Sync, Motor Noise Live Test, Rider Touch 72dp. | ✅ Pass |

---

## 6. Panduan Pengembang & Instruksi Operasional Agent

### 6.1 Jalankan Aplikasi Secara Lokal (Development)
```bash
# Install dependencies jika belum
npm install

# Jalankan dev server Vite
npm run dev
```

### 6.2 Build & Sinkronisasi Android APK
```bash
# 1. Build bundle web dist
npm run build

# 2. Sinkronkan assets ke folder native Android
npx cap sync android

# 3. Compile APK Native Debug via Gradle wrapper (Windows PowerShell)
cd android
.\gradlew assembleDebug
```
*Hasil file APK terdapat di: `android/app/build/outputs/apk/debug/app-debug.apk`.*

### 6.3 Aturan & Best Practices untuk AI Agent yang Memodifikasi Repositori Ini:
1. **Preservasi Target SDK 36**: Jangan mengubah `targetSdkVersion 36` di `android/app/build.gradle` karena ini merupakan standar Google Play 2026.
2. **Izin Android Foreground Service**: Bila menambahkan fitur audio/panggilan native baru, pastikan deklarasi izin `FOREGROUND_SERVICE_PHONE_CALL` & `FOREGROUND_SERVICE_MICROPHONE` tetap terjaga di `AndroidManifest.xml`.
3. **P2P Message Schema Integrity**: Saat mengubah `peerService.js`, selalu jaga format payload JSON DataChannel (misal: `TIMER_SET`, `TIMER_CANCEL`, `TIME_PING`, `TIME_PONG`) agar kompatibel antara kedua peer.
4. **Ukuran Target Sentuh UI**: Semua tombol interaktif utama pada mode berkendara wajib menggunakan class `touch-btn-lg` (minimal 72px x 72px / 72dp) sesuai spesifikasi UX PRD Section 8.
