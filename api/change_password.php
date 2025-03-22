<?php
// api/change_password.php
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

// Validate input
$currentPassword = $data['current_password'] ?? '';
$newPassword = $data['new_password'] ?? '';
$confirmPassword = $data['confirm_password'] ?? '';

if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
    jsonResponse(['error' => 'All fields are required'], 400);
}

if ($newPassword !== $confirmPassword) {
    jsonResponse(['error' => 'New passwords do not match'], 400);
}

if (strlen($newPassword) < 8) {
    jsonResponse(['error' => 'New password must be at least 8 characters long'], 400);
}

$userId = getCurrentUserId();

try {
    $db = getDb();
    
    // Get current password hash
    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = :id');
    $stmt->bindValue(':id', $userId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $user = $result->fetchArray(SQLITE3_ASSOC);
    
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    // Verify current password
    if (!password_verify($currentPassword, $user['password_hash'])) {
        jsonResponse(['error' => 'Current password is incorrect'], 401);
    }
    
    // Hash new password
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password
    $stmt = $db->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id');
    $stmt->bindValue(':password_hash', $newPasswordHash, SQLITE3_TEXT);
    $stmt->bindValue(':id', $userId, SQLITE3_INTEGER);
    $stmt->execute();
    
    $db->close();
    
    jsonResponse(['success' => true, 'message' => 'Password updated successfully']);
} catch (Exception $e) {
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>