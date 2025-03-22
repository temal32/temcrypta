<?php
// api/config.php
function getDb() {
    $dbPath = realpath(__DIR__ . '/../db/messenger.db');
    
    // If the database doesn't exist yet, make sure the directory is writable
    if (!file_exists($dbPath)) {
        $dbDir = dirname($dbPath);
        if (!is_dir($dbDir)) {
            mkdir($dbDir, 0770, true);
        }
        // Make sure directory is writable
        chmod($dbDir, 0770);
    }
    
    $db = new SQLite3($dbPath);
    $db->enableExceptions(true);
    return $db;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Function to validate and sanitize input
function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// Check if user is logged in
function isLoggedIn() {
    session_start();
    return isset($_SESSION['user_id']);
}

// Get current user ID
function getCurrentUserId() {
    if (isLoggedIn()) {
        return $_SESSION['user_id'];
    }
    return null;
}
?>