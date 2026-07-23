<?php
// ─────────────────────────────────────────
// Konfigurasi Database PDO — SPK RPH
// Mendukung Environment Variables (Vercel/Cloud & XAMPP Local)
// ─────────────────────────────────────────

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $host   = getenv('DB_HOST')   ?: (getenv('MYSQL_HOST')     ?: (getenv('MYSQLHOST')     ?: 'localhost'));
            $port   = getenv('DB_PORT')   ?: (getenv('MYSQL_PORT')     ?: (getenv('MYSQLPORT')     ?: '3306'));
            $dbname = getenv('DB_NAME')   ?: (getenv('MYSQL_DATABASE') ?: (getenv('MYSQLDATABASE') ?: 'spk_rph'));
            $user   = getenv('DB_USER')   ?: (getenv('MYSQL_USER')     ?: (getenv('MYSQLUSER')     ?: 'root'));
            $pass   = getenv('DB_PASS') !== false ? getenv('DB_PASS')  : (getenv('MYSQL_PASSWORD') !== false ? getenv('MYSQL_PASSWORD') : (getenv('MYSQLPASSWORD') !== false ? getenv('MYSQLPASSWORD') : ''));

            $pdo = new PDO(
                "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4",
                $user,
                $pass,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Koneksi database gagal: ' . $e->getMessage()], 500);
        }
    }
    return $pdo;
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getInput() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
