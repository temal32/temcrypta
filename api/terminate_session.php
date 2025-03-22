<?php
// api/terminate_session.php
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
$sessionId = $data['session_id'] ?? null;

if (!$sessionId) {
    jsonResponse(['error' => 'Missing session ID'], 400);
}

$userId = getCurrentUserId();
$currentSessionToken = getCurrentSessionToken();

try {
    $db = getDb();
    
    // Check if session belongs to the user and is not the current session
    $stmt = $db->prepare('
        SELECT session_token FROM sessions 
        WHERE id = :session_id AND user_id = :user_id
    ');
    $stmt->bindValue(':session_id', $sessionId, SQLITE3_INTEGER);
    $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $session = $result->fetchArray(SQLITE3_ASSOC);
    
    if (!$session) {
        jsonResponse(['error' => 'Session not found or not authorized'], 404);
    }
    
    if ($session['session_token'] === $currentSessionToken) {
        jsonResponse(['error' => 'Cannot terminate your current session'], 400);
    }
    
    // Terminate the session
    $stmt = $db->prepare('
        DELETE FROM sessions 
        WHERE id = :session_id AND user_id = :user_id
    ');
    $stmt->bindValue(':session_id', $sessionId, SQLITE3_INTEGER);
    $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
    $stmt->execute();
    
    $db->close();
    
    jsonResponse(['success' => true]);
} catch (Exception $e) {
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>