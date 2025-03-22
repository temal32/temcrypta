<?php
// login.php
session_start();

// If already logged in, redirect to index
if (isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

// Process login form
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once 'api/config.php';
    
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Temcrypta</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="auth-container">
        <div class="auth-form">
            <h1><i class="fas fa-lock"></i> Temcrypta</h1>
            <h2>Login to Your Account</h2>
            
            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            
            <form method="POST" action="login.php">
                <div class="form-group">
                    <label for="username"><i class="fas fa-user"></i> Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                
                <div class="form-group">
                    <label for="password"><i class="fas fa-key"></i> Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
                
                <button type="submit" class="btn-primary"><i class="fas fa-sign-in-alt"></i> Login</button>
            </form>
            
            <p class="auth-link">Don't have an account? <a href="register.php">Register</a></p>
            
            <div class="key-import-section">
                <p><i class="fas fa-info-circle"></i> Logging in from a new device? Import your private key:</p>
                <button id="login-import-key" class="btn-secondary"><i class="fas fa-file-import"></i> Import Private Key</button>
            </div>
        </div>
    </div>
    
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const importBtn = document.getElementById('login-import-key');
        
        importBtn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            
            input.onchange = e => {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    try {
                        const privateKeyData = event.target.result;
                        localStorage.setItem('privateKey', privateKeyData);
                        alert('Private key imported successfully. You can now log in.');
                    } catch (error) {
                        alert('Error importing private key: ' + error.message);
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
        });
    });
    </script>
</body>
</html>