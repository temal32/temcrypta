<?php
// api/get_messages.php
require_once 'config.php';

if (!isLoggedIn()) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$conversationId = $_GET['conversation_id'] ?? null;
if (!$conversationId) {
    jsonResponse(['error' => 'Missing conversation ID'], 400);
}

// Add a last_id parameter to only fetch newer messages
$lastId = isset($_GET['last_id']) ? (int)$_GET['last_id'] : 0;

$userId = getCurrentUserId();

try {
    $db = getDb();
    
    // Verify user is part of this conversation
    $stmt = $db->prepare('
        SELECT 1 FROM conversation_members 
        WHERE conversation_id = :conversation_id AND user_id = :user_id
    ');
    $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    
    if (!$result->fetchArray()) {
        jsonResponse(['error' => 'You are not a member of this conversation'], 403);
    }
    
    // Get messages newer than last_id
    $stmt = $db->prepare('
        SELECT m.id, m.sender_id, u.username as sender_name, m.encrypted_content, 
               m.iv, m.encrypted_keys, datetime(m.created_at, "localtime") as created_at 
        FROM messages m 
        JOIN users u ON m.sender_id = u.id 
        WHERE m.conversation_id = :conversation_id AND m.id > :last_id
        ORDER BY m.created_at ASC
    ');
    $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $stmt->bindValue(':last_id', $lastId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    
    $messages = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $messages[] = $row;
    }
    
    $db->close();
    
    jsonResponse(['messages' => $messages]);
} catch (Exception $e) {
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>