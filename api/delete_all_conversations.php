<?php
// api/delete_all_conversations.php
require_once 'config.php';

if (!isLoggedIn()) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$userId = getCurrentUserId();

try {
    $db = getDb();
    
    // Start transaction
    $db->exec('BEGIN TRANSACTION');
    
    // Get all conversations where the user is a member
    $stmt = $db->prepare('
        SELECT conversation_id FROM conversation_members 
        WHERE user_id = :user_id
    ');
    $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    
    $conversationIds = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $conversationIds[] = $row['conversation_id'];
    }
    
    $count = count($conversationIds);
    
    if ($count > 0) {
        // Delete messages from all conversations
        foreach ($conversationIds as $conversationId) {
            $stmt = $db->prepare('
                DELETE FROM messages 
                WHERE conversation_id = :conversation_id
            ');
            $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
            $stmt->execute();
            
            // Delete user from conversation members
            $stmt = $db->prepare('
                DELETE FROM conversation_members 
                WHERE conversation_id = :conversation_id AND user_id = :user_id
            ');
            $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
            $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
            $stmt->execute();
            
            // Check if conversation is now empty
            $stmt = $db->prepare('
                SELECT COUNT(*) as count FROM conversation_members 
                WHERE conversation_id = :conversation_id
            ');
            $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
            $result = $stmt->execute();
            $row = $result->fetchArray(SQLITE3_ASSOC);
            
            // If no members left, delete the conversation
            if ($row['count'] == 0) {
                $stmt = $db->prepare('
                    DELETE FROM conversations 
                    WHERE id = :conversation_id
                ');
                $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
                $stmt->execute();
            }
        }
    }
    
    // Commit transaction
    $db->exec('COMMIT');
    
    jsonResponse(['success' => true, 'count' => $count]);
} catch (Exception $e) {
    // Rollback on error
    if (isset($db)) {
        $db->exec('ROLLBACK');
    }
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>