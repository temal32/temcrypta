<?php
// api/check_session.php
require_once 'config.php';

if (!isLoggedIn()) {
    jsonResponse(['error' => 'Unauthorized'], 401);
} else {
    // Get user data
    $db = getDb();
    $stmt = $db->prepare('SELECT id, username, public_key FROM users WHERE id = :id');
    $stmt->bindValue(':id', $_SESSION['user_id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $user = $result->fetchArray(SQLITE3_ASSOC);
    $db->close();
    
    if (!$user) {
        // Invalid user in session
        session_destroy();
        jsonResponse(['error' => 'Invalid user session'], 401);
    }
    
    jsonResponse([
        'loggedIn' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username']
        ]
    ]);
}
?>