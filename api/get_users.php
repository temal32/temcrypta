<?php
// api/get_users.php
require_once 'config.php';

if (!isLoggedIn()) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$search = $_GET['search'] ?? '';
$userId = getCurrentUserId();

try {
    $db = getDb();
    
    // Get users matching search term excluding current user
    $stmt = $db->prepare('
        SELECT id, username, public_key
        FROM users
        WHERE id != :user_id AND (username LIKE :search OR :search = "")
        ORDER BY username
    ');
    $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
    $stmt->bindValue(':search', '%' . $search . '%', SQLITE3_TEXT);
    $result = $stmt->execute();
    
    $users = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $users[] = $row;
    }
    
    $db->close();
    
    jsonResponse(['users' => $users]);
} catch (Exception $e) {
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>