<?php
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db = getDB();

// ── GET: List penilaian per periode ──
if ($method === 'GET') {
    $periode = $_GET['periode'] ?? date('Y-m');
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = max(1, (int)($_GET['per_page'] ?? 25));
    $offset  = ($page - 1) * $perPage;
    $search  = $_GET['search'] ?? '';

    // Ambil semua kriteria
    $kriteria = $db->query("SELECT * FROM kriteria ORDER BY urutan")->fetchAll();

    // Base query
    $where = "k.status = 'aktif'";
    $params = [];
    if ($search) {
        $where .= " AND (k.nama LIKE ? OR k.kode LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $total = $db->prepare("SELECT COUNT(*) FROM karyawan k WHERE $where");
    $total->execute($params);
    $totalCount = (int)$total->fetchColumn();

    // Ambil karyawan dengan pagination
    $stmtK = $db->prepare("SELECT * FROM karyawan k WHERE $where ORDER BY k.id LIMIT $perPage OFFSET $offset");
    $stmtK->execute($params);
    $karyawanList = $stmtK->fetchAll();

    // Ambil semua nilai untuk periode ini
    $stmtN = $db->prepare("SELECT karyawan_id, kriteria_id, nilai FROM penilaian WHERE periode = ?");
    $stmtN->execute([$periode]);
    $nilaiMap = [];
    foreach ($stmtN->fetchAll() as $n) {
        $nilaiMap[$n['karyawan_id']][$n['kriteria_id']] = $n['nilai'];
    }

    // Susun data
    $data = [];
    foreach ($karyawanList as $k) {
        $row = [
            'id' => $k['id'],
            'kode' => $k['kode'],
            'nama' => $k['nama'],
            'nilai' => []
        ];
        foreach ($kriteria as $kr) {
            $row['nilai'][$kr['kode']] = $nilaiMap[$k['id']][$kr['id']] ?? null;
        }
        $row['lengkap'] = count(array_filter($row['nilai'], fn($v) => $v !== null)) === count($kriteria);
        $data[] = $row;
    }

    // Hitung total yang sudah lengkap
    $totalLengkap = $db->prepare("
        SELECT COUNT(*) FROM (
            SELECT karyawan_id, COUNT(DISTINCT kriteria_id) as cnt
            FROM penilaian WHERE periode = ?
            GROUP BY karyawan_id
            HAVING cnt = (SELECT COUNT(*) FROM kriteria)
        ) t
    ");
    $totalLengkap->execute([$periode]);

    jsonResponse([
        'data' => $data,
        'kriteria' => $kriteria,
        'total' => $totalCount,
        'totalLengkap' => (int)$totalLengkap->fetchColumn(),
        'page' => $page,
        'per_page' => $perPage,
        'periode' => $periode
    ]);
}

// ── POST: Simpan/Update nilai ──
if ($method === 'POST') {
    if ($action === 'import') {
        $input = getInput();
        $periode = $input['periode'] ?? date('Y-m');
        $rows = $input['data'] ?? [];

        if (empty($rows)) jsonResponse(['error' => 'Data kosong'], 400);

        // Mapping nama kolom Excel → kriteria_id
        $kriteriaMap = [];
        $kriteriaRows = $db->query("SELECT id, kode, nama FROM kriteria ORDER BY urutan")->fetchAll();
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
        foreach ($kriteriaRows as $kr) {
            $kriteriaMap[$kr['kode']] = $kr['id'];
        }

        $stmt = $db->prepare("
            INSERT INTO penilaian (karyawan_id, kriteria_id, periode, nilai)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)
        ");

        $count = 0;
        foreach ($rows as $row) {
            $karyawanId = null;
            
            // 1. Cari karyawan_id dari properti langsung
            if (isset($row['karyawan_id'])) {
                $karyawanId = $row['karyawan_id'];
            } elseif (isset($row['id'])) {
                $karyawanId = $row['id'];
            }

            // 2. Jika tidak ada ID, cari berdasarkan Kode Karyawan (misal KRY001)
            if (!$karyawanId) {
                $kodeVal = $row['Kode'] ?? $row['kode'] ?? $row['Kode Karyawan'] ?? $row['kode_karyawan'] ?? null;
                if ($kodeVal) {
                    $find = $db->prepare("SELECT id FROM karyawan WHERE kode = ? LIMIT 1");
                    $find->execute([$kodeVal]);
                    $karyawanId = $find->fetchColumn();
                }
            }

            // 3. Jika masih tidak ada, cari berdasarkan Nama Karyawan
            if (!$karyawanId) {
                $namaVal = $row['Nama Karyawan'] ?? $row['nama_karyawan'] ?? $row['Nama'] ?? $row['nama'] ?? null;
                if ($namaVal) {
                    $find = $db->prepare("SELECT id FROM karyawan WHERE nama = ? LIMIT 1");
                    $find->execute([$namaVal]);
                    $karyawanId = $find->fetchColumn();
                }
            }

            // 4. Fallback ke kolom No
            if (!$karyawanId && isset($row['No'])) {
                $karyawanId = $row['No'];
            }

            if (!$karyawanId) continue;

            // Masukkan nilai untuk setiap kriteria yang ditemukan di baris data
            foreach ($kriteriaRows as $kr) {
                $kode = $kr['kode']; // Misal C1, C2
                $kodeLower = strtolower($kode); // c1, c2
                
                $val = null;
                // Cek apakah ada kolom C1, c1, atau nama kriteria deskriptif
                if (isset($row[$kode])) {
                    $val = $row[$kode];
                } elseif (isset($row[$kodeLower])) {
                    $val = $row[$kodeLower];
                } else {
                    // Cek berdasarkan pemetaan deskripsi (misal 'Ketelitian Pemotongan Hewan')
                    foreach ($excelMapping as $excelCol => $kriteriaKode) {
                        if ($kriteriaKode === $kode && isset($row[$excelCol])) {
                            $val = $row[$excelCol];
                            break;
                        }
                    }
                }

                if ($val !== null && isset($kriteriaMap[$kode])) {
                    $stmt->execute([$karyawanId, $kriteriaMap[$kode], $periode, $val]);
                    $count++;
                }
            }
        }

        jsonResponse(['message' => "$count nilai berhasil diimport"]);
    }

    // Simpan satu nilai
    $input = getInput();
    if (!isset($input['karyawan_id']) || !isset($input['kriteria_id']) || !isset($input['nilai'])) {
        jsonResponse(['error' => 'karyawan_id, kriteria_id, dan nilai wajib diisi'], 400);
    }

    $periode = $input['periode'] ?? date('Y-m');
    $nilai = floatval($input['nilai']);

    if ($nilai < 0 || $nilai > 100) {
        jsonResponse(['error' => 'Nilai harus antara 0-100'], 400);
    }

    $stmt = $db->prepare("
        INSERT INTO penilaian (karyawan_id, kriteria_id, periode, nilai)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)
    ");
    $stmt->execute([$input['karyawan_id'], $input['kriteria_id'], $periode, $nilai]);

    jsonResponse(['message' => 'Nilai disimpan']);
}
