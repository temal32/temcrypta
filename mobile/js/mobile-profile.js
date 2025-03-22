/**
 * Mobile Messenger App
 * Profile Page Script
 */
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const exportKeyBtn = document.getElementById('export-key-btn');
    const importKeyBtn = document.getElementById('import-key-btn');
    const deleteConversationsBtn = document.getElementById('delete-conversations-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const keyStatus = document.getElementById('key-status');
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordStrengthBar = document.getElementById('password-strength-bar');
    
    // Confirmation modal elements
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmProceed = document.getElementById('confirm-proceed');
    const closeModalBtn = document.querySelector('.close-button');
    
    // User data
    const userData = document.getElementById('user-data');
    const currentUserId = userData.dataset.userId;
    const currentUsername = userData.dataset.username;
    
    // Initialize
    init();
    
    async function init() {
        // Check for private key in local storage
        const privateKeyData = localStorage.getItem('privateKey');
        if (privateKeyData) {
            try {
                // Import key to verify it's valid
                const privateKey = await importPrivateKeyFromJWK(privateKeyData);
                keyStatus.innerHTML = '<i class="fas fa-check-circle"></i> <span>Encryption key loaded</span>';
                keyStatus.classList.add('success');
            } catch (error) {
                keyStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Invalid encryption key</span>';
                keyStatus.classList.add('error');
                console.error('Key validation error:', error);
            }
        } else {
            keyStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>No encryption key found</span>';
            keyStatus.classList.add('error');
        }
        
        // Password strength meter
        setupPasswordStrengthMeter();
    }
    
    function setupPasswordStrengthMeter() {
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            // Reset strength bar
            passwordStrengthBar.style.width = '0%';
            passwordStrengthBar.className = 'strength-bar';
            
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
            passwordStrengthBar.style.width = strength + '%';
            
            if (strength < 50) {
                passwordStrengthBar.classList.add('weak');
            } else if (strength < 75) {
                passwordStrengthBar.classList.add('medium');
            } else {
                passwordStrengthBar.classList.add('strong');
            }
        });
    }
    
    // Change password form
    changePasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Basic validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('All fields are required', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }
        
        try {
            showToast('Updating password...', 'info');
            
            const response = await fetch('../api/change_password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Clear form
            changePasswordForm.reset();
            passwordStrengthBar.style.width = '0%';
            
            showToast('Password updated successfully', 'success');
        } catch (error) {
            console.error('Error changing password:', error);
            showToast(error.message || 'Failed to update password', 'error');
        }
    });
    
    // Export private key
    exportKeyBtn.addEventListener('click', function() {
        const privateKeyData = localStorage.getItem('privateKey');
        
        if (!privateKeyData) {
            showToast('No private key found to export', 'error');
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
    });
    
    // Import private key
    importKeyBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        
        input.onchange = async e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = async function(event) {
                try {
                    const privateKeyData = event.target.result;
                    
                    // Try to parse it to make sure it's valid
                    try {
                        const parsedKey = JSON.parse(privateKeyData);
                        if (!parsedKey.d || !parsedKey.n || !parsedKey.e) {
                            throw new Error("Invalid key format");
                        }
                    } catch (parseError) {
                        throw new Error("Invalid key file format");
                    }
                    
                    localStorage.setItem('privateKey', privateKeyData);
                    
                    try {
                        await importPrivateKeyFromJWK(privateKeyData);
                        keyStatus.innerHTML = '<i class="fas fa-check-circle"></i> <span>Encryption key loaded</span>';
                        keyStatus.className = 'key-status success';
                        showToast('Private key imported successfully', 'success');
                    } catch (importError) {
                        throw new Error("Key couldn't be imported: " + importError.message);
                    }
                } catch (error) {
                    keyStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Invalid encryption key</span>';
                    keyStatus.className = 'key-status error';
                    showToast('Error importing key: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    });
    
    // Delete all conversations
    deleteConversationsBtn.addEventListener('click', function() {
        showConfirmModal(
            'Delete All Conversations',
            'Are you sure you want to delete all your conversations? This cannot be undone.',
            deleteAllConversations
        );
    });
    
    // Delete account
    deleteAccountBtn.addEventListener('click', function() {
        showConfirmModal(
            'Delete Account',
            'Are you sure you want to permanently delete your account? This will delete all your data and cannot be undone.',
            deleteAccount
        );
    });
    
    // Logout
    logoutBtn.addEventListener('click', async function() {
        try {
            await fetch('../api/logout.php');
            window.location.href = 'login.php';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to logout', 'error');
        }
    });
    
    // Show confirmation modal
    function showConfirmModal(title, message, callback) {
        confirmTitle.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${title}`;
        confirmMessage.textContent = message;
        confirmProceed.onclick = callback;
        confirmModal.classList.add('active');
    }
    
    // Close modal events
    confirmCancel.addEventListener('click', function() {
        confirmModal.classList.remove('active');
    });
    
    closeModalBtn.addEventListener('click', function() {
        confirmModal.classList.remove('active');
    });
    
    // Delete all conversations
    async function deleteAllConversations() {
        try {
            showToast('Deleting conversations...', 'info');
            
            const response = await fetch('../api/delete_all_conversations.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            confirmModal.classList.remove('active');
            showToast(`Successfully deleted ${data.count} conversations`, 'success');
        } catch (error) {
            console.error('Error deleting conversations:', error);
            showToast(error.message || 'Failed to delete conversations', 'error');
        }
    }
    
    // Delete account
    async function deleteAccount() {
        try {
            showToast('Deleting account...', 'info');
            
            const response = await fetch('../api/delete_account.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Clear local storage
            localStorage.removeItem('privateKey');
            
            // Redirect to login page
            window.location.href = 'login.php';
        } catch (error) {
            console.error('Error deleting account:', error);
            showToast(error.message || 'Failed to delete account', 'error');
        }
    }
    
    // Show toast notification
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
});