<?php
// mobile/index.php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

// Get user data
require_once '../api/config.php';
$db = getDb();
$stmt = $db->prepare('SELECT username, public_key FROM users WHERE id = :id');
$stmt->bindValue(':id', $_SESSION['user_id'], SQLITE3_INTEGER);
$result = $stmt->execute();
$user = $result->fetchArray(SQLITE3_ASSOC);
$db->close();

if (!$user) {
    // Invalid user session
    session_destroy();
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>Temcrypta</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/mobile-style.css">
</head>
<body>
    <script>
    // Check if private key exists
    document.addEventListener('DOMContentLoaded', function() {
        const privateKey = localStorage.getItem('privateKey');
        if (!privateKey) {
            // No private key found
            showKeyPrompt();
        }
    });
    
    function showKeyPrompt() {
        const overlay = document.createElement('div');
        overlay.className = 'key-prompt-overlay';
        
        const prompt = document.createElement('div');
        prompt.className = 'key-prompt';
        prompt.innerHTML = `
            <div class="key-prompt-header">
                <i class="fas fa-key"></i>
                <h2>Encryption Key Required</h2>
            </div>
            <p>No encryption key found. You need a key to send or read messages.</p>
            <div class="key-prompt-actions">
                <button id="import-key-now" class="btn-primary"><i class="fas fa-file-import"></i> Import Key</button>
                <button id="generate-key-now" class="btn-secondary"><i class="fas fa-plus-circle"></i> Generate New Key</button>
                <button id="dismiss-key-prompt" class="btn-tertiary">Continue Without Key</button>
            </div>
        `;
        
        overlay.appendChild(prompt);
        document.body.appendChild(overlay);
        
        document.getElementById('import-key-now').addEventListener('click', function() {
            importPrivateKey();
            overlay.remove();
        });
        
        document.getElementById('generate-key-now').addEventListener('click', async function() {
            try {
                const { publicKey, privateKey } = await generateKeyPair();
                localStorage.setItem('privateKey', privateKey);
                
                // Update public key on server
                const response = await fetch('../api/update_public_key.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ public_key: publicKey })
                });
                
                const data = await response.json();
                if (data.success) {
                    showToast('Key generated successfully!', 'success');
                } else {
                    showToast('Error updating public key on server', 'error');
                }
            } catch (error) {
                showToast('Error generating keys: ' + error.message, 'error');
            }
            overlay.remove();
        });
        
        document.getElementById('dismiss-key-prompt').addEventListener('click', function() {
            overlay.remove();
        });
    }
    </script>
    
    <!-- App Shell -->
    <div class="app-container">
        <!-- App header with slide menu button -->
        <header class="app-header">
            <button id="menu-toggle" class="menu-toggle">
                <i class="fas fa-bars"></i>
            </button>
            <h1><i class="fas fa-lock"></i> Temcrypta</h1>
            <button id="profile-button" class="profile-button">
                <i class="fas fa-user-circle"></i>
            </button>
        </header>
        
        <!-- Side menu panel -->
        <div class="side-menu">
            <div class="user-panel">
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="user-info">
                    <h3 id="user-name"><?php echo htmlspecialchars($user['username']); ?></h3>
                    <span class="status"><i class="fas fa-circle"></i> Online</span>
                </div>
            </div>
            
            <nav class="menu-nav">
                <a href="#" class="nav-item active" data-screen="chats">
                    <i class="fas fa-comments"></i>
                    <span>Chats</span>
                </a>
                <a href="#" class="nav-item" data-screen="new-chat">
                    <i class="fas fa-plus-circle"></i>
                    <span>New Chat</span>
                </a>
                <a href="profile.php" class="nav-item">
                    <i class="fas fa-user-cog"></i>
                    <span>Profile</span>
                </a>
                <a href="#" class="nav-item" id="export-key-btn">
                    <i class="fas fa-key"></i>
                    <span>Export Key</span>
                </a>
                <a href="#" class="nav-item" id="import-key-btn">
                    <i class="fas fa-file-import"></i>
                    <span>Import Key</span>
                </a>
                <a href="#" class="nav-item" id="logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                </a>
            </nav>
            
            <div class="app-info">
                <p>Temcrypta</p>
                <p>End-to-end encrypted</p>
            </div>
        </div>
        
        <!-- Overlay for side menu -->
        <div class="side-menu-overlay"></div>
        
        <!-- Main Content Area -->
        <main class="app-content">
            <!-- Chats screen -->
            <div class="screen active" id="chats-screen">
                <div class="search-container">
                    <div class="search-input">
                        <i class="fas fa-search"></i>
                        <input type="text" id="search-chats" placeholder="Search conversations...">
                    </div>
                </div>
                
                <div class="conversations-list" id="conversations-list">
                    <!-- Conversations will be loaded here -->
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                </div>
                
                <button id="fab-new-chat" class="fab">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            
            <!-- New Chat screen -->
            <div class="screen" id="new-chat-screen">
                <div class="screen-header">
                    <button class="back-button" data-target="chats">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2>New Conversation</h2>
                </div>
                
                <div class="search-container">
                    <div class="search-input">
                        <i class="fas fa-search"></i>
                        <input type="text" id="search-users" placeholder="Search users...">
                    </div>
                </div>
                
                <div class="users-list" id="users-list">
                    <!-- Users will be loaded here -->
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                </div>
                
                <div class="selected-users" id="selected-users">
                    <!-- Selected users will appear here -->
                </div>
                
                <div class="action-bar">
                    <button id="create-group-toggle" class="btn-secondary">
                        <i class="fas fa-users"></i> Create Group
                    </button>
                    <button id="start-conversation" class="btn-primary" disabled>
                        <i class="fas fa-comment"></i> Start Chat
                    </button>
                </div>
                
                <div class="group-name-input hidden">
                    <input type="text" id="group-name" placeholder="Enter group name...">
                </div>
            </div>
            
            <!-- Chat screen -->
            <div class="screen" id="chat-screen">
                <div class="chat-header">
                    <button class="back-button" data-target="chats">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="chat-info" id="chat-info">
                        <!-- Chat info will be loaded here -->
                    </div>
                    <button class="chat-menu-button" id="chat-menu-button">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                
                <div class="messages-container" id="messages-container">
                    <!-- Messages will be loaded here -->
                </div>
                
                <div class="message-composer">
                    <textarea id="message-input" placeholder="Type a message..." rows="1"></textarea>
                    <button id="send-message" class="send-button">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </main>
    </div>
    
    <!-- Dropdown menu for chat options -->
    <div class="dropdown-menu" id="chat-options-menu">
        <div class="dropdown-item" id="view-info-btn">
            <i class="fas fa-info-circle"></i> Chat Info
        </div>
        <div class="dropdown-item danger" id="delete-chat-btn">
            <i class="fas fa-trash"></i> Delete Chat
        </div>
    </div>
    
    <!-- Chat Info Modal -->
    <div class="modal" id="chat-info-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-info-circle"></i> <span id="modal-title">Chat Information</span></h2>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body" id="chat-info-content">
                <!-- Chat info will be loaded here -->
            </div>
        </div>
    </div>
    
    <!-- Toast notifications container -->
    <div class="toast-container" id="toast-container"></div>
    
    <!-- User data for JavaScript -->
    <div id="user-data" data-user-id="<?php echo $_SESSION['user_id']; ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>" data-public-key="<?php echo htmlspecialchars($user['public_key']); ?>"></div>

    <!-- Load scripts -->
    <script src="../js/crypto.js"></script>
    <script src="js/mobile-crypto.js"></script>
    <script src="js/mobile-app.js"></script>
</body>
</html>