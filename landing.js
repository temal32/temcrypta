// landing.js
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const originalMessage = document.getElementById('original-message');
    const encryptedMessage = document.getElementById('encrypted-message');
    const receivedMessage = document.getElementById('received-message');
    const encryptionStatus = document.getElementById('encryption-status');
    const steps = [
        document.getElementById('step-1'),
        document.getElementById('step-2'),
        document.getElementById('step-3'),
        document.getElementById('step-4')
    ];
    
    // Animation timing
    const animationDelay = 1000;
    const encryptionDuration = 1000;
    
    // Start animation when page loads
    setTimeout(startEncryptionAnimation, 1500);
    
    // Functions
    function startEncryptionAnimation() {
        // Reset animation
        resetSteps();
        
        // Generate keys step
        activateStep(0);
        encryptionStatus.textContent = "Generating encryption keys...";
        
        setTimeout(() => {
            completeStep(0);
            
            // Encrypt step
            activateStep(1);
            encryptionStatus.textContent = "Encrypting message...";
            
            // Show encryption animation
            originalMessage.style.opacity = "0.5";
            
            // Generate pseudo-encrypted message
            const text = originalMessage.textContent;
            let encrypted = encryptText(text);
            
            // Animate encryption
            let progress = 0;
            const encryptInterval = setInterval(() => {
                progress += 10;
                if (progress >= 100) {
                    clearInterval(encryptInterval);
                    encryptedMessage.textContent = encrypted;
                    encryptedMessage.classList.add('active');
                    completeStep(1);
                    
                    // Transfer step
                    setTimeout(() => {
                        activateStep(2);
                        encryptionStatus.textContent = "Transferring encrypted message...";
                        
                        setTimeout(() => {
                            completeStep(2);
                            
                            // Decrypt step
                            activateStep(3);
                            encryptionStatus.textContent = "Decrypting message...";
                            
                            setTimeout(() => {
                                // Show decryption animation
                                let decryptProgress = 0;
                                receivedMessage.textContent = encrypted;
                                
                                const decryptInterval = setInterval(() => {
                                    decryptProgress += 10;
                                    if (decryptProgress >= 100) {
                                        clearInterval(decryptInterval);
                                        receivedMessage.textContent = text;
                                        receivedMessage.classList.add('active');
                                        completeStep(3);
                                        
                                        encryptionStatus.textContent = "Message delivered and decrypted!";
                                        
                                        // Reset and repeat animation after delay
                                        setTimeout(() => {
                                            encryptedMessage.classList.remove('active');
                                            receivedMessage.classList.remove('active');
                                            originalMessage.style.opacity = "1";
                                            encryptionStatus.textContent = "Waiting to send message...";
                                            startEncryptionAnimation();
                                        }, 5000);
                                    } else {
                                        // Gradually replace parts of the encrypted text with the original
                                        const decryptedPortion = Math.floor((text.length * decryptProgress) / 100);
                                        const remaining = text.length - decryptedPortion;
                                        receivedMessage.textContent = 
                                            text.substring(0, decryptedPortion) + 
                                            encrypted.substring(encrypted.length - remaining);
                                    }
                                }, encryptionDuration / 10);
                            }, animationDelay);
                        }, animationDelay);
                    }, animationDelay);
                } else {
                    // Gradually replace parts of the text with encrypted version
                    const encryptedPortion = Math.floor((text.length * progress) / 100);
                    const partialEncrypted = 
                        encrypted.substring(0, encryptedPortion) + 
                        text.substring(encryptedPortion);
                    encryptedMessage.textContent = partialEncrypted;
                }
            }, encryptionDuration / 10);
        }, animationDelay);
    }
    
    function resetSteps() {
        steps.forEach(step => {
            step.classList.remove('active', 'completed');
        });
        encryptedMessage.textContent = '';
        receivedMessage.textContent = '...';
    }
    
    function activateStep(index) {
        steps[index].classList.add('active');
    }
    
    function completeStep(index) {
        steps[index].classList.remove('active');
        steps[index].classList.add('completed');
    }
    
    function encryptText(text) {
        // This is a visualization of encryption, not actual encryption
        // Convert the text to a "encrypted-looking" format
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let result = '';
        
        // Add a prefix that looks like encryption metadata
        result += '{AES-256-GCM}';
        
        // Generate random "encrypted" text roughly proportional to original length
        for (let i = 0; i < text.length * 1.5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }
    
    // Handle smooth scroll behavior for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for header height
                    behavior: 'smooth'
                });
            }
        });
    });
});