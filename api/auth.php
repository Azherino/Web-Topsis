<?php
// ─────────────────────────────────────────
// Auth API — Login / Logout / Session Check
// ─────────────────────────────────────────
require_once __DIR__ . '/config/db.php';

session_start();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db = getDB();

// ── POST: Login ──
if ($action === 'login' && $method === 'POST') {
    $input = getInput();

    if (empty($input['username']) || empty($input['password'])) {
        jsonResponse(['error' => 'Username dan password wajib diisi'], 400);
    }

    $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND status = 'aktif'");
    $stmt->execute([$input['username']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($input['password'], $user['password'])) {
        jsonResponse(['error' => 'Username atau password salah'], 401);
    }

    // Set session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];

    jsonResponse([
        'message' => 'Login berhasil',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role']
        ]
    ]);
}

// ── POST: Logout ──
if ($action === 'logout' && $method === 'POST') {
    session_destroy();
    jsonResponse(['message' => 'Logout berhasil']);
}

// ── GET: Check Session ──
if ($action === 'check' && $method === 'GET') {
    if (isset($_SESSION['user_id'])) {
        jsonResponse([
            'authenticated' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'role' => $_SESSION['role']
            ]
        ]);
    } else {
        jsonResponse(['authenticated' => false], 200);
    }
}

jsonResponse(['error' => 'Action tidak valid'], 400);
