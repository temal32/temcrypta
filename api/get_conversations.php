<?php
// api/get_conversations.php
require_once 'config.php';

if (!isLoggedIn()) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$userId = getCurrentUserId();

try {
    $db = getDb();
    
    // Get conversations
    $stmt = $db->prepare('
        SELECT c.id, c.name, c.is_group, 
               datetime(c.created_at, "localtime") as created_at,
               (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) as member_count,
               (SELECT MAX(created_at) FROM messages WHERE conversation_id = c.id) as last_activity
        FROM conversations c
        JOIN conversation_members cm ON c.id = cm.conversation_id
        WHERE cm.user_id = :user_id
        ORDER BY last_activity DESC NULLS LAST, c.created_at DESC
    ');
    $stmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    
    $conversations = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        // Get members of the conversation
        $memberStmt = $db->prepare('
            SELECT u.id, u.username, u.public_key
            FROM users u
            JOIN conversation_members cm ON u.id = cm.user_id
            WHERE cm.conversation_id = :conversation_id
        ');
        $memberStmt->bindValue(':conversation_id', $row['id'], SQLITE3_INTEGER);
        $memberResult = $memberStmt->execute();
        
        $members = [];
        while ($member = $memberResult->fetchArray(SQLITE3_ASSOC)) {
            $members[] = $member;
        }
        
        $row['members'] = $members;
        $conversations[] = $row;
    }
    
    $db->close();
    
    jsonResponse(['conversations' => $conversations]);
} catch (Exception $e) {
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>