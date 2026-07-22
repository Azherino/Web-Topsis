<?php
require_once __DIR__ . '/config/db.php';

$db = getDB();

// Statistik dashboard
$totalKaryawan = $db->query("SELECT COUNT(*) FROM karyawan WHERE status='aktif'")->fetchColumn();
$totalKriteria = $db->query("SELECT COUNT(*) FROM kriteria")->fetchColumn();

// Cek periode yang ada
$periodes = $db->query("SELECT DISTINCT periode FROM penilaian ORDER BY periode DESC")->fetchAll();
$periodeAktif = $periodes[0]['periode'] ?? date('Y-m');

// Total yang sudah diinput pada periode aktif
$totalInput = $db->prepare("
    SELECT COUNT(DISTINCT karyawan_id) FROM penilaian WHERE periode = ?
");
$totalInput->execute([$periodeAktif]);
$totalSudahInput = $totalInput->fetchColumn();

// Cek apakah hasil TOPSIS sudah ada
$hasilAda = $db->prepare("SELECT COUNT(*) FROM hasil_topsis WHERE periode = ?");
$hasilAda->execute([$periodeAktif]);
$sudahDihitung = $hasilAda->fetchColumn() > 0;

// Ambil karyawan terbaik (ranking 1) jika sudah dihitung
$karyawanTerbaik = null;
if ($sudahDihitung) {
    $stmtBest = $db->prepare("
        SELECT h.preferensi, h.ranking, k.kode, k.nama, k.jabatan
        FROM hasil_topsis h
        JOIN karyawan k ON k.id = h.karyawan_id
        WHERE h.periode = ? AND h.ranking = 1
        LIMIT 1
    ");
    $stmtBest->execute([$periodeAktif]);
    $best = $stmtBest->fetch();
    if ($best) {
        $karyawanTerbaik = [
            'kode' => $best['kode'],
            'nama' => $best['nama'],
            'jabatan' => $best['jabatan'],
            'preferensi' => $best['preferensi']
        ];
    }
}

jsonResponse([
    'totalKaryawan' => (int)$totalKaryawan,
    'totalKriteria' => (int)$totalKriteria,
    'periodeAktif' => $periodeAktif,
    'periodes' => array_column($periodes, 'periode'),
    'totalSudahInput' => (int)$totalSudahInput,
    'sudahDihitung' => $sudahDihitung,
    'karyawanTerbaik' => $karyawanTerbaik
]);
