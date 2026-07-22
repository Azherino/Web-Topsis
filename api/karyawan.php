<?php
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db = getDB();

// ── GET: List karyawan ──
if ($method === 'GET') {
    $search  = $_GET['search'] ?? '';
    $status  = $_GET['status'] ?? '';
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = max(1, (int)($_GET['per_page'] ?? 25));
    $offset  = ($page - 1) * $perPage;

    $where = '1=1';
    $params = [];
    if ($search) {
        $where .= ' AND (nama LIKE ? OR kode LIKE ? OR jabatan LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    if ($status) {
        $where .= ' AND status = ?';
        $params[] = $status;
    }

    $total = $db->prepare("SELECT COUNT(*) FROM karyawan WHERE $where");
    $total->execute($params);

    $stmt = $db->prepare("SELECT * FROM karyawan WHERE $where ORDER BY id ASC LIMIT $perPage OFFSET $offset");
    $stmt->execute($params);

    jsonResponse([
        'data' => $stmt->fetchAll(),
        'total' => (int)$total->fetchColumn(),
        'page' => $page,
        'per_page' => $perPage
    ]);
}

// ── POST: Tambah / Import ──
if ($method === 'POST') {
    if ($action === 'truncate') {
        $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $db->exec("TRUNCATE TABLE hasil_topsis;");
        $db->exec("TRUNCATE TABLE penilaian;");
        $db->exec("TRUNCATE TABLE karyawan;");
        $db->exec("SET FOREIGN_KEY_CHECKS = 1;");
        jsonResponse(['message' => 'Dataset berhasil dikosongkan']);
    }

    if ($action === 'import') {
        $rows = getInput();
        $periode = $_GET['periode'] ?? date('Y-m');
        if (!is_array($rows) || empty($rows)) {
            jsonResponse(['error' => 'Data kosong'], 400);
        }

        // Ambil data kriteria untuk pemetaan nilai
        $kriteriaRows = $db->query("SELECT id, kode, nama FROM kriteria ORDER BY urutan")->fetchAll();
        $kriteriaMap = [];
        foreach ($kriteriaRows as $kr) {
            $kriteriaMap[$kr['kode']] = $kr['id'];
        }

        $excelMapping = [
            'Kedisiplinan' => 'C6',
            'Kehadiran' => 'C7',
            'Tanggung Jawab' => 'C5',
            'Kerjasama Tim' => 'C8',
            'Ketelitian Pemotongan Hewan' => 'C1',
            'Kepatuhan SOP' => 'C2',
            'K3' => 'C3',
            'Kebersihan Kerja' => 'C4'
        ];

        $stmtKaryawan = $db->prepare("
            INSERT INTO karyawan (kode, nama, jabatan) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE nama=VALUES(nama), jabatan=VALUES(jabatan)
        ");

        $stmtPenilaian = $db->prepare("
            INSERT INTO penilaian (karyawan_id, kriteria_id, periode, nilai)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)
        ");

        $karyawanCount = 0;
        $nilaiCount = 0;

        foreach ($rows as $i => $row) {
            // Mapping data karyawan
            $kode = $row['Kode'] ?? $row['kode'] ?? $row['Kode Karyawan'] ?? $row['kode_karyawan'] ?? null;
            if (!$kode) {
                $kode = 'KRY' . str_pad($i + 1, 3, '0', STR_PAD_LEFT);
            }
            $nama = $row['Nama Karyawan'] ?? $row['nama_karyawan'] ?? $row['Nama'] ?? $row['nama'] ?? '';
            $jabatan = $row['Jabatan'] ?? $row['jabatan'] ?? 'Karyawan RPH';

            if (empty($nama)) {
                continue; // Lewati jika nama kosong
            }

            // Insert / Update karyawan
            $stmtKaryawan->execute([$kode, $nama, $jabatan]);
            $karyawanCount++;

            // Dapatkan ID Karyawan
            $find = $db->prepare("SELECT id FROM karyawan WHERE kode = ? LIMIT 1");
            $find->execute([$kode]);
            $karyawanId = $find->fetchColumn();

            if (!$karyawanId) {
                continue;
            }

            // Masukkan nilai untuk setiap kriteria yang ditemukan di baris data
            foreach ($kriteriaRows as $kr) {
                $kKode = $kr['kode'];
                $kKodeLower = strtolower($kKode);
                
                $val = null;
                if (isset($row[$kKode])) {
                    $val = $row[$kKode];
                } elseif (isset($row[$kKodeLower])) {
                    $val = $row[$kKodeLower];
                } else {
                    foreach ($excelMapping as $excelCol => $kriteriaKode) {
                        if ($kriteriaKode === $kKode && isset($row[$excelCol])) {
                            $val = $row[$excelCol];
                            break;
                        }
                    }
                }

                if ($val !== null && isset($kriteriaMap[$kKode])) {
                    $stmtPenilaian->execute([$karyawanId, $kriteriaMap[$kKode], $periode, $val]);
                    $nilaiCount++;
                }
            }
        }

        jsonResponse([
            'message' => "Berhasil mengimpor $karyawanCount data karyawan dan $nilaiCount nilai kriteria untuk periode $periode."
        ]);
    }

    $input = getInput();
    if (empty($input['nama'])) {
        jsonResponse(['error' => 'Nama wajib diisi'], 400);
    }

    // Auto-generate kode
    $last = $db->query("SELECT kode FROM karyawan ORDER BY id DESC LIMIT 1")->fetchColumn();
    $nextNum = $last ? (int)substr($last, 3) + 1 : 1;
    $kode = 'KRY' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);

    $stmt = $db->prepare("INSERT INTO karyawan (kode, nama, jabatan) VALUES (?, ?, ?)");
    $stmt->execute([$kode, $input['nama'], $input['jabatan'] ?? 'Karyawan RPH']);

    jsonResponse(['message' => 'Karyawan ditambahkan', 'id' => $db->lastInsertId(), 'kode' => $kode]);
}

// ── PUT: Update ──
if ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $input = getInput();
    $fields = [];
    $params = [];

    if (isset($input['nama'])) { $fields[] = 'nama = ?'; $params[] = $input['nama']; }
    if (isset($input['jabatan'])) { $fields[] = 'jabatan = ?'; $params[] = $input['jabatan']; }
    if (isset($input['status'])) { $fields[] = 'status = ?'; $params[] = $input['status']; }

    if (empty($fields)) jsonResponse(['error' => 'Tidak ada data yang diubah'], 400);

    $params[] = $id;
    $stmt = $db->prepare("UPDATE karyawan SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    jsonResponse(['message' => 'Karyawan diperbarui']);
}

// ── DELETE ──
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $stmt = $db->prepare("DELETE FROM karyawan WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['message' => 'Karyawan dihapus']);
}
