# Panduan Deploy Web Server Callan ke Render.com (100% Gratis & Permanen)

Web server ini bertindak sebagai **Signaling Server P2P** milik Anda sendiri. Dengan memiliki server ini, panggilan telepon antara **Jakarta dan Bandung (atau antar kota manapun)** dijamin **100% tembus, instan, dan stabil**, tanpa terganggu server publik yang suka overload.

---

## Langkah 1: Buat Akun di Render.com (1 Menit)
1. Buka browser dan kunjungi: **[https://render.com](https://render.com)**
2. Klik **Get Started for Free** (bisa login menggunakan akun **GitHub** atau **Google**).

---

## Langkah 2: Deploy Server ke Render (2 Menit)

### Cara Termudah (Lewat GitHub Repository):
1. Pastikan project atau folder `server/` sudah Anda push ke akun GitHub Anda.
2. Di dashboard Render.com, klik tombol **New +** di pojok kanan atas, lalu pilih **Web Service**.
3. Pilih repository GitHub Anda (**aplikasi callan**).
4. Isi form pengaturan berikut:
   * **Name**: `callan-server` *(atau nama bebas pilihan Anda)*
   * **Region**: `Singapore` *(paling dekat dengan Indonesia, latensi sangat rendah)*
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: Pilih **Free ($0/month)**
5. Klik tombol **Deploy Web Service** di bagian bawah.

Tunggu sekitar 1–2 menit sampai statusnya berubah menjadi **Live** (Warna Hijau).

---

## Langkah 3: Ambil URL Server Anda
Setelah deploy selesai, Render akan memberikan domain HTTPS gratis, contohnya:
👉 **`callan-server.onrender.com`** *(salin nama domain ini tanpa `https://`)*

---

## Langkah 4: Masukkan ke Aplikasi Callan di HP Anda & HP Pacar

1. Buka aplikasi **Callan** di HP Anda (Bandung) dan di HP Pacar (Jakarta).
2. Klik tombol **Pensil / Edit ID** di sebelah ID Anda.
3. Klik bagian **"Server WebRTC (Render.com)"**.
4. Masukkan domain Render Anda, misalnya:
   ```text
   callan-server.onrender.com
   ```
5. Klik tombol **Simpan**.
6. **Selesai!** 
   Kedua HP sekarang otomatis terhubung ke server privat Anda sendiri. Silakan lakukan panggilan—suara dan koneksi langsung terhubung jernih dan stabil!
