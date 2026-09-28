# TDD — Technical Design Document: Callan (nama kerja)

| | |
|---|---|
| **Versi** | 0.1 (draft) |
| **Tanggal** | 2026-09-28 |
| **Dokumen terkait** | `PRD.md`, `progress.md` |
| **Catatan** | "TDD" di sini = Technical Design Document. Pendekatan Test-Driven Development untuk logika inti ada di bagian 13.2. |

Item yang ditandai **[VERIFIKASI]** bergantung pada kebijakan atau API yang sering berubah. Cek ke dokumentasi resmi versi terbaru sebelum diimplementasi.

---

## 1. Tujuan teknis

Membangun aplikasi Android untuk telepon suara 1-on-1 lewat internet, dengan:

1. Timer auto-end yang tersinkron antar dua HP (selisih ≤ 1 detik).
2. Noise suppression real-time di sisi pengirim (delay tambahan ≤ 30 ms).
3. Dering panggilan masuk yang andal walau HP terkunci atau aplikasi di latar belakang.

## 2. Keputusan arsitektur (ADR)

### ADR-001 — VoIP (WebRTC), bukan telepon seluler biasa
- **Konteks:** Android tidak memberi aplikasi pihak ketiga akses untuk memproses audio panggilan GSM/VoLTE. Aplikasi hanya bisa menjadi dialer default (tanpa akses audio untuk NS).
- **Keputusan:** Semua panggilan berjalan lewat internet; audio dikontrol aplikasi.
- **Konsekuensi:** Kedua pihak wajib memakai aplikasi dan butuh data. Timer dan NS menjadi mudah dan konsisten.

### ADR-002 — Media lewat LiveKit, signaling dan state timer di backend sendiri
- **Konteks:** WebRTC mentah butuh signaling, STUN/TURN, dan penanganan ICE/reconnect.
- **Keputusan:** Media (audio Opus, TURN, reconnect) memakai LiveKit (self-host atau Cloud). Backend sendiri mengurus auth, kontak, sesi panggilan, dan **otoritas timer**.
- **Alasan:** SDK Android LiveKit menyediakan hook pemrosesan audio capture (`AudioProcessorOptions.capturePostProcessor`) yang bisa di-bypass saat runtime, cocok untuk memasang noise suppression sendiri.
- **Alternatif:** WebRTC mentah + coturn: kontrol penuh dan bisa P2P (biaya relay lebih rendah), tetapi kerja lebih banyak.
- **Konsekuensi:** Traffic melewati server (SFU). Estimasi kasar ±150–200 kbps per panggilan aktif di sisi server (2 arus masuk + 2 arus keluar). Pantau biaya.

### ADR-003 — Server sebagai otoritas waktu
- **Keputusan:** Timer disimpan sebagai `end_at` (epoch ms menurut server). Klien memakai offset waktu server + jam monotonik, bukan jam dinding HP.
- **Alasan:** Jam HP bisa salah atau diubah pengguna; hitung mundur lokal akan melenceng antar HP.

### ADR-004 — Noise suppression on-device di sisi pengirim
- **Keputusan:** Pipeline default RNNoise; model yang lebih berat (DeepFilterNet) sebagai opsi untuk HP yang kuat. Pilihan final ditentukan dari benchmark di M3.
- **Alasan:** Membersihkan di pengirim menghemat bandwidth dan membuat audio yang dikirim sudah bersih.

### ADR-005 — Codec dan parameter audio
Opus mono, 24 kbps (dapat turun ke 16 kbps saat jaringan buruk), in-band FEC aktif, DTX aktif setelah NS (validasi bahwa awal kata tidak terpotong).

### ADR-006 — Identitas
Login Google/email + JWT berumur pendek dan refresh token. Kontak lewat username, QR, atau tautan undangan. Login nomor telepon (OTP) ditunda ke Fase 2 karena biaya dan kompleksitas.

### ADR-007 — Stack
| Lapisan | Pilihan |
|---|---|
| Android | Kotlin, Jetpack Compose, Hilt, Coroutines/Flow, Room, DataStore, kotlinx.serialization |
| Panggilan | LiveKit Android SDK; `androidx.core-telecom` untuk self-managed call **[VERIFIKASI]** |
| Audio native | RNNoise (C via NDK/JNI); DeepFilterNet via ONNX Runtime/TFLite (opsional) |
| Push | Firebase Cloud Messaging (data message prioritas tinggi) |
| Backend | Kotlin + Ktor (bisa diganti Node/TypeScript), PostgreSQL, Redis, Docker |
| Observability | Firebase Crashlytics, log terstruktur, Prometheus/Grafana atau layanan managed |
| Build | Gradle, GitHub Actions; **compileSdk/targetSdk 36**, minSdk 26 |

## 3. Arsitektur

```
┌──────────────┐  HTTPS / WSS   ┌────────────────────────┐    ┌────────────┐
│  Android A   │◄──────────────►│  Backend (Ktor)        │◄──►│ PostgreSQL │
│              │                │  - Auth, kontak        │    └────────────┘
│  Compose UI  │                │  - Sesi panggilan      │    ┌────────────┐
│  CallService │                │  - Otoritas timer      │◄──►│   Redis    │
│  Timer/Sync  │                │  - Kirim FCM           │    └────────────┘
│  NS pipeline │                │  - Token LiveKit       │
└──────┬───────┘                └───────────┬────────────┘
       │ WebRTC (Opus, SRTP)                │ RoomService (tutup room)
       ▼                                    ▼
┌────────────────────────────────────────────────────┐
│  LiveKit server (SFU + TURN)                       │
└───────────────────────▲────────────────────────────┘
                        │ WebRTC
┌──────────────┐        │              FCM push ──► Android B
│  Android B   │◄───────┘
└──────────────┘
```

Dua jalur terpisah:
- **Jalur kontrol** (WebSocket ke backend): signaling panggilan dan sinkronisasi timer.
- **Jalur media** (WebRTC ke LiveKit): audio saja.

## 4. Alur utama

### 4.1 Panggilan keluar
1. A tekan Call → `POST /calls` (atau WS `call.invite`) → server membuat `call_session` (state `CALLING`) dan room LiveKit.
2. Server mengirim FCM prioritas tinggi ke perangkat B, dan `call.incoming` via WS jika B online.
3. A menerima token LiveKit dan bergabung ke room (menunggu).
4. B menjawab → server mengirim `call.accepted` + token → B bergabung → state `ACTIVE`.

### 4.2 Panggilan masuk (B)
1. FCM tiba → `FirebaseMessagingService` memulai foreground service (`phoneCall`) dan menampilkan notifikasi full-screen bergaya panggilan.
2. B menjawab (layar, tombol notifikasi, atau tombol headset) → layanan dinaikkan ke `phoneCall|microphone` → bergabung ke room.
3. B menolak → `call.decline` → state `ENDED (declined)`.

### 4.3 Set timer
1. A memilih preset → klien mengirim `timer.set` dengan `base_version` terakhir yang dikenal.
2. Server memvalidasi (peserta sah, state `ACTIVE`, batas durasi, versi cocok), menghitung `end_at`, menyimpan, menambah `version`.
3. Server menyiarkan `timer.updated` ke A dan B. Kedua klien memasang penjadwal lokal dari `end_at`.
4. Bila `base_version` tidak cocok → server membalas `timer.conflict` berisi state terbaru.

### 4.4 Auto-end
1. Klien: pada `end_at` menutup room LiveKit, mengirim `call.end{reason:"timer"}` (idempoten), menghentikan foreground service.
2. Server (fallback): pada `end_at + 2 dtk`, jika sesi masih `ACTIVE`, menandai `ENDED(timer)`, mengirim `call.ended`, dan menghapus room di LiveKit.
3. Kedua mekanisme aman dijalankan bersamaan karena `call.end` idempoten.

### 4.5 Koneksi putus
Klien masuk `RECONNECTING` (LiveKit mencoba sambung ulang). Timer terus berjalan dari `end_at`. Bila 30 detik gagal → `ENDED(network_lost)`. Setelah tersambung kembali, klien meminta state terbaru (`timer.updated`) dan menyinkronkan ulang offset waktu.

## 5. Modul Android

```
app/
├─ core/        di, network, dispatchers, Clock (abstraksi untuk test)
├─ auth/        login, token store
├─ contacts/    kontak, undangan, QR
├─ signaling/   WsClient, pesan (serialization), reconnect
├─ call/        CallManager, CallStateMachine, TelecomAdapter, CallService (FGS)
├─ audio/       AudioRouter (speaker/BT), NoiseSuppressor (RNNoise/DFN), AudioProcessor
├─ timer/       ClockSync, TimerManager, TimerRepository
├─ push/        FcmService, IncomingCallNotifier
└─ ui/          Home, Contacts, InCall, Settings, Onboarding
```

| Modul | Tanggung jawab |
|---|---|
| `CallManager` | Satu-satunya pemilik state panggilan; menghubungkan Telecom, LiveKit, signaling |
| `CallService` | Foreground service; menjaga proses tetap hidup selama panggilan |
| `ClockSync` | Estimasi offset waktu server |
| `TimerManager` | Menjadwalkan peringatan dan auto-end dari `end_at`; menerapkan versi |
| `NoiseSuppressor` | Membungkus engine NS, bypass runtime, fallback |
| `AudioRouter` | Memilih perangkat audio (earpiece, speaker, Bluetooth) |

## 6. State machine panggilan

| State | Masuk dari | Keluar ke | Pemicu |
|---|---|---|---|
| `IDLE` | — | `CALLING` | pengguna menelepon |
| `CALLING` | `IDLE` | `RINGING`, `ENDED` | penerima terjangkau / gagal |
| `RINGING` | `CALLING` | `CONNECTING`, `ENDED` | dijawab / ditolak / tak dijawab (45 dtk) / dibatalkan |
| `CONNECTING` | `RINGING` | `ACTIVE`, `ENDED` | media tersambung / gagal |
| `ACTIVE` | `CONNECTING`, `RECONNECTING` | `RECONNECTING`, `ENDING` | jaringan putus / tutup |
| `RECONNECTING` | `ACTIVE` | `ACTIVE`, `ENDED` | sambung ulang / lewat 30 dtk |
| `ENDING` | `ACTIVE` | `ENDED` | pembersihan sumber daya |
| `ENDED` | apa saja | `IDLE` | alasan: `hangup`, `timer`, `declined`, `missed`, `busy`, `network_lost`, `error` |

Timer hidup di dalam `ACTIVE`/`RECONNECTING` dengan sub-state: `NONE → SCHEDULED → WARNING → EXPIRED`.

## 7. Timer dan sinkronisasi (inti sistem)

### 7.1 Model data timer
```
end_at_ms: Long?      // epoch ms menurut server; null = tidak ada timer
version: Long         // naik setiap perubahan
updated_by: UserId
```

### 7.2 Sinkronisasi jam (mirip NTP)
- Klien mengirim `time.ping{t0}`; server membalas `time.pong{t0, server_ms}`; klien mencatat `t3` saat balasan tiba. `t0` dan `t3` memakai `SystemClock.elapsedRealtime()` (monotonik).
- `offset = server_ms − (t0 + t3) / 2`.
- Ambil **5 sampel**, pakai sampel dengan **RTT terkecil**. Ulangi tiap 60 detik dan setiap reconnect.
- `serverNow() = elapsedRealtime() + offset`. Perubahan jam/zona waktu HP tidak berpengaruh.

```kotlin
class ClockSync(private val monotonicMs: () -> Long) {
    @Volatile private var offsetMs = 0L      // serverEpochMs - monotonicMs
    private var bestRttMs = Long.MAX_VALUE

    fun addSample(t0: Long, serverMs: Long, t3: Long) {
        val rtt = t3 - t0
        if (rtt < bestRttMs) {
            bestRttMs = rtt
            offsetMs = serverMs - (t0 + t3) / 2
        }
    }
    fun startNewRound() { bestRttMs = Long.MAX_VALUE }   // panggil sebelum 5 sampel berikutnya
    fun serverNowMs(): Long = monotonicMs() + offsetMs
}
```

### 7.3 Penjadwal timer di klien
```kotlin
class TimerManager(
    private val clock: ClockSync,
    private val scope: CoroutineScope,
    private val onWarning: () -> Unit,
    private val onExpired: () -> Unit,
) {
    private var job: Job? = null
    private var currentVersion = -1L

    fun apply(state: TimerState) {
        if (state.version <= currentVersion) return      // abaikan versi lama
        currentVersion = state.version
        job?.cancel()
        val end = state.endAtMs ?: return                // timer dibatalkan
        job = scope.launch {
            waitUntil(end - 60_000); onWarning()         // langsung jalan jika sisa < 60 dtk
            waitUntil(end);          onExpired()
        }
    }

    private suspend fun waitUntil(serverMs: Long) {
        while (true) {
            val remaining = serverMs - clock.serverNowMs()
            if (remaining <= 0) return
            delay(minOf(remaining, 1_000))               // cek ulang tiap detik: tahan drift/Doze
        }
    }
}
```
`Clock` dan `CoroutineScope` disuntikkan agar bisa diuji dengan waktu virtual.

### 7.4 Perhitungan `end_at` (di server)
- **Mode durasi:** `end_at = server_now + duration_ms`. Klien tidak ikut menghitung, jadi tidak bergantung pada jam HP.
- **Mode jam:** klien mengirim `local_time` + `tz` (IANA, mis. `Asia/Jakarta`); server mengonversi ke epoch. Jika waktu sudah lewat hari ini dan `confirm_next_day=false` → server membalas `needs_confirmation`, klien menampilkan "Besok pukul 06:00?".
- **Timer saat masih berdering (US-12, P1):** durasi disimpan sebagai `pending_duration_ms` dan dikonversi menjadi `end_at` saat state menjadi `ACTIVE`.

### 7.5 Konflik dan idempotensi
- Optimistic concurrency: `timer.set` membawa `base_version`. Jika berbeda dari versi server → `timer.conflict` + state terbaru; UI menampilkan siapa yang mengubah.
- Setiap permintaan punya `request_id`; retry dengan `request_id` sama tidak menaikkan versi dua kali.

### 7.6 Eksekusi end
| Lapisan | Mekanisme | Catatan |
|---|---|---|
| Utama | `TimerManager` di klien (foreground service + partial wake lock selama panggilan) | Cek tiap detik |
| Cadangan klien | `AlarmManager.setExactAndAllowWhileIdle` bila `canScheduleExactAlarms()` | Izin tidak selalu ada; **[VERIFIKASI]** kebijakan izin exact alarm |
| Cadangan server | Scheduler di server pada `end_at + 2 dtk` | Menutup room LiveKit; menjamin panggilan berakhir walau satu klien macet |

### 7.7 Kasus tepi
- Jam HP diubah manual: tidak berpengaruh (basis monotonik + offset server).
- HP di-Doze / proses ditunda: server menutup room; klien menutup saat menerima `call.ended`.
- Dua timer berturutan sangat cepat: versi terbaru menang; klien membatalkan job lama.
- Zona waktu berbeda: hanya tampilan yang berbeda; `end_at` sama.

## 8. Protokol signaling (WebSocket, JSON)

Amplop: `{ "type": "...", "id": "req_x", "payload": { ... } }`

| Arah | Type | Fungsi |
|---|---|---|
| C→S | `hello` | Auth token, device id, versi aplikasi |
| C→S | `time.ping` | Sampel sinkron jam |
| S→C | `time.pong` | Balasan dengan `server_ms` |
| C→S | `call.invite`, `call.accept`, `call.decline`, `call.end` | Siklus panggilan |
| S→C | `call.incoming`, `call.accepted`, `call.declined`, `call.ended` | Notifikasi status |
| C→S | `timer.set`, `timer.cancel` | Ubah timer |
| S→C | `timer.updated` | Disiarkan ke kedua pihak |
| S→C | `timer.conflict`, `error` | Penolakan |

Contoh:
```json
{"type":"timer.set","id":"req_01","payload":{"call_id":"c_123","base_version":3,"mode":"duration","duration_ms":1800000}}

{"type":"timer.set","id":"req_02","payload":{"call_id":"c_123","base_version":4,"mode":"clock","local_time":"21:00","tz":"Asia/Jakarta","confirm_next_day":false}}

{"type":"timer.updated","payload":{"call_id":"c_123","version":5,"end_at_ms":1790604000000,"updated_by":"u_a","server_now_ms":1790598000000}}

{"type":"timer.conflict","payload":{"call_id":"c_123","current":{"version":5,"end_at_ms":1790604000000,"updated_by":"u_b"}}}
```

## 9. Data model dan API

### Tabel (PostgreSQL)
```
users(id, username UNIQUE, display_name, email, created_at)
contacts(user_id, contact_id, status[pending|accepted|blocked], created_at)
devices(id, user_id, fcm_token, platform, app_version, last_seen_at)
call_sessions(id, caller_id, callee_id, state, room_name,
              started_at, connected_at, ended_at, end_reason,
              timer_end_at, timer_version, timer_updated_by)
timer_events(id, call_id, actor_id, action[set|cancel|expire], end_at, version, created_at)
```

### REST
| Endpoint | Fungsi |
|---|---|
| `POST /auth/login`, `POST /auth/refresh` | Auth |
| `GET /contacts`, `POST /contacts/invite`, `POST /contacts/{id}/accept` | Kontak |
| `POST /devices` | Daftarkan token FCM |
| `POST /calls` | Buat panggilan (mengembalikan token LiveKit untuk penelepon) |
| `GET /calls/{id}` | Status panggilan dan timer |
| `DELETE /account` | Hapus akun dan data |
| `WS /ws` | Kanal kontrol real-time |

## 10. Audio pipeline dan noise suppression

### 10.1 Pipeline
```
Mic → (AEC bila speaker) → High-pass ~120 Hz → NS (ML) → [AGC ringan] → Opus → SRTP
```
- **Titik pasang:** implementasi `AudioProcessorInterface` di `AudioProcessorOptions.capturePostProcessor` (LiveKit Android SDK). Ada opsi bypass saat runtime untuk toggle NS. Cek signature di versi SDK yang dipakai **[VERIFIKASI]**.
- Matikan NS bawaan WebRTC bila ML NS aktif (menghindari pemrosesan ganda).
- RNNoise bekerja pada frame 10 ms (480 sampel @ 48 kHz, float dalam rentang int16). Frame dari WebRTC harus di-buffer/resample sesuai kebutuhan.

### 10.2 Perbandingan engine NS
| Engine | Kelebihan | Kekurangan | Lisensi (cek ulang) |
|---|---|---|---|
| NS bawaan WebRTC | Ringan, sudah ada | Lemah untuk noise tidak stasioner (mesin, lalu lintas) | BSD |
| `NoiseSuppressor` Android | Mudah dipakai | Kualitas tidak konsisten antar perangkat | — |
| **RNNoise** (default awal) | Sangat ringan, latensi rendah | Kualitas sedang untuk noise berat | BSD-3 |
| **DeepFilterNet** (opsi) | Kualitas lebih baik | CPU lebih berat, model besar | MIT/Apache-2.0 |
| SDK komersial (mis. Krisp) | Kualitas tinggi | Berbayar, ketergantungan vendor | Komersial |

Rekomendasi: mulai dari RNNoise; ukur; tambahkan DeepFilterNet untuk perangkat yang lolos benchmark CPU.

### 10.3 Suara angin
- High-pass filter ~100–150 Hz untuk menahan gemuruh frekuensi rendah.
- Uji model NS dengan rekaman angin nyata (bukan hanya noise sintetis).
- Perangkat keras: windscreen, posisi mikrofon dekat mulut, headset/intercom helm dengan mikrofon boom. Software tidak bisa menghapus angin yang memenuhi mikrofon sepenuhnya.
- Fase 2: deteksi angin dan saran ke pengguna.

### 10.4 Anggaran latensi dan CPU (target awal)
| Komponen | Anggaran |
|---|---|
| Buffer + NS | ≤ 30 ms |
| Encode Opus | ≈ 20 ms (frame 20 ms) |
| Jaringan + jitter buffer | ≤ 150 ms (4G normal) |
| CPU NS pada HP kelas bawah | Ukur; target < 10% dari satu core besar |

### 10.5 Routing audio dan Bluetooth
- Mode `MODE_IN_COMMUNICATION`; pilih perangkat via `AudioManager.setCommunicationDevice()` (API 31+) dan `startBluetoothSco()` untuk API 26–30 (deprecated).
- HFP: wideband (mSBC 16 kHz) atau narrowband (CVSD 8 kHz). NS harus adaptif terhadap sample rate (resample ke 48 kHz).
- Intercom helm sering sudah punya NS sendiri; sediakan toggle untuk menghindari double-processing.
- Tangani BT terputus di tengah panggilan (pindah ke earpiece/speaker dan beri bunyi), audio focus, dan panggilan seluler masuk (Telecom mengatur hold/prioritas).

### 10.6 Fallback otomatis
Bila terjadi underrun audio atau CPU tinggi: DeepFilterNet → RNNoise → NS WebRTC. Pilihan engine dikendalikan Remote Config (kill switch).

## 11. Izin, foreground service, dan batasan platform

| Izin / komponen | Alasan | Catatan |
|---|---|---|
| `RECORD_AUDIO` | Mikrofon | Izin runtime; jelaskan di onboarding |
| `POST_NOTIFICATIONS` | Notifikasi panggilan/timer (Android 13+) | Izin runtime |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_PHONE_CALL` | Layanan panggilan (Android 14+ wajib deklarasi tipe dan izin per tipe) | Deklarasi di manifest |
| `FOREGROUND_SERVICE_MICROPHONE` | Mikrofon aktif di latar belakang | Lihat catatan bawah |
| `MANAGE_OWN_CALLS` | Self-managed call via Telecom | **[VERIFIKASI]** |
| `USE_FULL_SCREEN_INTENT` | Layar panggilan masuk saat terkunci | Kebijakan Play membatasi; aplikasi panggilan memenuhi syarat **[VERIFIKASI]** |
| `BLUETOOTH_CONNECT` | Routing audio ke headset (Android 12+) | Izin runtime |
| `WAKE_LOCK`, `INTERNET`, `ACCESS_NETWORK_STATE` | Dasar | — |
| `SCHEDULE_EXACT_ALARM` (opsional) | Cadangan auto-end | Bukan syarat; server tetap menjadi fallback |

**Catatan penting mikrofon:** Android membatasi foreground service yang dimulai dari latar belakang untuk mengakses mikrofon. Pengalaman proyek lain (mis. Wire) menunjukkan tipe `phoneCall` saja tidak cukup agar mikrofon tetap aktif di latar belakang di Android 14; perlu deklarasi `phoneCall|microphone`. Alur aman untuk dering:

1. FCM prioritas tinggi → mulai FGS `phoneCall` (tanpa mikrofon) + notifikasi full-screen.
2. Pengguna menjawab (interaksi notifikasi/Activity) → naikkan ke `phoneCall|microphone` dan mulai menangkap audio.
3. **Auto-jawab tanpa interaksi berisiko gagal**; validasi di spike S1 pada Android 14–16.

Batasan lain:
- Doze dan App Standby: FCM prioritas tinggi diperlukan untuk dering; jangan mengandalkan koneksi WS untuk panggilan masuk.
- **OEM agresif (Xiaomi, Oppo, Vivo, Realme, Samsung):** sediakan panduan onboarding (autostart, baterai "tanpa batasan"). Jangan meminta `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` sembarangan karena dibatasi kebijakan Play **[VERIFIKASI]**.
- **Google Play:** targetSdk 36 (Android 16) untuk aplikasi baru dan pembaruan sejak 31 Agustus 2026 (ada opsi perpanjangan ke 1 November 2026 lewat Play Console). Siapkan deklarasi tipe foreground service dan full-screen intent, Data Safety form, dan fitur hapus akun.

## 12. Keamanan dan privasi

- TLS untuk semua API/WS; audio terenkripsi DTLS-SRTP oleh WebRTC.
- JWT berumur pendek; token LiveKit dibuat server, khusus satu room, berumur pendek, dan hanya untuk peserta panggilan. Secret LiveKit tidak pernah ada di aplikasi.
- Validasi di server: hanya peserta panggilan yang boleh mengubah timer; batas durasi; rate limit undangan dan panggilan; blokir kontak.
- Audio tidak direkam atau disimpan. Log tidak memuat isi audio.
- Data minimal: username, email, log panggilan (siapa, kapan, durasi, alasan). Kebijakan privasi dan hapus akun wajib ada.
- Auto-jawab (Fase 2): opt-in, whitelist, bunyi/indikator saat tersambung.

## 13. Strategi test

### 13.1 Piramida
| Lapisan | Contoh | Alat |
|---|---|---|
| Unit | Timer, ClockSync, state machine, validasi server | JUnit5, MockK, Turbine, `kotlinx-coroutines-test` |
| Integrasi | Server + 2 klien tiruan lewat WS; database nyata | Testcontainers |
| Instrumented | Layanan panggilan, notifikasi, routing audio | AndroidX Test, Compose UI test |
| Audio | Kualitas NS pada rekaman motor | Skrip Python (DNSMOS, PESQ, STOI) |
| Jaringan | Loss, jitter, RTT tinggi, perpindahan Wi-Fi ↔ 4G | `tc netem`, throttling emulator |
| Lapangan | Uji di motor sungguhan | Checklist (13.7) |

### 13.2 Pendekatan Test-Driven untuk logika inti
Untuk `TimerManager`, `ClockSync`, `CallStateMachine`, dan validasi timer di server:
1. Tulis test yang gagal (Red) berdasarkan tabel 13.3.
2. Tulis kode minimum agar lulus (Green).
3. Refactor dengan test tetap hijau.

Syarat desain agar bisa diuji: semua waktu lewat abstraksi `Clock`, semua penjadwalan lewat `CoroutineScope`/`TestScope` (waktu virtual), tidak ada `System.currentTimeMillis()` atau `delay` di kode produksi tanpa injeksi.

### 13.3 Test case timer

| ID | Skenario | Ekspektasi |
|---|---|---|
| T01 | Set 30 menit saat `ACTIVE` | `end_at = server_now + 30m`; versi naik; A dan B menerima `timer.updated` |
| T02 | Set 21:00 Asia/Jakarta saat 20:00 WIB | `end_at` benar; HP di WITA menampilkan 22:00 |
| T03 | Set 06:00 saat 20:00 tanpa konfirmasi | Ditolak `needs_confirmation`; dengan konfirmasi jadi besok |
| T04 | A dan B set bersamaan dengan `base_version` sama | Satu diterima, satu `timer.conflict` dengan state terbaru |
| T05 | Batalkan timer | `end_at = null`; tidak ada auto-end |
| T06 | Peringatan | Muncul tepat T-60 dtk; tidak dobel |
| T07 | Set dengan sisa < 60 dtk | Peringatan langsung tampil |
| T08 | Perpanjang saat masa peringatan | Peringatan reset; timer baru berlaku |
| T09 | Waktu habis | Kedua klien menutup; `ENDED(timer)`; tidak ada `call.ended` ganda |
| T10 | Klien offline, `end_at` lewat, lalu reconnect | Langsung `ENDED` |
| T11 | Klien offline lalu reconnect sebelum `end_at` | State disinkron ulang; hitung mundur lanjut |
| T12 | Jam HP diubah manual +1 jam | Hitung mundur tidak berubah |
| T13 | Sampel jam dengan RTT tinggi dan asimetris | Error offset < 200 ms dengan strategi min-RTT |
| T14 | Klien tertunda (Doze) melewati `end_at` > 2 dtk | Server menutup room; klien menutup saat terima `call.ended` |
| T15 | Retry `timer.set` dengan `request_id` sama | Idempoten; versi naik sekali |
| T16 | `timer.set` dari non-peserta | Ditolak (403) |
| T17 | `timer.set` saat state bukan `ACTIVE` | Ditolak (kecuali mode pending saat `RINGING`, P1) |
| T18 | Durasi di luar batas (0 atau > 12 jam) | Ditolak dengan pesan jelas |

### 13.4 Integrasi
Server diuji dengan dua klien WS tiruan: alur invite → accept → set timer → konflik → expire; termasuk restart server saat ada timer aktif (pemulihan dari database).

### 13.5 Pengujian kualitas audio
- **Dataset:** ucapan bersih + rekaman noise motor sendiri (30/60 km/jam; HP di saku, holder, headset BT) + dataset noise publik (mis. DEMAND). Campur pada SNR −5, 0, 5, 10 dB.
- **Metrik:** DNSMOS (SIG/BAK/OVRL), PESQ dan STOI (butuh referensi bersih dari campuran sintetis), ditambah MOS subjektif dari uji dengar A/B.
- **CI:** regresi otomatis pada sampel kecil; jalankan benchmark penuh tiap pergantian engine/model.

### 13.6 Uji jaringan dan perangkat
- Skenario: packet loss 5/10/20%, jitter, RTT 300 ms, pindah Wi-Fi ↔ 4G, putus 10–60 dtk.
- Matriks perangkat: Xiaomi/Redmi, Oppo/Realme, Vivo, Samsung seri A, Pixel; Android 8 sampai terbaru; minimal 1 HP kelas bawah (RAM ≤ 4 GB).
- Dering: aplikasi di-kill, HP terkunci, mode hemat baterai aktif.

### 13.7 Checklist uji lapangan (motor)
- [ ] Kecepatan 30 dan 60 km/jam: suara terdengar jelas oleh lawan bicara
- [ ] HP di saku, holder, headset BT, helm intercom
- [ ] Toggle NS on/off: perbedaan terasa
- [ ] Peringatan timer terdengar tanpa melihat layar
- [ ] Jawab/tutup lewat tombol headset
- [ ] Putus-nyambung di area sinyal lemah
- [ ] Baterai dan data per jam tercatat

## 14. Observability

| Metrik | Tujuan |
|---|---|
| Waktu sambung, status ICE | Kualitas setup |
| RTT, jitter, packet loss (WebRTC stats) | Kualitas jaringan |
| Waktu proses NS dan CPU | Beban NS |
| Selisih `ended_at` klien vs server | Akurasi timer |
| Latensi pengiriman FCM | Keandalan dering |
| Crash dan ANR | Stabilitas |

Log terstruktur di server; tidak menyimpan audio; identitas di-hash bila perlu.

## 15. CI/CD dan lingkungan

- **Lingkungan:** dev, staging, prod.
- **CI (GitHub Actions):** lint (ktlint/detekt), unit test, build AAB; instrumented test di Firebase Test Lab (opsional).
- **Backend:** Docker; deploy ke VPS; migrasi database otomatis.
- **LiveKit/TURN:** buka port sesuai dokumentasi LiveKit dan sediakan fallback TCP/TLS (443) untuk jaringan operator yang memblokir UDP.

## 16. Rencana rilis

Internal testing → closed beta (10–20 pengguna) → open beta → rilis. Feature flag lewat Remote Config: pilihan engine NS, batas durasi timer, kill switch. Biaya server dipantau per menit panggilan sebelum open beta.

## 17. Spike teknis (validasi awal)

| ID | Pertanyaan | Kriteria sukses |
|---|---|---|
| S1 | Bisakah mikrofon aktif setelah jawab dari notifikasi/headset, dan apakah auto-jawab feasible di Android 14–16? | Audio dua arah lancar di 3+ HP; catat batasan auto-jawab |
| S2 | Bisakah RNNoise berjalan real-time lewat `capturePostProcessor` LiveKit? | Tanpa glitch, delay ≤ 30 ms, bisa bypass saat runtime |
| S3 | Routing Bluetooth (HFP/SCO) di Android 8–16 dengan earbud dan intercom helm | Audio dua arah stabil, pindah perangkat mulus |
| S4 | Akurasi ClockSync di jaringan seluler | Error offset p95 < 200 ms |
| S5 | Dering panggilan masuk saat aplikasi di-kill di HP Xiaomi/Oppo/Vivo/Samsung | ≥ 95% berdering ≤ 5 dtk setelah panduan onboarding |

## 18. Referensi yang perlu dicek

- Android Developers: foreground service types dan pembatasan start dari background
- Android Developers: `androidx.core-telecom` / self-managed ConnectionService
- Firebase: prioritas pesan FCM
- LiveKit docs: Android SDK dan `AudioProcessorOptions`
- Repositori RNNoise dan DeepFilterNet (lisensi dan kebutuhan CPU)
- Google Play Console: deklarasi foreground service, full-screen intent, target API level
- dontkillmyapp.com: perilaku baterai per merek