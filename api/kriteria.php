<?php
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// ── GET: List kriteria ──
if ($method === 'GET') {
    $stmt = $db->query("SELECT * FROM kriteria ORDER BY urutan ASC");
    $data = $stmt->fetchAll();
    
    $totalBobot = array_sum(array_column($data, 'bobot'));
    
    jsonResponse([
        'data' => $data,
        'totalBobot' => round($totalBobot, 4),
        'valid' => abs($totalBobot - 1.0) < 0.001
    ]);
}

// ── POST: Tambah ──
if ($method === 'POST') {
    $input = getInput();
    if (empty($input['kode']) || empty($input['nama']) || !isset($input['bobot'])) {
        jsonResponse(['error' => 'Kode, nama, dan bobot wajib diisi'], 400);
    }

    $maxUrutan = $db->query("SELECT COALESCE(MAX(urutan), 0) FROM kriteria")->fetchColumn();

    $stmt = $db->prepare("INSERT INTO kriteria (kode, nama, bobot, jenis, urutan) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['kode'],
        $input['nama'],
        $input['bobot'],
        $input['jenis'] ?? 'benefit',
        $maxUrutan + 1
    ]);

    jsonResponse(['message' => 'Kriteria ditambahkan', 'id' => $db->lastInsertId()]);
}

// ── PUT: Update ──
if ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $input = getInput();
    $fields = [];
    $params = [];

    if (isset($input['kode'])) { $fields[] = 'kode = ?'; $params[] = $input['kode']; }
    if (isset($input['nama'])) { $fields[] = 'nama = ?'; $params[] = $input['nama']; }
    if (isset($input['bobot'])) { $fields[] = 'bobot = ?'; $params[] = $input['bobot']; }
    if (isset($input['jenis'])) { $fields[] = 'jenis = ?'; $params[] = $input['jenis']; }
    if (isset($input['urutan'])) { $fields[] = 'urutan = ?'; $params[] = $input['urutan']; }

    if (empty($fields)) jsonResponse(['error' => 'Tidak ada data yang diubah'], 400);

    $params[] = $id;
    $stmt = $db->prepare("UPDATE kriteria SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    jsonResponse(['message' => 'Kriteria diperbarui']);
}

// ── DELETE ──
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $stmt = $db->prepare("DELETE FROM kriteria WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['message' => 'Kriteria dihapus']);
}
