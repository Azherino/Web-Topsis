<?php
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$periode = $_GET['periode'] ?? date('Y-m');
$db = getDB();

// ── POST: Hitung TOPSIS ──
if ($action === 'hitung' && $method === 'POST') {
    // 1. Ambil semua nilai penilaian periode ini
    $stmt = $db->prepare("
        SELECT k.id, k.kode, k.nama, k.jabatan,
               kr.id as kriteria_id, kr.kode as kriteria_kode, kr.jenis, kr.bobot, p.nilai
        FROM penilaian p
        JOIN karyawan k  ON k.id = p.karyawan_id
        JOIN kriteria kr ON kr.id = p.kriteria_id
        WHERE p.periode = ? AND k.status = 'aktif'
        ORDER BY k.id, kr.urutan
    ");
    $stmt->execute([$periode]);
    $rows = $stmt->fetchAll();

    if (empty($rows)) {
        jsonResponse(['error' => 'Tidak ada data penilaian untuk periode ' . $periode], 400);
    }

    // 2. Susun ke struktur matrix
    $matrix = [];
    $kriteria = [];
    foreach ($rows as $row) {
        $matrix[$row['id']]['info'] = [
            'kode' => $row['kode'],
            'nama' => $row['nama'],
            'jabatan' => $row['jabatan']
        ];
        $matrix[$row['id']][$row['kriteria_kode']] = (float)$row['nilai'];
        if (!isset($kriteria[$row['kriteria_kode']])) {
            $kriteria[$row['kriteria_kode']] = [
                'id' => $row['kriteria_id'],
                'jenis' => $row['jenis'],
                'bobot' => (float)$row['bobot']
            ];
        }
    }

    // 3. Normalisasi
    $pembagi = [];
    foreach ($kriteria as $kode => $_) {
        $sumSq = 0;
        foreach ($matrix as $row) {
            $val = $row[$kode] ?? 0;
            $sumSq += $val * $val;
        }
        $pembagi[$kode] = sqrt($sumSq);
    }

    $rNormal = [];
    foreach ($matrix as $id => &$row) {
        $rNormal[$id] = [];
        foreach ($kriteria as $kode => $_) {
            $val = $row[$kode] ?? 0;
            $rNormal[$id][$kode] = $pembagi[$kode] > 0 ? $val / $pembagi[$kode] : 0;
        }
    }

    // 4. Pembobotan
    $yBobot = [];
    foreach ($matrix as $id => $row) {
        $yBobot[$id] = [];
        foreach ($kriteria as $kode => $k) {
            $yBobot[$id][$kode] = $rNormal[$id][$kode] * $k['bobot'];
        }
    }

    // 5. Solusi ideal
    $aPlus = [];
    $aMinus = [];
    foreach ($kriteria as $kode => $k) {
        $vals = [];
        foreach ($yBobot as $id => $row) {
            $vals[] = $row[$kode];
        }
        if ($k['jenis'] === 'benefit') {
            $aPlus[$kode] = max($vals);
            $aMinus[$kode] = min($vals);
        } else {
            $aPlus[$kode] = min($vals);
            $aMinus[$kode] = max($vals);
        }
    }

    // 6. Jarak & preferensi
    $hasil = [];
    foreach ($matrix as $id => $row) {
        $sumPlus = 0;
        $sumMinus = 0;
        foreach ($kriteria as $kode => $_) {
            $sumPlus += pow($yBobot[$id][$kode] - $aPlus[$kode], 2);
            $sumMinus += pow($yBobot[$id][$kode] - $aMinus[$kode], 2);
        }
        $dPlus = sqrt($sumPlus);
        $dMinus = sqrt($sumMinus);
        $pref = ($dPlus + $dMinus) > 0 ? $dMinus / ($dPlus + $dMinus) : 0;

        $hasil[$id] = [
            'info' => $row['info'],
            'r_normal' => $rNormal[$id],
            'y_bobot' => $yBobot[$id],
            'd_plus' => $dPlus,
            'd_minus' => $dMinus,
            'preferensi' => $pref
        ];
    }

    // 7. Ranking
    uasort($hasil, fn($a, $b) => $b['preferensi'] <=> $a['preferensi']);
    $rank = 1;
    foreach ($hasil as $id => &$h) {
        $h['ranking'] = $rank++;
    }

    // 8. Simpan ke database
    $db->prepare("DELETE FROM hasil_topsis WHERE periode = ?")->execute([$periode]);

    $ins = $db->prepare("
        INSERT INTO hasil_topsis (karyawan_id, periode, r_normal, y_bobot, d_plus, d_minus, preferensi, ranking)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($hasil as $id => $h) {
        $ins->execute([
            $id, $periode,
            json_encode($h['r_normal']),
            json_encode($h['y_bobot']),
            $h['d_plus'], $h['d_minus'],
            $h['preferensi'], $h['ranking']
        ]);
    }

    jsonResponse([
        'message' => 'Kalkulasi TOPSIS selesai',
        'total' => count($hasil),
        'periode' => $periode,
        'pembagi' => $pembagi,
        'aPlus' => $aPlus,
        'aMinus' => $aMinus
    ]);
}

// ── GET: Ambil hasil ──
if ($action === 'hasil' && $method === 'GET') {
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = max(1, (int)($_GET['per_page'] ?? 25));
    $offset  = ($page - 1) * $perPage;
    $search  = $_GET['search'] ?? '';

    $where = 'h.periode = ?';
    $params = [$periode];
    if ($search) {
        $where .= ' AND (k.nama LIKE ? OR k.kode LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $total = $db->prepare("
        SELECT COUNT(*) FROM hasil_topsis h
        JOIN karyawan k ON k.id = h.karyawan_id
        WHERE $where
    ");
    $total->execute($params);

    $stmt = $db->prepare("
        SELECT h.*, k.kode, k.nama, k.jabatan, k.status
        FROM hasil_topsis h
        JOIN karyawan k ON k.id = h.karyawan_id
        WHERE $where
        ORDER BY h.ranking ASC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    // Parse JSON fields
    foreach ($data as &$row) {
        $row['r_normal'] = json_decode($row['r_normal'], true);
        $row['y_bobot'] = json_decode($row['y_bobot'], true);
    }

    // Ambil solusi ideal dari row pertama (rank 1 = semua data)
    $allHasil = $db->prepare("
        SELECT h.y_bobot FROM hasil_topsis h WHERE h.periode = ?
    ");
    $allHasil->execute([$periode]);
    $allYbobot = $allHasil->fetchAll();

    $aPlus = [];
    $aMinus = [];
    $kriteriaData = $db->query("SELECT kode, jenis FROM kriteria ORDER BY urutan")->fetchAll();

    if (!empty($allYbobot)) {
        foreach ($kriteriaData as $kr) {
            $vals = array_map(function($r) use ($kr) {
                $yb = json_decode($r['y_bobot'], true);
                return $yb[$kr['kode']] ?? 0;
            }, $allYbobot);

            if ($kr['jenis'] === 'benefit') {
                $aPlus[$kr['kode']] = max($vals);
                $aMinus[$kr['kode']] = min($vals);
            } else {
                $aPlus[$kr['kode']] = min($vals);
                $aMinus[$kr['kode']] = max($vals);
            }
        }
    }

    jsonResponse([
        'data' => $data,
        'total' => (int)$total->fetchColumn(),
        'page' => $page,
        'per_page' => $perPage,
        'periode' => $periode,
        'aPlus' => $aPlus,
        'aMinus' => $aMinus
    ]);
}

// ── GET: Ambil data normalisasi ──
if ($action === 'normalisasi' && $method === 'GET') {
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = max(1, (int)($_GET['per_page'] ?? 25));
    $offset  = ($page - 1) * $perPage;

    $total = $db->prepare("SELECT COUNT(*) FROM hasil_topsis WHERE periode = ?");
    $total->execute([$periode]);

    $stmt = $db->prepare("
        SELECT h.karyawan_id, h.r_normal, h.y_bobot, k.kode, k.nama
        FROM hasil_topsis h
        JOIN karyawan k ON k.id = h.karyawan_id
        WHERE h.periode = ?
        ORDER BY k.id
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute([$periode]);
    $data = $stmt->fetchAll();

    foreach ($data as &$row) {
        $row['r_normal'] = json_decode($row['r_normal'], true);
        $row['y_bobot'] = json_decode($row['y_bobot'], true);
    }

    // Pembagi
    $kriteriaList = $db->query("SELECT kode FROM kriteria ORDER BY urutan")->fetchAll();
    $pembagi = [];
    foreach ($kriteriaList as $kr) {
        $stmtP = $db->prepare("
            SELECT SUM(p.nilai * p.nilai) as sum_sq
            FROM penilaian p
            JOIN kriteria kr ON kr.id = p.kriteria_id
            WHERE p.periode = ? AND kr.kode = ?
        ");
        $stmtP->execute([$periode, $kr['kode']]);
        $sumSq = $stmtP->fetchColumn();
        $pembagi[$kr['kode']] = sqrt($sumSq);
    }

    jsonResponse([
        'data' => $data,
        'total' => (int)$total->fetchColumn(),
        'page' => $page,
        'per_page' => $perPage,
        'pembagi' => $pembagi
    ]);
}

// ── GET: Detail per karyawan ──
if ($action === 'detail' && $method === 'GET') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $stmt = $db->prepare("
        SELECT h.*, k.kode, k.nama, k.jabatan
        FROM hasil_topsis h
        JOIN karyawan k ON k.id = h.karyawan_id
        WHERE h.karyawan_id = ? AND h.periode = ?
    ");
    $stmt->execute([$id, $periode]);
    $row = $stmt->fetch();

    if (!$row) jsonResponse(['error' => 'Data tidak ditemukan'], 404);

    $row['r_normal'] = json_decode($row['r_normal'], true);
    $row['y_bobot'] = json_decode($row['y_bobot'], true);

    jsonResponse($row);
}

jsonResponse(['error' => 'Endpoint tidak valid'], 400);
