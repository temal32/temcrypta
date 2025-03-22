<?php
// mobile/login.php
session_start();

// If already logged in, redirect to index
if (isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

// Process login form
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once '../api/config.php';
    
    $username = sanitizeInput($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        $error = 'Please enter both username and password.';
    } else {
        $db = getDb();
        $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE username = :username');
        $stmt->bindValue(':username', $username, SQLITE3_TEXT);
        $result = $stmt->execute();
        $user = $result->fetchArray(SQLITE3_ASSOC);
        
        if ($user && password_verify($password, $user['password_hash'])) {
            // Login successful
            $_SESSION['user_id'] = $user['id'];
            header('Location: index.php');
            exit;
        } else {
            $error = 'Invalid username or password.';
        }
        
        $db->close();
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
    <title>Login - Temcrypta</title>
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
            <p>Login to continue</p>
        </div>
        
        <div class="auth-form-container">
            <?php if ($error): ?>
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span><?php echo htmlspecialchars($error); ?></span>
                </div>
            <?php endif; ?>
            
            <form method="POST" action="login.php" class="auth-form">
                <div class="form-group">
                    <div class="input-icon-wrapper">
                        <i class="fas fa-user"></i>
                        <input type="text" id="username" name="username" placeholder="Username" autocomplete="username" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <div class="input-icon-wrapper">
                        <i class="fas fa-lock"></i>
                        <input type="password" id="password" name="password" placeholder="Password" autocomplete="current-password" required>
                    </div>
                </div>
                
                <button type="submit" class="btn-primary btn-block">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
            </form>
            
            <div class="auth-links">
                <p>Don't have an account? <a href="register.php">Register</a></p>
            </div>
            
            <div class="key-import-section">
                <p><i class="fas fa-info-circle"></i> Logging in from a new device?</p>
                <button id="login-import-key" class="btn-secondary btn-block">
                    <i class="fas fa-file-import"></i> Import Private Key
                </button>
            </div>
        </div>
        
        <div class="auth-footer">
            <p>End-to-end encrypted messaging</p>
        </div>
    </div>
    
    <!-- Toast notifications container -->
    <div class="toast-container" id="toast-container"></div>
    
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const importBtn = document.getElementById('login-import-key');
        
        importBtn.addEventListener('click', function() {
            importPrivateKey();
        });
        
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
        
        function importPrivateKey() {
            const input = document.createElement('input');
            input.type = 'file';
            
            input.onchange = e => {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    try {
                        const privateKeyData = event.target.result;
                        localStorage.setItem('privateKey', privateKeyData);
                        showToast('Private key imported successfully!', 'success');
                    } catch (error) {
                        showToast('Error importing key: ' + error.message, 'error');
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
        }
    });
    </script>
</body>
</html>