# 🌿 SKADUTA — 3D Smart Agriculture & Hydroponics IoT Hub

Aplikasi Dashboard Monitoring & Kontrol Hidroponik Cerdas berbasis **3D Digital Twin (Three.js WebGL)**, **Chart.js**, dan terintegrasi dengan **Firebase Realtime Database**.

---

## ✨ Fitur Utama

### 1. 🪐 3D Digital Twin Interaktif (Three.js WebGL)
- **Model 3D Hidroponik NFT**: Talang gulley PVC putih dengan net pot dan tanaman hijau prosedural yang bergoyang lembut tertiup angin (*wind breeze animation*).
- **Tangki Reservoir Realistis**: Bahan akrilik transparan dengan air bercahaya (*refraction & transmission*) dan gelembung aerator dinamis (*bubbler animation*).
- **Probe Sensor 3D**: Probe sensor pH, TDS/EC ganda, dan sensor suhu air yang tercelup ke dalam reservoir.
- **4 Unit Pompa Peristaltik**: Kepala rotor pompa berputar secara *real-time* saat relay aktif, dilengkapi lampu indikator status LED (Merah = Off, Hijau = On).
- **Selang Cairan Fluida Neon**: Partikel cairan mengalir melalui selang transparan menuju reservoir saat pompa diaktifkan.
- **Rig Lampu Hortikultura (Grow Light)**: Dapat diubah modenya antara:
  - 🟣 **Grow Light**: Spektrum UV/Merah Muda untuk pertumbuhan tanaman.
  - ⚪ **Daylight**: Cahaya matahari alami.
  - 🔵 **Night Cyber**: Mode malam redup dengan aksen neon.
- **Preset Kamera & Kontrol**:
  - *Pandangan Penuh* (Overview 360°)
  - *Tanaman NFT* (Close-up daun & pertumbuhan)
  - *Sensor & Tangki* (Fokus pada reservoir)
  - *Unit Pompa* (Fokus pada 4 pompa dosing)
  - Fitur **Orbit 360° Otomatis** (*Auto-Rotate*).

---

### 2. ⚡ Kontrol Relay & Dosing Presisi
- **Pompa pH Up** (Relay 01)
- **Pompa pH Down** (Relay 02)
- **Pompa Nutrisi A** (Relay 03 - Pekatan A)
- **Pompa Nutrisi B** (Relay 04 - Pekatan B)
- **Fitur Dosis Cepat**: Tombol **Dosis 10ml** untuk injeksi cairan terukur selama 3 detik.
- **E-Stop (Emergency Stop)**: Mematikan seluruh pompa sekaligus dalam keadaan darurat.
- **Efek Suara Sintesis**: Audio Web Audio API saat sakelar relay dihidupkan/dimatikan.

---

### 3. 📊 Indikator Presisi & Telemetri
- **Gauge pH Vektor**: Gauge radial dengan rentang 0 - 14 dan zona target optimal (5.5 - 6.5).
- **Gauge TDS Vektor**: Gauge radial PPM (0 - 2000 PPM) dengan zona nutrisi optimal (800 - 1200 PPM).
- **Grafik Riwayat Real-time (Chart.js)**: Menampilkan kurva pergerakan pH & TDS secara *live streaming*.
- **Metrik Reservoir**: Volume air tangki (%), laju alir, suhu air, suhu udara, dan kelembaban.
- **Log Terminal Aktivitas**: Menampilkan catatan aktivitas dan status otomatisasi secara transparan.

---

### 4. 🤖 Auto-Pilot Intelligent Dosing
- Sistem kendali otomatis yang secara cerdas mendeteksi:
  - Jika pH < 5.6 ➜ Mengaktifkan Pompa pH Up secara otomatis.
  - Jika pH > 6.7 ➜ Mengaktifkan Pompa pH Down secara otomatis.
  - Jika TDS < 880 PPM ➜ Mengaktifkan Pompa Nutrisi A & B secara otomatis.

---

### 5. 🔥 Terhubung Penuh ke Firebase Realtime Database
- Konfigurasi Firebase Anda telah **terhubung langsung secara otomatis**:
  - **Database URL**: `https://isro-smart-agriculture-default-rtdb.asia-southeast1.firebasedatabase.app`
  - **Path Node**: `agriculture_iot`
  - **Relays Path**: `agriculture_iot/relays/relay1` s/d `relay4`
  - **Sensors**: Membaca `ph` dan `tds` secara *real-time stream* (`onValue`).
- Sakelar di web langsung mengubah nilai di Firebase Realtime Database (`set`), dan setiap perubahan data di Firebase (baik dari mikrokontroler ESP32/ESP8266 atau cloud) langsung memicu animasi 3D putaran pompa dan aliran fluida di layar!

---

## 🚀 Cara Menjalankan

### Cara 1: Langsung Buka File HTML
Buka file [index.html](file:///d:/17.Isro'%20Nur%20Salaam/isroFirebase/index.html) langsung dengan mengklik dua kali atau membuka lewat browser kesukaan Anda (Google Chrome / Microsoft Edge / Firefox).

### Cara 2: Menjalankan Server Lokal
Jalankan perintah berikut di PowerShell / Terminal:
```bash
python -m http.server 8080
```
Lalu buka di browser:
[http://localhost:8080](http://localhost:8080)

---
*SKADUTA — SMK Negeri 2 Yogyakarta | Smart Agriculture Hydroponics Panel*
