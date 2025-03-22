<?php
// mobile/profile.php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

// Get user data
require_once '../api/config.php';
$db = getDb();
$stmt = $db->prepare('SELECT id, username, public_key, created_at FROM users WHERE id = :id');
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

// Format the registration date
$regDate = date('F j, Y', strtotime($user['created_at']));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>Profile - Temcrypta</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/mobile-style.css">
</head>
<body>
    <!-- App Shell -->
    <div class="app-container">
        <!-- App header -->
        <header class="app-header">
            <a href="index.php" class="back-button">
                <i class="fas fa-arrow-left"></i>
            </a>
            <h1>Profile</h1>
            <div class="header-spacer"></div>
        </header>
        
        <!-- Main Content Area -->
        <main class="app-content profile-content">
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <h2><?php echo htmlspecialchars($user['username']); ?></h2>
                <p>Account created: <?php echo $regDate; ?></p>
                <div class="key-status" id="key-status">
                    <i class="fas fa-key"></i> <span>Checking encryption key...</span>
                </div>
            </div>
            
            <div class="profile-sections">
                <section class="profile-section">
                    <h3><i class="fas fa-key"></i> Encryption Keys</h3>
                    <p class="section-description">
                        Your private key is stored in your browser. Without this key, you cannot decrypt messages.
                    </p>
                    <div class="section-actions">
                        <button id="export-key-btn" class="btn-primary">
                            <i class="fas fa-download"></i> Export Key
                        </button>
                        <button id="import-key-btn" class="btn-secondary">
                            <i class="fas fa-upload"></i> Import Key
                        </button>
                    </div>
                </section>
                
                <section class="profile-section">
                    <h3><i class="fas fa-lock"></i> Change Password</h3>
                    <form id="change-password-form">
                        <div class="form-group">
                            <div class="input-icon-wrapper">
                                <i class="fas fa-key"></i>
                                <input type="password" id="current-password" name="current_password" placeholder="Current Password" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <div class="input-icon-wrapper">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="new-password" name="new_password" placeholder="New Password" required>
                            </div>
                            <div class="password-strength-meter">
                                <div class="strength-bar" id="password-strength-bar"></div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <div class="input-icon-wrapper">
                                <i class="fas fa-check-circle"></i>
                                <input type="password" id="confirm-password" name="confirm_password" placeholder="Confirm New Password" required>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn-primary btn-block">
                            <i class="fas fa-save"></i> Update Password
                        </button>
                    </form>
                </section>
                
                <section class="profile-section danger-zone">
                    <h3><i class="fas fa-exclamation-triangle"></i> Danger Zone</h3>
                    <p class="section-description">
                        These actions are irreversible. Please proceed with caution.
                    </p>
                    <div class="section-actions">
                        <button id="delete-conversations-btn" class="btn-danger">
                            <i class="fas fa-trash"></i> Delete All Conversations
                        </button>
                        <button id="delete-account-btn" class="btn-danger">
                            <i class="fas fa-user-times"></i> Delete Account
                        </button>
                    </div>
                </section>
                
                <div class="logout-section">
                    <button id="logout-btn" class="btn-secondary btn-block">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        </main>
    </div>
    
    <!-- Confirmation Modal -->
    <div class="modal" id="confirm-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="confirm-title"><i class="fas fa-question-circle"></i> Confirm Action</h2>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <p id="confirm-message">Are you sure you want to proceed with this action?</p>
                
                <div class="modal-actions">
                    <button id="confirm-cancel" class="btn-secondary">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button id="confirm-proceed" class="btn-danger">
                        <i class="fas fa-check"></i> Proceed
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Toast notifications container -->
    <div class="toast-container" id="toast-container"></div>
    
    <!-- User data for JavaScript -->
    <div id="user-data" data-user-id="<?php echo $_SESSION['user_id']; ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>" data-public-key="<?php echo htmlspecialchars($user['public_key']); ?>"></div>

    <!-- Load scripts -->
    <script src="../js/crypto.js"></script>
    <script src="js/mobile-profile.js"></script>
</body>
</html>