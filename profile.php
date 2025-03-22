<?php
// profile.php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

// Get user data
require_once 'api/config.php';
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile - Temcrypta</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <header>
            <h1><i class="fas fa-lock"></i> Temcrypta</h1>
            <div class="user-info">
                <i class="fas fa-user-circle"></i> <span id="username"><?php echo htmlspecialchars($user['username']); ?></span>
                <a href="index.php" class="nav-link"><i class="fas fa-comments"></i> Messages</a>
                <button id="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </header>
        
        <div class="profile-container">
            <div class="profile-header">
                <h2><i class="fas fa-user-cog"></i> Account Settings</h2>
                <p>Manage your account settings and preferences</p>
            </div>
            
            <div class="profile-card">
                <h3><i class="fas fa-info-circle"></i> Account Information</h3>
                <div class="profile-info">
                    <div class="info-item">
                        <span class="info-label">Username:</span>
                        <span class="info-value"><?php echo htmlspecialchars($user['username']); ?></span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Account Created:</span>
                        <span class="info-value"><?php echo $regDate; ?></span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Encryption Key:</span>
                        <span class="info-value" id="key-status">Checking...</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-card">
                <h3><i class="fas fa-key"></i> Encryption Key Management</h3>
                <p class="profile-info-text">
                    Your private key is stored locally in your browser. Without this key, you cannot decrypt messages.
                    Export your key to a secure location as a backup.
                </p>
                <div class="button-group">
                    <button id="export-key-btn" class="btn-primary"><i class="fas fa-download"></i> Export Private Key</button>
                    <button id="import-key-btn" class="btn-secondary"><i class="fas fa-upload"></i> Import Private Key</button>
                </div>
            </div>
            
            <div class="profile-card">
                <h3><i class="fas fa-lock"></i> Change Password</h3>
                <p class="profile-info-text">
                    Regularly updating your password helps keep your account secure. Choose a strong password that you don't use for other services.
                </p>
                <form id="change-password-form">
                    <div class="form-group">
                        <label for="current-password"><i class="fas fa-key"></i> Current Password</label>
                        <input type="password" id="current-password" name="current_password" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="new-password"><i class="fas fa-lock"></i> New Password</label>
                        <input type="password" id="new-password" name="new_password" required>
                        <div class="password-strength-meter">
                            <div class="strength-bar" id="password-strength-bar"></div>
                        </div>
                        <small class="password-hint">Password must be at least 8 characters long</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm-password"><i class="fas fa-check-circle"></i> Confirm New Password</label>
                        <input type="password" id="confirm-password" name="confirm_password" required>
                    </div>
                    
                    <div id="password-status" class="password-status hidden"></div>
                    
                    <button type="submit" id="change-password-btn" class="btn-primary"><i class="fas fa-save"></i> Update Password</button>
                </form>
            </div>
            
            <div class="profile-card danger-zone">
                <h3><i class="fas fa-exclamation-triangle"></i> Danger Zone</h3>
                <p class="profile-info-text">
                    These actions are irreversible. Please proceed with caution.
                </p>
                <div class="button-group">
                    <button id="delete-conversations-btn" class="btn-danger"><i class="fas fa-trash"></i> Delete All Conversations</button>
                    <button id="delete-account-btn" class="btn-danger"><i class="fas fa-user-times"></i> Delete Account</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Confirmation Modal -->
    <div id="confirm-modal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="confirm-title"><i class="fas fa-question-circle"></i> Confirm Action</h2>
            <p id="confirm-message">Are you sure you want to proceed with this action?</p>
            
            <div class="button-group">
                <button id="confirm-cancel" class="btn-secondary"><i class="fas fa-times"></i> Cancel</button>
                <button id="confirm-proceed" class="btn-danger"><i class="fas fa-check"></i> Proceed</button>
            </div>
        </div>
    </div>
    
    <!-- Store user data in data attribute for JavaScript access -->
    <div id="user-data" data-user-id="<?php echo $_SESSION['user_id']; ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>" data-public-key="<?php echo htmlspecialchars($user['public_key']); ?>"></div>

    <!-- Load scripts -->
    <script src="js/crypto.js"></script>
    <script src="js/profile.js"></script>
</body>
</html>