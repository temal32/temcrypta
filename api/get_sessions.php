<?php
// api/get_sessions.php
require_once 'config.php';

if (!isLoggedIn()) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$userId = getCurrentUserId();
$currentSessionToken = getCurrentSessionToken();

try {
    $db = getDb();
    
    // Get all active sessions for the user
    $stmt = $db->prepare('
        SELECT id, user_agent, ip_address, 
               created_at, datetime(last_activity, "localtime") as last_activity,
               (session_token = :current_token) as is_current
        FROM sessions 
        WHERE user_id = :user_id
        ORDER BY is_current DESC, last_activity DESC
    ');
    $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
    $stmt->bindValue(':current_token', $currentSessionToken, SQLITE3_TEXT);
    $result = $stmt->execute();
    
    $sessions = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        // Convert boolean value
        $row['is_current'] = (bool)$row['is_current'];
        $sessions[] = $row;
    }
    
    $db->close();
    
    jsonResponse(['success' => true, 'sessions' => $sessions]);
} catch (Exception $e) {
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>