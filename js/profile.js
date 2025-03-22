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
    const passwordStatus = document.getElementById('password-status');
    const passwordStrengthBar = document.getElementById('password-strength-bar');
    
    // Modal elements
    const confirmModal = document.getElementById('confirm-modal');
    const closeModalBtn = document.querySelector('.close');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmProceed = document.getElementById('confirm-proceed');
    
    // User data
    const userData = document.getElementById('user-data');
    const currentUserId = userData.dataset.userId;
    const currentUsername = userData.dataset.username;
    
    // Initialize
    init();
    
    function init() {
        // Check for private key in local storage
        const privateKeyData = localStorage.getItem('privateKey');
        if (privateKeyData) {
            keyStatus.innerHTML = '<span class="success-text"><i class="fas fa-check-circle"></i> Private key found in browser storage</span>';
            keyStatus.classList.add('key-found');
        } else {
            keyStatus.innerHTML = '<span class="error-text"><i class="fas fa-exclamation-circle"></i> No private key found</span>';
            keyStatus.classList.add('key-missing');
        }
    }
    
    // Export private key
    exportKeyBtn.addEventListener('click', function() {
        const privateKeyData = localStorage.getItem('privateKey');
        
        if (!privateKeyData) {
            alert('No private key found to export.');
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
        alert('Private key exported. Keep this file secure and never share it.');
    });
    
    // Import private key
    importKeyBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const privateKeyData = event.target.result;
                    localStorage.setItem('privateKey', privateKeyData);
                    alert('Private key imported successfully.');
                    keyStatus.innerHTML = '<span class="success-text"><i class="fas fa-check-circle"></i> Private key imported successfully</span>';
                    keyStatus.classList.remove('key-missing');
                    keyStatus.classList.add('key-found');
                } catch (error) {
                    alert('Error importing private key: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    });
    
    // Password strength meter
    if (newPasswordInput) {
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
    
    // Change password form submission
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Clear previous status
            passwordStatus.innerHTML = '';
            passwordStatus.className = 'password-status hidden';
            
            // Get form values
            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Basic validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                showPasswordStatus('error', 'All fields are required');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showPasswordStatus('error', 'New passwords do not match');
                return;
            }
            
            if (newPassword.length < 8) {
                showPasswordStatus('error', 'New password must be at least 8 characters long');
                return;
            }
            
            // Submit form
            try {
                const response = await fetch('api/change_password.php', {
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
                    showPasswordStatus('error', data.error);
                } else {
                    showPasswordStatus('success', 'Password updated successfully!');
                    
                    // Reset form
                    changePasswordForm.reset();
                    passwordStrengthBar.style.width = '0%';
                    passwordStrengthBar.className = 'strength-bar';
                }
            } catch (error) {
                console.error('Error changing password:', error);
                showPasswordStatus('error', 'An unexpected error occurred. Please try again.');
            }
        });
    }
    
    function showPasswordStatus(type, message) {
        passwordStatus.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
        passwordStatus.className = `password-status ${type}`;
    }
    
    // Delete all conversations
    deleteConversationsBtn.addEventListener('click', function() {
        showConfirmModal(
            'Delete All Conversations', 
            'Are you sure you want to delete all your conversations? This action cannot be undone.',
            deleteAllConversations
        );
    });
    
    // Delete account
    deleteAccountBtn.addEventListener('click', function() {
        showConfirmModal(
            'Delete Account', 
            'Are you sure you want to permanently delete your account? All your data will be lost and this action cannot be undone.',
            deleteAccount
        );
    });
    
    // Logout
    logoutBtn.addEventListener('click', function() {
        window.location.href = 'logout.php';
    });
    
    // Modal functions
    function showConfirmModal(title, message, confirmAction) {
        confirmTitle.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${title}`;
        confirmMessage.textContent = message;
        
        // Store the action for when user confirms
        confirmProceed.onclick = confirmAction;
        
        confirmModal.style.display = 'block';
    }
    
    closeModalBtn.addEventListener('click', function() {
        confirmModal.style.display = 'none';
    });
    
    confirmCancel.addEventListener('click', function() {
        confirmModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });
    
    // Action functions
    async function deleteAllConversations() {
        try {
            const response = await fetch('api/delete_all_conversations.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            confirmModal.style.display = 'none';
            alert(`Successfully deleted ${data.count} conversations.`);
        } catch (error) {
            console.error('Error deleting conversations:', error);
            alert('Failed to delete conversations: ' + error.message);
        }
    }
    
    async function deleteAccount() {
        try {
            const response = await fetch('api/delete_account.php', {
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
            alert('Failed to delete account: ' + error.message);
        }
    }
});