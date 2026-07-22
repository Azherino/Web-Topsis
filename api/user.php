<?php
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// ── GET: List users ──
if ($method === 'GET') {
    $search = $_GET['search'] ?? '';
    $where = '1=1';
    $params = [];
    if ($search) {
        $where .= ' AND username LIKE ?';
        $params[] = "%$search%";
    }

    $stmt = $db->prepare("SELECT id, username, role, status, created_at FROM users WHERE $where ORDER BY id");
    $stmt->execute($params);
    jsonResponse(['data' => $stmt->fetchAll()]);
}

// ── POST: Tambah user ──
if ($method === 'POST') {
    $input = getInput();
    if (empty($input['username']) || empty($input['password'])) {
        jsonResponse(['error' => 'Username dan password wajib diisi'], 400);
    }
    if (strlen($input['username']) < 4) {
        jsonResponse(['error' => 'Username minimal 4 karakter'], 400);
    }

    // Cek unik
    $check = $db->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $check->execute([$input['username']]);
    if ($check->fetchColumn() > 0) {
        jsonResponse(['error' => 'Username sudah digunakan'], 400);
    }

    $role = $input['role'] ?? 'staff';
    if ($role === 'superadmin') {
        jsonResponse(['error' => 'Tidak diizinkan membuat user dengan role Superadmin'], 400);
    }

    $hash = password_hash($input['password'], PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
    $stmt->execute([$input['username'], $hash, $role]);

    jsonResponse(['message' => 'User ditambahkan', 'id' => $db->lastInsertId()]);
}

// ── PUT: Update user ──
if ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $input = getInput();
    $fields = [];
    $params = [];

    if (isset($input['username'])) { $fields[] = 'username = ?'; $params[] = $input['username']; }
    if (isset($input['role'])) { 
        if ($input['role'] === 'superadmin') {
            $checkRole = $db->prepare("SELECT role FROM users WHERE id = ?");
            $checkRole->execute([$id]);
            $currentRole = $checkRole->fetchColumn();
            if ($currentRole !== 'superadmin') {
                jsonResponse(['error' => 'Tidak diizinkan mengubah user ke role Superadmin'], 400);
            }
        }
        $fields[] = 'role = ?'; 
        $params[] = $input['role']; 
    }
    if (isset($input['status'])) { $fields[] = 'status = ?'; $params[] = $input['status']; }
    if (!empty($input['password'])) { $fields[] = 'password = ?'; $params[] = password_hash($input['password'], PASSWORD_DEFAULT); }

    if (empty($fields)) jsonResponse(['error' => 'Tidak ada data yang diubah'], 400);

    $params[] = $id;
    $stmt = $db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    jsonResponse(['message' => 'User diperbarui']);
}

// ── DELETE ──
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    // Prevent deleting superadmin
    $checkRole = $db->prepare("SELECT role FROM users WHERE id = ?");
    $checkRole->execute([$id]);
    if ($checkRole->fetchColumn() === 'superadmin') {
        jsonResponse(['error' => 'Tidak diizinkan menghapus user dengan role Superadmin'], 400);
    }

    $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['message' => 'User dihapus']);
}
