<?php
// api/update_group_name.php
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
$name = $data['name'] ?? null;

if (!$conversationId) {
    jsonResponse(['error' => 'Missing conversation ID'], 400);
}

if (!$name || trim($name) === '') {
    jsonResponse(['error' => 'Group name cannot be empty'], 400);
}

$userId = getCurrentUserId();

try {
    $db = getDb();
    
    // Check if user is part of the conversation
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
    
    // Check if conversation is a group
    $stmt = $db->prepare('
        SELECT is_group FROM conversations 
        WHERE id = :conversation_id
    ');
    $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    
    if (!$row || !$row['is_group']) {
        jsonResponse(['error' => 'Cannot rename a non-group conversation'], 400);
    }
    
    // Update the group name
    $stmt = $db->prepare('
        UPDATE conversations 
        SET name = :name 
        WHERE id = :conversation_id
    ');
    $stmt->bindValue(':name', $name, SQLITE3_TEXT);
    $stmt->bindValue(':conversation_id', $conversationId, SQLITE3_INTEGER);
    $stmt->execute();
    
    // Get updated conversation details
    $stmt = $db->prepare('
        SELECT c.id, c.name, c.is_group, 
               datetime(c.created_at, "localtime") as created_at,
               (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) as member_count
        FROM conversations c
        WHERE c.id = :id
    ');
    $stmt->bindValue(':id', $conversationId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $conversation = $result->fetchArray(SQLITE3_ASSOC);
    
    $db->close();
    
    jsonResponse(['success' => true, 'conversation' => $conversation]);
} catch (Exception $e) {
    jsonResponse(['error' => 'An error occurred: ' . $e->getMessage()], 500);
}
?>