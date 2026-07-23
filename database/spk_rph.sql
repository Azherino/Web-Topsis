-- ─────────────────────────────────────────
-- SPK Karyawan Terbaik — RPH
-- Metode TOPSIS · Schema & Seed Kriteria
-- (Database Bersih Siap Pakai / Production)
-- ─────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS spk_rph CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE spk_rph;

-- ─────────────────────────────────────────
-- TABEL: Users
-- ─────────────────────────────────────────
DROP TABLE IF EXISTS hasil_topsis;
DROP TABLE IF EXISTS penilaian;
DROP TABLE IF EXISTS kriteria;
DROP TABLE IF EXISTS karyawan;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  username   VARCHAR(50) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('superadmin','admin','manager','staff') DEFAULT 'admin',
  status     ENUM('aktif','tidak_aktif')     DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABEL: Karyawan
-- ─────────────────────────────────────────
CREATE TABLE karyawan (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  kode       VARCHAR(10) UNIQUE NOT NULL,
  nama       VARCHAR(100) NOT NULL,
  jabatan    VARCHAR(100),
  status     ENUM('aktif','tidak_aktif') DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABEL: Kriteria (8 Kriteria Default)
-- ─────────────────────────────────────────
CREATE TABLE kriteria (
  id     INT PRIMARY KEY AUTO_INCREMENT,
  kode   VARCHAR(5)   NOT NULL,
  nama   VARCHAR(100) NOT NULL,
  bobot  DECIMAL(5,4) NOT NULL,
  jenis  ENUM('benefit','cost') DEFAULT 'benefit',
  urutan INT DEFAULT 0
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABEL: Penilaian
-- ─────────────────────────────────────────
CREATE TABLE penilaian (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  karyawan_id INT NOT NULL,
  kriteria_id INT NOT NULL,
  periode     VARCHAR(7) NOT NULL,
  nilai       DECIMAL(5,2) NOT NULL,
  UNIQUE KEY uq_nilai (karyawan_id, kriteria_id, periode),
  FOREIGN KEY (karyawan_id) REFERENCES karyawan(id) ON DELETE CASCADE,
  FOREIGN KEY (kriteria_id) REFERENCES kriteria(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABEL: Hasil TOPSIS (cache)
-- ─────────────────────────────────────────
CREATE TABLE hasil_topsis (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  karyawan_id INT NOT NULL,
  periode     VARCHAR(7) NOT NULL,
  r_normal    JSON,
  y_bobot     JSON,
  d_plus      DECIMAL(10,6),
  d_minus     DECIMAL(10,6),
  preferensi  DECIMAL(10,6),
  ranking     INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hasil (karyawan_id, periode),
  FOREIGN KEY (karyawan_id) REFERENCES karyawan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- SEED: Admin default (password: admin123)
-- ─────────────────────────────────────────
INSERT INTO users (username, password, role) VALUES
('admin', '$2y$10$BfroWG57DnbSIJpuSag4BuamEqBfXPhf/.gcLm/bVVAQcJRZ.zhKi', 'superadmin');

-- ─────────────────────────────────────────
-- SEED: 8 Kriteria RPH Default
-- ─────────────────────────────────────────
INSERT INTO kriteria (kode, nama, bobot, jenis, urutan) VALUES
('C1', 'Ketelitian Pemotongan Hewan', 0.20, 'benefit', 1),
('C2', 'Kepatuhan SOP',               0.18, 'benefit', 2),
('C3', 'K3 (Keselamatan & Kesehatan Kerja)', 0.16, 'benefit', 3),
('C4', 'Kebersihan Kerja',             0.14, 'benefit', 4),
('C5', 'Tanggung Jawab',               0.11, 'benefit', 5),
('C6', 'Kedisiplinan',                 0.09, 'benefit', 6),
('C7', 'Kehadiran',                    0.07, 'benefit', 7),
('C8', 'Kerjasama Tim',                0.05, 'benefit', 8);
