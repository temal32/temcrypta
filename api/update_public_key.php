<?php
// api/update_public_key.php
require_once 'config.php';

if (!isLoggedIn()) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

// Get JSON data
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    jsonResponse(['error' => 'Invalid request data'], 400);
}

// Validate public key
$public_key = $data['public_key'] ?? null;
if (!$public_key) {
    jsonResponse(['error' => 'Public key is required'], 400);
}

$userId = getCurrentUserId();

try {
    $db = getDb();
    
    // Update user's public key
    $stmt = $db->prepare('UPDATE users SET public_key = :public_key WHERE id = :id');
    $stmt->bindValue(':public_key', $public_key, SQLITE3_TEXT);
    $stmt->bindValue(':id', $userId, SQLITE3_INTEGER);
    $stmt->execute();
    
    $db->close();
    
    jsonResponse(['success' => true, 'message' => 'Public key updated successfully']);
} catch (Exception $e) {
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>