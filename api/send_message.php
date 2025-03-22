<?php
// api/send_message.php
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
$conversationId = $data['conversation_id'] ?? null;
$encryptedContent = $data['encrypted_content'] ?? null;
$iv = $data['iv'] ?? null;
$encryptedKeys = $data['encrypted_keys'] ?? null;

if (!$conversationId || !$encryptedContent || !$iv || !$encryptedKeys) {
    jsonResponse(['error' => 'Missing required fields'], 400);
}

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
    
    // Insert message
    $stmt = $db->prepare('
        INSERT INTO messages (conversation_id, sender_id, encrypted_content, iv, encrypted_keys)
        VALUES (:conversation_id, :sender_id, :encrypted_content, :iv, :encrypted_keys)
    ');
    $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $stmt->bindValue(':sender_id', $userId, SQLITE3_INTEGER);
    $stmt->bindValue(':encrypted_content', $encryptedContent, SQLITE3_TEXT);
    $stmt->bindValue(':iv', $iv, SQLITE3_TEXT);
    $stmt->bindValue(':encrypted_keys', $encryptedKeys, SQLITE3_TEXT);
    $stmt->execute();
    
    $messageId = $db->lastInsertRowID();
    
    // Get message details
    $stmt = $db->prepare('
        SELECT m.id, m.sender_id, u.username as sender_name, m.encrypted_content, m.iv, m.encrypted_keys,
               datetime(m.created_at, "localtime") as created_at 
        FROM messages m 
        JOIN users u ON m.sender_id = u.id 
        WHERE m.id = :id
    ');
    $stmt->bindValue(':id', $messageId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $message = $result->fetchArray(SQLITE3_ASSOC);
    
    $db->close();
    
    jsonResponse(['success' => true, 'message' => $message]);
} catch (Exception $e) {
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>