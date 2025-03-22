<?php
// api/create_conversation.php
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
$userIds = $data['user_ids'] ?? [];
$name = $data['name'] ?? null;
$isGroup = $data['is_group'] ?? false;

if (empty($userIds)) {
    jsonResponse(['error' => 'No users selected for conversation'], 400);
}

// Add current user to the conversation
$userId = getCurrentUserId();
if (!in_array($userId, $userIds)) {
    $userIds[] = $userId;
}

try {
    $db = getDb();
    
    // Start transaction
    $db->exec('BEGIN TRANSACTION');
    
    // Create conversation
    $stmt = $db->prepare('
        INSERT INTO conversations (name, is_group)
        VALUES (:name, :is_group)
    ');
    $stmt->bindValue(':name', $name, SQLITE3_TEXT);
    $stmt->bindValue(':is_group', $isGroup ? 1 : 0, SQLITE3_INTEGER);
    $stmt->execute();
    
    $conversationId = $db->lastInsertRowID();
    
    // Add members to conversation
    foreach ($userIds as $memberId) {
        $stmt = $db->prepare('
            INSERT INTO conversation_members (conversation_id, user_id)
            VALUES (:conversation_id, :user_id)
        ');
        $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
        $stmt->bindValue(':user_id', $memberId, SQLITE3_INTEGER);
        $stmt->execute();
    }
    
    // Get conversation details
    $stmt = $db->prepare('
        SELECT c.id, c.name, c.is_group, 
               datetime(c.created_at, "localtime") as created_at
        FROM conversations c
        WHERE c.id = :id
    ');
    $stmt->bindValue(':id', $conversationId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $conversation = $result->fetchArray(SQLITE3_ASSOC);
    
    // Get members of the conversation
    $memberStmt = $db->prepare('
        SELECT u.id, u.username, u.public_key
        FROM users u
        JOIN conversation_members cm ON u.id = cm.user_id
        WHERE cm.conversation_id = :conversation_id
    ');
    $memberStmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $memberResult = $memberStmt->execute();
    
    $members = [];
    while ($member = $memberResult->fetchArray(SQLITE3_ASSOC)) {
        $members[] = $member;
    }
    
    $conversation['members'] = $members;
    
    // Commit transaction
    $db->exec('COMMIT');
    
    $db->close();
    
    jsonResponse(['success' => true, 'conversation' => $conversation]);
} catch (Exception $e) {
    // Rollback on error
    if (isset($db)) {
        $db->exec('ROLLBACK');
    }
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>