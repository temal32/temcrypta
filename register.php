<?php
// register.php
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
    require_once 'api/config.php';
    
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - Temcrypta</title>
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
            <h2>Create New Account</h2>
            
            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="success">
                    <i class="fas fa-check-circle"></i> Registration successful! You can now <a href="login.php">login</a>.
                </div>
            <?php else: ?>
                <form method="POST" action="register.php" id="register-form">
                    <div class="form-group">
                        <label for="username"><i class="fas fa-user"></i> Username</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="password"><i class="fas fa-lock"></i> Password</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm_password"><i class="fas fa-check-circle"></i> Confirm Password</label>
                        <input type="password" id="confirm_password" name="confirm_password" required>
                    </div>
                    
                    <input type="hidden" id="public_key" name="public_key">
                    
                    <button type="button" id="generate-keys" class="btn-secondary"><i class="fas fa-key"></i> Generate Encryption Keys</button>
                    <div id="key-status" class="hidden">Keys generated successfully!</div>
                    
                    <button type="submit" id="submit-btn" class="btn-primary" disabled><i class="fas fa-user-plus"></i> Create Account</button>
                </form>
                
                <p class="auth-link">Already have an account? <a href="login.php">Login</a></p>
                
                <script src="js/crypto.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const generateKeysBtn = document.getElementById('generate-keys');
        const keyStatus = document.getElementById('key-status');
        const publicKeyInput = document.getElementById('public_key');
        const submitBtn = document.getElementById('submit-btn');
        
        // Force hide the key status at the start
        keyStatus.style.display = 'none';
        keyStatus.classList.add('hidden');
        
        generateKeysBtn.addEventListener('click', async function() {
            generateKeysBtn.disabled = true;
            generateKeysBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            
            try {
                // Generate key pair
                const { publicKey, privateKey } = await generateKeyPair();
                
                // Test the key by importing it to make sure it's valid
                try {
                    const testImport = await window.crypto.subtle.importKey(
                        "jwk",
                        JSON.parse(privateKey),
                        {
                            name: "RSA-OAEP",
                            hash: "SHA-256",
                        },
                        false,
                        ["decrypt"]
                    );
                    console.log("Key validation successful");
                } catch (testError) {
                    throw new Error("Generated key failed validation: " + testError.message);
                }
                
                // Store private key in browser local storage
                localStorage.setItem('privateKey', privateKey);
                
                // Set public key in the form
                publicKeyInput.value = publicKey;
                
                // Show success message
                keyStatus.innerHTML = '<i class="fas fa-check-circle"></i> Keys generated successfully! IMPORTANT: Save your private key somewhere safe.';
                keyStatus.classList.remove('hidden');
                keyStatus.style.display = 'flex';
                
                // Enable submit button
                submitBtn.disabled = false;
                
                // Restore button text with icon
                generateKeysBtn.innerHTML = '<i class="fas fa-key"></i> Generate Encryption Keys';
            } catch (error) {
                keyStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error generating keys: ' + error.message;
                keyStatus.classList.remove('hidden');
                keyStatus.style.display = 'flex';
                generateKeysBtn.disabled = false;
                generateKeysBtn.innerHTML = '<i class="fas fa-sync"></i> Try Again';
            }
        });
    });
                </script>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>