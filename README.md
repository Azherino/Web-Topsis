# 🏛️ Sistem Pendukung Keputusan (SPK) Pemilihan Karyawan Terbaik RPH — Metode TOPSIS

[![PHP Version](https://img.shields.io/badge/PHP-%3E%3D%207.4-8892BF.svg?style=flat-flat&logo=php)](https://php.net)
[![Database](https://img.shields.io/badge/MySQL-Database-orange.svg?style=flat-flat&logo=mysql)](https://mysql.com)
[![CSS](https://img.shields.io/badge/CSS-Vanilla-blue.svg?style=flat-flat&logo=css3)](https://css3.com)
[![JS](https://img.shields.io/badge/JS-Vanilla-yellow.svg?style=flat-flat&logo=javascript)](https://javascript.com)

Aplikasi **Sistem Pendukung Keputusan (SPK) Pemilihan Karyawan Terbaik** berbasis web ini dirancang khusus untuk **Rumah Pemotongan Hewan (RPH)** menggunakan **Metode TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution)**. Aplikasi dibangun dengan arsitektur **PHP Native API (Backend)** dan **Vanilla JS/HTML/CSS (Frontend)** yang responsif, cepat, serta memiliki estetika premium modern tanpa ketergantungan framework berat.

---

## 🌟 Fitur Utama

- **🔑 Autentikasi Keamanan**: Halaman login terproteksi untuk administrator menggunakan enkripsi password yang aman.
- **📊 Dashboard Ringkas**: Statistik total karyawan, kriteria aktif, rekap input nilai, serta highlight karyawan terbaik periode aktif.
- **👥 Kelola Data Karyawan**: CRUD lengkap untuk data karyawan (108 Alternatif default) dengan pencarian dinamis.
- **📋 Kelola Kriteria & Bobot**: Konfigurasi 8 kriteria penilaian RPH (Benefit/Cost) dengan validasi otomatis total bobot harus bernilai tepat `1.00`.
- **✏️ Input Nilai Penilaian**: Form input nilai karyawan terintegrasi (skala 0-100) dengan validasi pengisian wajib di semua kriteria sebelum perhitungan.
- **📐 Kalkulasi TOPSIS Transparan**: Menampilkan langkah-langkah detail proses perhitungan:
  - Matriks keputusan awal ($X$)
  - Matriks ternormalisasi ($R$)
  - Matriks ternormalisasi terbobot ($Y$)
  - Solusi Ideal Positif ($A^+$) & Solusi Ideal Negatif ($A^-$)
  - Jarak Solusi Ideal ($D_i^+$ & $D_i^-$)
  - Nilai Preferensi ($V_i$) & Perankingan Akhir
- **🏆 Hasil Akhir & Peringkat**: Penyorotan (*highlight*) pemenang ranking pertama secara dinamis.
- **🖨️ Cetak PDF Profesional**: Fitur ekspor laporan lengkap menggunakan **jsPDF** & **jsPDF-AutoTable** dengan layout Kop Surat berlogo (Karyawan, Kriteria, Matriks Penilaian, dan Hasil Perankingan).

---

## 🛠️ Tech Stack & Library

1. **Backend**: PHP Native (REST API)
2. **Database**: MySQL (PDO)
3. **Frontend**: HTML5, Vanilla CSS3 (Custom Design System, Glassmorphism, Micro-animations)
4. **JS Engine**: Vanilla JS (ES6 Module / Component-based)
5. **Eksternal CDN**:
   - **jsPDF** (Pembuatan laporan PDF di sisi klien)
   - **jsPDF-AutoTable** (Pembuatan tabel di PDF)
   - **SheetJS/xlsx** (Opsi pengolahan spreadsheet jika dibutuhkan)
   - **Google Fonts** (Inter & Plus Jakarta Sans)

---

## 📂 Struktur Proyek

```text
📂 Web-Topsis
├── 📂 api                      # Backend REST API (PHP)
│   ├── 📂 config
│   │   └── db.php              # Konfigurasi Koneksi Database (PDO)
│   ├── auth.php                # Endpoint Login & Cek Sesi
│   ├── dashboard.php           # Endpoint Statistik Dashboard
│   ├── karyawan.php            # Endpoint CRUD Karyawan
│   ├── kriteria.php            # Endpoint CRUD Kriteria
│   ├── penilaian.php           # Endpoint Input/Edit Nilai
│   └── topsis.php              # Endpoint Engine Perhitungan TOPSIS
├── 📂 assets                   # Aset Frontend (CSS, JS, Images)
│   ├── 📂 css
│   │   └── style.css           # Custom CSS Design System Premium
│   ├── 📂 js
│   │   ├── 📂 pages            # Javascript Modules Halaman UI
│   │   │   ├── dashboard.js
│   │   │   ├── input-nilai.js
│   │   │   ├── karyawan.js
│   │   │   ├── kriteria.js
│   │   │   ├── laporan.js      # Cetak PDF & Ekspor Laporan
│   │   │   ├── normalisasi.js
│   │   │   ├── perhitungan.js
│   │   │   ├── preferensi.js
│   │   │   └── ranking.js
│   │   ├── api.js              # Integrasi Fetch API
│   │   ├── app.js              # Router & Core Framework
│   │   ├── components.js       # Reusable UI Components (Modal, Toast, dll)
│   │   └── topsis.js           # Visualisasi detail TOPSIS
│   └── logo.png                # Logo Resmi RPH
├── 📂 database
│   └── spk_rph.sql             # SQL Schema & Seed Data (Admin, Kriteria, Alternatif)
├── index.html                  # File Utama Aplikasi (Single Page Application)
└── README.md                   # Dokumentasi Utama
```

---

## 🚀 Petunjuk Instalasi & Cara Menjalankan

### Persyaratan Sistem
- PHP versi 7.4 atau lebih tinggi
- MySQL / MariaDB
- Web Server (Apache/Nginx) atau XAMPP/Laragon

### Langkah-langkah Setup:

1. **Klon / Unduh Project**:
   Ekstrak folder project ke dalam direktori server Anda (misalnya `C:/xampp/htdocs/Web-Topsis` jika menggunakan XAMPP).

2. **Setup Database**:
   - Jalankan MySQL di XAMPP Control Panel.
   - Buka **phpMyAdmin** (`http://localhost/phpmyadmin`).
   - Buat database baru bernama `spk_rph`.
   - Pilih database `spk_rph`, klik menu **Import**, pilih file SQL di direktori `database/spk_rph.sql` lalu klik **Go**.

3. **Konfigurasi Database PHP (Jika Diperlukan)**:
   Buka file [db.php](file:///e:/Project/Web-Topsis/api/config/db.php) di folder `api/config/`. Sesuaikan kredensial MySQL Anda jika berbeda dari default:
   ```php
   $pdo = new PDO(
       'mysql:host=localhost;dbname=spk_rph;charset=utf8mb4',
       'root', // Username database
       ''      // Password database
   );
   ```

4. **Jalankan Aplikasi**:
   - **Metode A (XAMPP)**: Buka browser Anda dan akses `http://localhost/Web-Topsis/index.html`.
   - **Metode B (PHP CLI Server)**: Buka terminal/command prompt di direktori folder project, lalu jalankan perintah:
     ```bash
     php -S localhost:8000
     ```
     Buka browser Anda dan akses `http://localhost:8000`.

---

## 🔑 Kredensial Login Default

Gunakan kredensial berikut untuk masuk ke sistem administrator:
- **Username**: `admin`
- **Password**: `admin123`

---

## 📘 8 Kriteria Penilaian RPH

Berikut daftar kriteria penilaian default yang tertanam di database beserta bobotnya:
1. **C1 — Ketelitian Pemotongan Hewan** (Bobot: `0.20`, Jenis: `Benefit`)
2. **C2 — Kepatuhan SOP** (Bobot: `0.18`, Jenis: `Benefit`)
3. **C3 — K3 (Keselamatan & Kesehatan Kerja)** (Bobot: `0.16`, Jenis: `Benefit`)
4. **C4 — Kebersihan Kerja** (Bobot: `0.14`, Jenis: `Benefit`)
5. **C5 — Tanggung Jawab** (Bobot: `0.11`, Jenis: `Benefit`)
6. **C6 — Kedisiplinan** (Bobot: `0.09`, Jenis: `Benefit`)
7. **C7 — Kehadiran** (Bobot: `0.07`, Jenis: `Benefit`)
8. **C8 — Kerjasama Tim** (Bobot: `0.05`, Jenis: `Benefit`)

---

## 📝 Lisensi
Aplikasi ini dikembangkan untuk kebutuhan internal akademis / riset evaluasi kinerja karyawan RPH. Anda bebas memodifikasi dan mendistribusikannya kembali.
