<?php
// api/delete_conversation.php
require_once 'config.php';

if (!isLoggedIn()) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

// Get conversation ID
$data = json_decode(file_get_contents('php://input'), true);
$conversationId = $data['conversation_id'] ?? null;

if (!$conversationId) {
    jsonResponse(['error' => 'Missing conversation ID'], 400);
}

$userId = getCurrentUserId();

try {
    $db = getDb();
    
    // Start transaction
    $db->exec('BEGIN TRANSACTION');
    
    // Check if user is part of the conversation
    $stmt = $db->prepare('
        SELECT 1 FROM conversation_members 
        WHERE conversation_id = :conversation_id AND user_id = :user_id
    ');
    $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    
    if (!$result->fetchArray()) {
        $db->exec('ROLLBACK');
        jsonResponse(['error' => 'You are not a member of this conversation'], 403);
    }
    
    // Delete all messages
    $stmt = $db->prepare('
        DELETE FROM messages 
        WHERE conversation_id = :conversation_id
    ');
    $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $stmt->execute();
    
    // Delete all members
    $stmt = $db->prepare('
        DELETE FROM conversation_members 
        WHERE conversation_id = :conversation_id
    ');
    $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $stmt->execute();
    
    // Delete the conversation
    $stmt = $db->prepare('
        DELETE FROM conversations 
        WHERE id = :conversation_id
    ');
    $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $stmt->execute();
    
    // Commit transaction
    $db->exec('COMMIT');
    
    jsonResponse(['success' => true]);
} catch (Exception $e) {
    // Rollback on error
    if (isset($db)) {
        $db->exec('ROLLBACK');
    }
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>