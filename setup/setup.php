<?php
// setup/setup.php
// Database setup script
$dbDir = __DIR__ . '/../db';
$dbPath = $dbDir . '/messenger.db';

// Create database directory if it doesn't exist
if (!file_exists($dbDir)) {
    mkdir($dbDir, 0770, true);
    // Ensure www-data has ownership (doesn't work properly)
    chown($dbDir, 'www-data');
    chgrp($dbDir, 'www-data');
}

// Connect to SQLite database
try {
    $db = new SQLite3($dbPath);
    
    // Create users table
    $db->exec('
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        public_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    
    // Create conversations table
    $db->exec('
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        is_group BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    
    // Create conversation_members table
    $db->exec('
    CREATE TABLE IF NOT EXISTS conversation_members (
        conversation_id INTEGER,
        user_id INTEGER,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (conversation_id, user_id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )');
    
    // Create messages table with encrypted_keys column
    $db->exec('
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        sender_id INTEGER,
        encrypted_content TEXT NOT NULL,
        iv TEXT NOT NULL,
        encrypted_keys TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        FOREIGN KEY (sender_id) REFERENCES users(id)
    )');
    
    echo "Database setup completed successfully.";
    $db->close();
} catch (Exception $e) {
    echo "Error setting up database: " . $e->getMessage();
}
?>