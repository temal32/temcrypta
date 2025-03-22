<?php
// index.php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: landing.php');
    exit;
}

// Get user data
require_once 'api/config.php';
$db = getDb();
$stmt = $db->prepare('SELECT username, public_key FROM users WHERE id = :id');
$stmt->bindValue(':id', $_SESSION['user_id'], SQLITE3_INTEGER);
$result = $stmt->execute();
$user = $result->fetchArray(SQLITE3_ASSOC);
$db->close();

if (!$user) {
    // Invalid user session
    session_destroy();
    header('Location: landing.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Temcrypta</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <script>
    // Check if private key exists
    document.addEventListener('DOMContentLoaded', function() {
        const privateKey = localStorage.getItem('privateKey');
        if (!privateKey) {
            // No private key found
            const proceed = confirm('No encryption key found in your browser. You will not be able to send or read encrypted messages. Would you like to import a key?');
            if (proceed) {
                // Call the import function
                const input = document.createElement('input');
                input.type = 'file';
                
                input.onchange = e => {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    
                    reader.onload = function(event) {
                        try {
                            const privateKeyData = event.target.result;
                            localStorage.setItem('privateKey', privateKeyData);
                            alert('Private key imported successfully. Reloading page...');
                            window.location.reload();
                        } catch (error) {
                            alert('Error importing private key: ' + error.message);
                        }
                    };
                    
                    reader.readAsText(file);
                };
                
                input.click();
            }
        }
    });
    </script>
    
    <div class="container">
        <header>
            <h1><i class="fas fa-lock"></i> Temcrypta</h1>
            <div class="user-info">
    <i class="fas fa-user-circle"></i> <span id="username"><?php echo htmlspecialchars($user['username']); ?></span>
    <a href="profile.php" class="nav-link"><i class="fas fa-user-cog"></i> Profile</a>
    <button id="export-key-btn" title="Export your private key"><i class="fas fa-key"></i> Export Key</button>
    <button id="import-key-btn" title="Import a private key"><i class="fas fa-file-import"></i> Import Key</button>
    <button id="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
</div>
        </header>
        
        <div class="messenger">
            <div class="sidebar">
                <div class="search-container">
                    <input type="text" id="search-user" placeholder="Search conversations...">
                    <button id="new-conversation"><i class="fas fa-plus"></i> New</button>
                </div>
                <div class="conversations-list" id="conversations-list">
                    <!-- Conversations will be loaded here -->
                </div>
            </div>
            
            <div class="chat-area">
                <div class="chat-header" id="chat-header">
                    <!-- Current conversation info -->
                </div>
                
                <div class="messages" id="messages">
                    <!-- Messages will be loaded here -->
                </div>
                
                <div class="message-input">
                    <textarea id="message-text" placeholder="Type a message..."></textarea>
                    <button id="send-btn"><i class="fas fa-paper-plane"></i> Send</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal for creating new conversation -->
    <div id="new-conversation-modal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-user-plus"></i> Start New Conversation</h2>
            <div id="user-list">
                <!-- User list will be loaded here -->
            </div>
            <button id="start-conversation"><i class="fas fa-comment"></i> Start Conversation</button>
        </div>
    </div>
    
    <!-- Modal for user info -->
    <div id="user-info-modal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-user-circle"></i> User Information</h2>
            <div id="user-info-content" class="user-card">
                <!-- User info will be loaded here -->
            </div>
        </div>
    </div>

    <!-- Modal for group info -->
    <div id="group-info-modal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-users"></i> Group Information</h2>
            <div class="group-info-section">
                <h3>Group Name</h3>
                <div class="edit-group-name">
                    <input type="text" id="group-name-input" placeholder="Enter group name">
                    <button id="save-group-name" class="btn-primary"><i class="fas fa-save"></i> Save</button>
                </div>
            </div>
            <div class="group-info-section">
                <h3>Group Details</h3>
                <div id="group-details" class="info-panel">
                    <!-- Group details will be loaded here -->
                </div>
            </div>
            <div class="group-info-section">
                <h3>Members <span id="member-count" class="count-badge">0</span></h3>
                <div id="group-members" class="members-list">
                    <!-- Group members will be loaded here -->
                </div>
            </div>
        </div>
    </div>

    <!-- Store user public key in data attribute for JavaScript access -->
    <div id="user-data" data-user-id="<?php echo $_SESSION['user_id']; ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>" data-public-key="<?php echo htmlspecialchars($user['public_key']); ?>"></div>

    <!-- Load scripts -->
    <script src="js/crypto.js"></script>
    <script src="js/app.js"></script>
</body>
</html>