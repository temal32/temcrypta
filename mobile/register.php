<?php
// mobile/register.php
session_start();

// If already logged in, redirect to index
if (isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

// Process registration form
$error = '';
$success = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once '../api/config.php';
    
    $username = sanitizeInput($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    $public_key = $_POST['public_key'] ?? '';
    
    // Validate inputs
    if (empty($username) || empty($password) || empty($confirm_password) || empty($public_key)) {
        $error = 'All fields are required.';
    } elseif ($password !== $confirm_password) {
        $error = 'Passwords do not match.';
    } elseif (strlen($password) < 8) {
        $error = 'Password must be at least 8 characters long.';
    } else {
        try {
            $db = getDb();
            
            // Check if username already exists
            $stmt = $db->prepare('SELECT id FROM users WHERE username = :username');
            $stmt->bindValue(':username', $username, SQLITE3_TEXT);
            $result = $stmt->execute();
            
            if ($result->fetchArray()) {
                $error = 'Username already exists.';
            } else {
                // Hash password
                $password_hash = password_hash($password, PASSWORD_DEFAULT);
                
                // Insert new user
                $stmt = $db->prepare('
                    INSERT INTO users (username, password_hash, public_key)
                    VALUES (:username, :password_hash, :public_key)
                ');
                $stmt->bindValue(':username', $username, SQLITE3_TEXT);
                $stmt->bindValue(':password_hash', $password_hash, SQLITE3_TEXT);
                $stmt->bindValue(':public_key', $public_key, SQLITE3_TEXT);
                $stmt->execute();
                
                $success = true;
            }
            
            $db->close();
        } catch (Exception $e) {
            $error = 'An error occurred: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>Register - Temcrypta</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/mobile-style.css">
</head>
<body class="auth-page">
    <div class="auth-wrapper">
        <div class="auth-header">
            <div class="logo-container">
                <i class="fas fa-lock"></i>
            </div>
            <h1>Temcrypta</h1>
            <p>Create a new account</p>
        </div>
        
        <div class="auth-form-container">
            <?php if ($error): ?>
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span><?php echo htmlspecialchars($error); ?></span>
                </div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    <span>Registration successful! You can now <a href="login.php">login</a>.</span>
                </div>
                <div class="key-export-reminder">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>IMPORTANT: Don't forget to export your private key. You'll need it to decrypt messages.</p>
                    <button id="export-key-after-register" class="btn-primary btn-block">
                        <i class="fas fa-download"></i> Export Private Key
                    </button>
                </div>
            <?php else: ?>
                <form method="POST" action="register.php" id="register-form" class="auth-form">
                    <div class="form-group">
                        <div class="input-icon-wrapper">
                            <i class="fas fa-user"></i>
                            <input type="text" id="username" name="username" placeholder="Username" autocomplete="username" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="input-icon-wrapper">
                            <i class="fas fa-lock"></i>
                            <input type="password" id="password" name="password" placeholder="Password" autocomplete="new-password" required>
                        </div>
                        <div class="password-strength-meter">
                            <div class="strength-bar" id="password-strength-bar"></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="input-icon-wrapper">
                            <i class="fas fa-check-circle"></i>
                            <input type="password" id="confirm_password" name="confirm_password" placeholder="Confirm Password" autocomplete="new-password" required>
                        </div>
                    </div>
                    
                    <input type="hidden" id="public_key" name="public_key">
                    
                    <div class="key-status" id="key-status">
                        <div class="key-status-icon">
                            <i class="fas fa-key"></i>
                        </div>
                        <div class="key-status-message">
                            <p>Encryption keys required for secure communication</p>
                        </div>
                    </div>
                    
                    <button type="button" id="generate-keys" class="btn-secondary btn-block">
                        <i class="fas fa-key"></i> Generate Encryption Keys
                    </button>
                    
                    <button type="submit" id="submit-btn" class="btn-primary btn-block" disabled>
                        <i class="fas fa-user-plus"></i> Create Account
                    </button>
                </form>
                
                <div class="auth-links">
                    <p>Already have an account? <a href="login.php">Login</a></p>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="auth-footer">
            <p>End-to-end encrypted messaging</p>
        </div>
    </div>
    
    <!-- Toast notifications container -->
    <div class="toast-container" id="toast-container"></div>
    
    <script src="../js/crypto.js"></script>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const generateKeysBtn = document.getElementById('generate-keys');
        const keyStatus = document.getElementById('key-status');
        const publicKeyInput = document.getElementById('public_key');
        const submitBtn = document.getElementById('submit-btn');
        const passwordInput = document.getElementById('password');
        const strengthBar = document.getElementById('password-strength-bar');
        
        <?php if ($success): ?>
        // Handle export after registration
        document.getElementById('export-key-after-register').addEventListener('click', function() {
            exportPrivateKey();
        });
        <?php else: ?>
        // Password strength meter
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            // Reset strength bar
            strengthBar.style.width = '0%';
            strengthBar.className = 'strength-bar';
            
            if (password.length === 0) {
                return;
            }
            
            // Length check
            if (password.length >= 8) {
                strength += 25;
            }
            
            // Contains lowercase letter
            if (/[a-z]/.test(password)) {
                strength += 25;
            }
            
            // Contains uppercase letter
            if (/[A-Z]/.test(password)) {
                strength += 25;
            }
            
            // Contains number or special character
            if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) {
                strength += 25;
            }
            
            // Update strength meter
            strengthBar.style.width = strength + '%';
            
            if (strength < 50) {
                strengthBar.classList.add('weak');
            } else if (strength < 75) {
                strengthBar.classList.add('medium');
            } else {
                strengthBar.classList.add('strong');
            }
        });
        
        // Generate keys
        generateKeysBtn.addEventListener('click', async function() {
            showLoading(generateKeysBtn, 'Generating...');
            
            try {
                // Generate key pair
                const { publicKey, privateKey } = await generateKeyPair();
                
                // Store private key in browser local storage
                localStorage.setItem('privateKey', privateKey);
                
                // Set public key in the form
                publicKeyInput.value = publicKey;
                
                // Update key status
                keyStatus.className = 'key-status success';
                keyStatus.innerHTML = `
                    <div class="key-status-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="key-status-message">
                        <p>Encryption keys generated successfully!</p>
                    </div>
                `;
                
                // Enable submit button
                submitBtn.disabled = false;
                
                // Show toast
                showToast('Keys generated successfully!', 'success');
                
                // Restore button
                hideLoading(generateKeysBtn, '<i class="fas fa-key"></i> Generate Encryption Keys');
            } catch (error) {
                keyStatus.className = 'key-status error';
                keyStatus.innerHTML = `
                    <div class="key-status-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="key-status-message">
                        <p>Error: ${error.message}</p>
                    </div>
                `;
                
                showToast('Failed to generate keys', 'error');
                hideLoading(generateKeysBtn, '<i class="fas fa-sync"></i> Try Again');
            }
        });
        <?php endif; ?>
        
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-icon">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                </div>
                <div class="toast-message">${message}</div>
            `;
            
            const container = document.getElementById('toast-container');
            container.appendChild(toast);
            
            // Animate in
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            // Remove after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    container.removeChild(toast);
                }, 300);
            }, 3000);
        }
        
        function showLoading(button, text) {
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
        
        function hideLoading(button, html) {
            button.disabled = false;
            button.innerHTML = html;
        }
        
        function exportPrivateKey() {
            const privateKeyData = localStorage.getItem('privateKey');
            
            if (!privateKeyData) {
                showToast('No private key found to export.', 'error');
                return;
            }
            
            // Create a download of the key
            const blob = new Blob([privateKeyData], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'messenger_private_key.json';
            a.click();
            
            URL.revokeObjectURL(url);
            showToast('Private key exported. Keep this file secure!', 'success');
        }
    });
    </script>
</body>
</html>