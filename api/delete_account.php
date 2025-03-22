<?php
// api/delete_account.php
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
    
    if (!empty($conversationIds)) {
        // Delete user's messages
        $stmt = $db->prepare('
            DELETE FROM messages 
            WHERE sender_id = :user_id
        ');
        $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
        $stmt->execute();
        
        // Remove user from all conversations
        $stmt = $db->prepare('
            DELETE FROM conversation_members 
            WHERE user_id = :user_id
        ');
        $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
        $stmt->execute();
        
        // Check each conversation to see if it's empty
        foreach ($conversationIds as $conversationId) {
            $stmt = $db->prepare('
                SELECT COUNT(*) as count FROM conversation_members 
                WHERE conversation_id = :conversation_id
            ');
            $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
            $result = $stmt->execute();
            $row = $result->fetchArray(SQLITE3_ASSOC);
            
            // If no members left, delete the conversation
            if ($row['count'] == 0) {
                // Delete all messages from conversation
                $stmt = $db->prepare('
                    DELETE FROM messages 
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
            }
        }
    }
    
    // Finally, delete the user
    $stmt = $db->prepare('
        DELETE FROM users 
        WHERE id = :user_id
    ');
    $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
    $stmt->execute();
    
    // Commit transaction
    $db->exec('COMMIT');
    
    // Destroy session
    session_destroy();
    
    jsonResponse(['success' => true]);
} catch (Exception $e) {
    // Rollback on error
    if (isset($db)) {
        $db->exec('ROLLBACK');
    }
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>