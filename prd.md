# PRD — Callan (nama kerja)

| | |
|---|---|
| **Versi** | 0.1 (draft) |
| **Tanggal** | 2026-09-28 |
| **Platform** | Android (Kotlin) |
| **Jenis panggilan** | VoIP 1-on-1 (internet), bukan telepon seluler GSM/VoLTE |
| **Dokumen terkait** | `TDD.md`, `progress.md` |

---

## 1. Ringkasan

Callan adalah aplikasi Android untuk telepon suara antar dua orang lewat internet, dengan dua fitur pembeda:

1. **Timer auto-end yang sinkron.** Salah satu dari kedua pihak (A atau B) bisa mengatur panggilan agar berakhir otomatis pada jam tertentu atau setelah durasi tertentu. Timer tampil sama di kedua HP dan panggilan tertutup di kedua sisi pada waktu yang sama.
2. **Noise canceling.** Suara bising di sekitar pembicara (angin, mesin motor, lalu lintas) dibersihkan sebelum audio dikirim, sehingga lawan bicara mendengar suara yang jernih.

> **Keputusan dasar:** Android tidak mengizinkan aplikasi pihak ketiga memproses audio panggilan seluler biasa. Karena noise canceling wajib ada, panggilan harus berjalan lewat internet (VoIP/WebRTC) supaya aplikasi mengontrol audionya. Konsekuensinya: kedua pihak harus memasang aplikasi dan punya koneksi data. Lihat ADR-001 di `TDD.md`.

## 2. Masalah

| # | Masalah | Dampak |
|---|---|---|
| P1 | Telepon sambil naik motor: suara angin, mesin, dan lalu lintas ikut terkirim | Lawan bicara susah mendengar, sering minta mengulang |
| P2 | Telepon yang berlangsung lama sering lupa ditutup (ketiduran, sibuk di jalan) | Baterai dan kuota terbuang; panggilan menggantung |
| P3 | Timer bawaan HP hanya berlaku lokal, tidak ada batas waktu yang disepakati dan tersinkron dua pihak | Dua orang harus saling mengingatkan secara manual |

*Asumsi:* P2 dan P3 diturunkan dari kebutuhan "telepon bisa mati di jam tertentu dan disinkronkan antar HP". Konfirmasi kebutuhan sebenarnya ke calon pengguna di tahap beta.

## 3. Target pengguna

- **Primer:** pengendara motor yang telepon hands-free lewat earphone, headset Bluetooth, atau intercom helm.
- **Sekunder:** pasangan, keluarga, atau teman dekat yang sering telepon lama dan ingin batas waktu bersama.

## 4. Goals dan Non-goals

### Goals (MVP)
- G1. Telepon suara 1-on-1 via internet dengan kualitas jernih.
- G2. Timer auto-end tersinkron; keduanya boleh mengatur.
- G3. Noise canceling yang terasa nyata saat naik motor (uji lapangan).
- G4. Panggilan masuk tetap dering saat HP terkunci atau aplikasi di latar belakang.
- G5. Bisa dipakai tanpa menyentuh layar untuk aksi penting (jawab, tutup, peringatan timer).

### Non-goals (MVP)
- Video call, chat, panggilan grup, kirim file
- Telepon ke nomor seluler biasa (PSTN)
- iOS, Wear OS, web
- Rekam panggilan
- Timer berulang atau jadwal panggilan (Fase 2)

## 5. User stories

| ID | Sebagai... | Saya ingin... | Prioritas |
|---|---|---|---|
| US-01 | Pengguna | Daftar/login dan menambah kontak lewat username, QR, atau tautan undangan | P0 |
| US-02 | Penelepon | Menelepon kontak dengan satu ketukan | P0 |
| US-03 | Penerima | Panggilan masuk berdering walau HP terkunci atau aplikasi ditutup | P0 |
| US-04 | A atau B | Mengatur timer: "30 menit lagi" atau "sampai jam 21:00" | P0 |
| US-05 | A atau B | Melihat timer yang sama di HP masing-masing, dengan selisih < 1 detik | P0 |
| US-06 | A atau B | Mengubah atau membatalkan timer yang dibuat pihak lain | P0 |
| US-07 | A atau B | Diberi peringatan 1 menit sebelum panggilan berakhir, dengan opsi perpanjang | P0 |
| US-08 | A atau B | Panggilan tertutup otomatis di kedua HP saat waktu habis | P0 |
| US-09 | Pengendara | Noise canceling aktif secara default dan bisa dimatikan | P0 |
| US-10 | Pengendara | Menjawab dan menutup panggilan lewat tombol headset atau helm | P0 |
| US-11 | Pengendara | Audio otomatis pindah ke headset/Bluetooth yang tersambung | P0 |
| US-12 | Penelepon | Mengatur timer awal saat panggilan masih berdering | P1 |
| US-13 | Pengguna | Melihat riwayat panggilan (termasuk "diakhiri oleh timer") | P1 |
| US-14 | Pengguna | Auto-jawab dari kontak tepercaya (opt-in) | P2 |

## 6. Functional requirements

| ID | Requirement | Prioritas |
|---|---|---|
| FR-01 | Registrasi/login dengan Google atau email; identitas publik berupa username | P0 |
| FR-02 | Kontak: tambah lewat username, QR, tautan undangan; terima/tolak; blokir | P0 |
| FR-03 | Panggilan keluar dan masuk dengan status: memanggil, berdering, tersambung, berakhir | P0 |
| FR-04 | Notifikasi panggilan masuk full-screen, dengan tombol Jawab dan Tolak | P0 |
| FR-05 | Layar dalam panggilan: timer besar, mute, speaker/Bluetooth, toggle noise canceling, tombol tutup | P0 |
| FR-06 | Timer: set, ubah, batal; sinkron real-time antar kedua HP | P0 |
| FR-07 | Peringatan T-60 detik: getar, bunyi pendek, notifikasi; tombol "+5", "+15", "+30 menit", "Batalkan timer" | P0 |
| FR-08 | Auto-end saat waktu habis; alasan berakhir dicatat | P0 |
| FR-09 | Noise canceling on/off; preferensi tersimpan | P0 |
| FR-10 | Tombol headset: jawab, tutup | P0 |
| FR-11 | Onboarding: izin mikrofon, notifikasi, panduan pengecualian baterai per merek HP | P0 |
| FR-12 | Riwayat panggilan | P1 |
| FR-13 | Pengaturan: bahasa, kualitas NS, suara peringatan | P1 |
| FR-14 | Hapus akun dan data (wajib untuk Google Play) | P0 |

## 7. Aturan bisnis timer

| ID | Aturan |
|---|---|
| BR-01 | Satu panggilan hanya punya satu timer aktif. |
| BR-02 | Timer disimpan sebagai waktu absolut (`end_at`, epoch milidetik menurut server). Bukan hitung mundur lokal. |
| BR-03 | Kedua pihak boleh mengatur, mengubah, dan membatalkan timer. |
| BR-04 | **Konflik:** jika A dan B mengubah hampir bersamaan, perubahan yang lebih dulu diterima server menang. Pihak yang kalah langsung menerima pembaruan dan pemberitahuan ("B mengubah timer ke 21:30"). |
| BR-05 | **Input jam tertentu** memakai zona waktu si pengatur; tampilan di tiap HP mengikuti zona waktu masing-masing. Jika jam sudah lewat hari ini, aplikasi bertanya: "Maksudnya besok pukul 06:00?" |
| BR-06 | Durasi minimum 1 menit, maksimum 12 jam (nilai bisa diubah lewat konfigurasi server). |
| BR-07 | **Peringatan** muncul 60 detik sebelum `end_at` di kedua HP. Jika timer diset dengan sisa < 60 detik, peringatan langsung tampil. |
| BR-08 | Timer yang diubah saat masa peringatan menggantikan yang lama dan mereset peringatan. |
| BR-09 | Saat waktu habis, kedua sisi menutup panggilan dengan alasan `timer`. |
| BR-10 | **Koneksi putus:** timer tetap berjalan berdasar `end_at`. Jika tersambung kembali setelah `end_at`, panggilan langsung berakhir. Jika tidak tersambung kembali dalam 30 detik, panggilan berakhir dengan alasan `network_lost`. |
| BR-11 | Timer hanya berlaku untuk panggilan yang sedang berjalan, tidak untuk panggilan berikutnya. |
| BR-12 | Setiap perubahan timer dicatat (siapa, kapan, nilai lama dan baru). |

## 8. UX untuk berkendara

Prinsip: semua yang penting harus bisa dilakukan **tanpa melihat layar**.

- Tombol besar (minimal 72 dp), kontras tinggi (terbaca di bawah matahari).
- Timer diatur dengan preset (15 / 30 / 60 menit, "sampai jam...") tanpa mengetik.
- Peringatan timer berupa bunyi dan getar, bukan hanya teks.
- Tidak ada input teks selama panggilan aktif.
- Layar boleh mati selama panggilan; panggilan tetap berjalan.
- Onboarding menyarankan: pasang HP di holder dan gunakan headset/helm, jangan mengoperasikan HP saat melaju.

## 9. Non-functional requirements

| Area | Target awal | Cara ukur |
|---|---|---|
| Latensi suara (mulut ke telinga) | p50 ≤ 250 ms, p95 ≤ 400 ms (4G normal) | Statistik WebRTC + uji loopback |
| Tambahan delay noise canceling | ≤ 30 ms | Benchmark pipeline audio |
| Selisih waktu berakhir antar HP | ≤ 1 detik (p95) | Log `ended_at` klien vs server |
| Waktu sambung (tap → dering di lawan) | p95 ≤ 5 detik | Log server |
| Penggunaan data | ≤ 30 MB per jam per panggilan (Opus ≈ 24 kbps, kira-kira 20 MB/jam termasuk overhead) | Network profiler |
| Baterai | ≤ 12% per jam, layar mati, NS aktif (target awal, dikalibrasi setelah benchmark) | Battery Historian / Perfetto |
| Keberhasilan dering panggilan masuk | ≥ 95% berdering ≤ 5 detik (HP idle) | Uji matriks perangkat + telemetri |
| Stabilitas | Crash-free sessions ≥ 99,5% | Crashlytics |
| Kompatibilitas | minSdk 26 (Android 8.0); **targetSdk 36** (wajib Google Play sejak 31 Agustus 2026) | Build config |
| Keamanan | TLS untuk semua API, audio terenkripsi (DTLS-SRTP), token berumur pendek | Review keamanan |
| Aksesibilitas | Label TalkBack, ukuran sentuh besar | Accessibility Scanner |
| Bahasa | Indonesia (utama), Inggris | — |

## 10. Kriteria kualitas audio

Uji dengan rekaman nyata di motor (kecepatan sekitar 30 dan 60 km/jam; HP di saku, holder, dan headset Bluetooth):

- Skor DNSMOS: BAK ≥ 3,5 dan OVRL ≥ 3,0 pada skenario 60 km/jam.
- MOS subjektif ≥ 3,5 dari 5 oleh minimal 10 penilai (uji dengar A/B, dengan dan tanpa NS).
- Awal kata tidak terpotong (tidak ada speech clipping yang mengganggu).

*Angka di atas adalah target awal dan akan dikalibrasi setelah baseline diukur di M3.*

## 11. Metrik keberhasilan

| Metrik | Target beta |
|---|---|
| Call success rate (tersambung / dicoba) | ≥ 95% |
| Akurasi sinkron timer | 95% panggilan berakhir ≤ 1 detik antar HP |
| Panggilan dengan NS aktif | ≥ 80% (indikasi NS tidak dimatikan karena masalah kualitas) |
| Rating kejernihan suara dari penerima | ≥ 4 dari 5 (survei singkat setelah panggilan) |
| Retensi minggu ke-2 (beta 10–20 orang) | ≥ 40% |

## 12. Risiko dan asumsi

| ID | Risiko | Mitigasi |
|---|---|---|
| R1 | Kedua pihak harus memasang aplikasi dan punya data internet | Tautan undangan yang mudah; hemat data (Opus 24 kbps) |
| R2 | HP merek tertentu (Xiaomi, Oppo, Vivo, Realme, Samsung) mematikan aplikasi latar belakang sehingga dering telat atau tidak muncul | Onboarding panduan per merek; FCM prioritas tinggi; uji matriks perangkat |
| R3 | Android membatasi akses mikrofon untuk layanan yang dimulai dari latar belakang, sehingga auto-jawab tanpa sentuhan mungkin terbatas | Spike teknis di M1; fallback: jawab lewat tombol headset atau notifikasi |
| R4 | Suara angin di mikrofon tidak sepenuhnya bisa dihapus lewat software | Kombinasi filter high-pass + model NS; edukasi (windscreen, posisi mikrofon); uji headset |
| R5 | Model NS berbasis ML berat untuk HP kelas bawah | Beberapa tingkat NS dengan fallback otomatis |
| R6 | Kebijakan Google Play (deklarasi foreground service, full-screen intent) | Siapkan deklarasi dan video demo sejak M4 |
| R7 | Biaya server (bandwidth relay/TURN) naik seiring pengguna | Pantau biaya per menit panggilan; lihat estimasi di TDD |
| R8 | Penyalahgunaan (auto-jawab dipakai untuk menguping) | Opt-in, hanya kontak yang di-whitelist, indikator jelas, bunyi saat tersambung |
| R9 | Keselamatan berkendara | Desain hands-free; tidak mendorong interaksi layar saat melaju |

**Asumsi:** hanya Android; identitas berbasis akun/username (bukan nomor telepon) di MVP; pengguna memakai headset/earphone saat berkendara.

## 13. Scope dan fase

| Fase | Isi |
|---|---|
| **MVP (M1–M5)** | Login, kontak, call 1-on-1, timer sinkron, noise canceling, dukungan Bluetooth, beta tertutup |
| **Fase 2** | Login nomor telepon (OTP), riwayat lengkap, timer berulang/jadwal, auto-jawab tepercaya, deteksi angin dan saran ke pengguna |
| **Fase 3** | Panggilan grup, iOS, Wear OS, monetisasi |

## 14. Pertanyaan terbuka

1. Perubahan timer oleh satu pihak: cukup diberi notifikasi (default saat ini) atau perlu persetujuan pihak lain?

cukup diberi notifikasi
2. Identitas pengguna: username/QR saja, atau langsung nomor telepon dengan OTP (ada biaya SMS/WhatsApp OTP)?

username aja gpp
3. Perlu telepon ke nomor seluler biasa (PSTN)? Ini butuh penyedia SIP trunk dan biaya per menit.

gausah ini via internet aja
4. Model bisnis: gratis, iklan, atau langganan?
gaperlu di pikirin ini buat saya pribadi
5. Nama dan branding aplikasi.
gaperlu di pikirin ini buat saya pribadi