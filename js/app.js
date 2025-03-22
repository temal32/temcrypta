document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const conversationsList = document.getElementById('conversations-list');
    const messagesContainer = document.getElementById('messages');
    const chatHeader = document.getElementById('chat-header');
    const messageInput = document.getElementById('message-text');
    const sendButton = document.getElementById('send-btn');
    const newConversationBtn = document.getElementById('new-conversation');
    const logoutBtn = document.getElementById('logout-btn');
    const searchUser = document.getElementById('search-user');
    const exportKeyBtn = document.getElementById('export-key-btn');
    const importKeyBtn = document.getElementById('import-key-btn');
    
    // Modal elements
    const modal = document.getElementById('new-conversation-modal');
    const closeModalBtn = document.querySelector('.close');
    const userList = document.getElementById('user-list');
    const startConversationBtn = document.getElementById('start-conversation');
    
    // User info modal elements
    const userInfoModal = document.getElementById('user-info-modal');
    const userInfoContent = document.getElementById('user-info-content');
    const userInfoClose = userInfoModal.querySelector('.close');
    
    // Group info modal elements
    const groupInfoModal = document.getElementById('group-info-modal');
    const groupNameInput = document.getElementById('group-name-input');
    const saveGroupNameBtn = document.getElementById('save-group-name');
    const groupDetails = document.getElementById('group-details');
    const groupMembers = document.getElementById('group-members');
    const memberCount = document.getElementById('member-count');
    const groupInfoClose = groupInfoModal.querySelector('.close');
    
    // User data
    const userData = document.getElementById('user-data');
    const currentUserId = parseInt(userData.dataset.userId);
    const currentUsername = userData.dataset.username;
    const currentUserPublicKey = userData.dataset.publicKey;
    
    // Application state
    let privateKey = null;
    let conversations = [];
    let activeConversation = null;
    let selectedUsers = [];
    let pollingInterval = null;
    let lastMessageId = 0;
    
    // Initialize
    init();
    
    async function init() {
        try {
            // Check for private key in local storage
            const storedPrivateKey = localStorage.getItem('privateKey');
            if (!storedPrivateKey) {
                console.warn('Private key not found. Messaging functionality will be limited.');
                
                // Disable message input
                if (messageInput) {
                    messageInput.disabled = true;
                    messageInput.placeholder = 'Import your private key to send messages';
                }
                if (sendButton) {
                    sendButton.disabled = true;
                }
                
                // Still load conversations
                await loadConversations();
                return;
            }
            
            // Import private key
            try {
                console.log("Importing private key...");
                privateKey = await importPrivateKeyFromJWK(storedPrivateKey);
                console.log("Private key imported successfully:", privateKey instanceof CryptoKey);
            } catch (keyError) {
                console.error("Failed to import private key:", keyError);
                alert("Failed to import your encryption key. Please try re-importing your key file.");
                return;
            }
            
            // Load conversations
            await loadConversations();
            
            // Set up message polling
            startPolling();
            
            // Debug key status
            debugKeyStatus();
            
        } catch (error) {
            console.error('Initialization error:', error);
            alert('Failed to initialize the application. Please try again later.');
        }
    }
    
    // ----- Conversation Management -----
    
    async function loadConversations() {
        try {
            const response = await fetch('api/get_conversations.php');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            conversations = data.conversations;
            renderConversations();
            
            // Load first conversation if any
            if (conversations.length > 0 && !activeConversation) {
                selectConversation(conversations[0].id);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }
    
    function renderConversations() {
        conversationsList.innerHTML = '';
        
        if (conversations.length === 0) {
            const div = document.createElement('div');
            div.className = 'no-conversations';
            div.innerHTML = `
                <p><i class="fas fa-comment-slash"></i> No conversations yet</p>
                <p>Click "New" to start a conversation</p>
            `;
            conversationsList.appendChild(div);
            return;
        }
        
        conversations.forEach(conversation => {
            const div = document.createElement('div');
            div.className = 'conversation-item';
            div.dataset.id = conversation.id;
            
            if (activeConversation && activeConversation.id === conversation.id) {
                div.classList.add('active');
            }
            
            // Create conversation name
            let conversationName = conversation.name;
            if (!conversationName && !conversation.is_group) {
                // For direct messages, use the other user's name
                const otherUser = conversation.members.find(member => member.id !== currentUserId);
                conversationName = otherUser ? otherUser.username : 'Unknown';
            }
            
            div.innerHTML = `
                <div class="conversation-name">
                    <i class="fas ${conversation.is_group ? 'fa-users' : 'fa-user'}"></i> 
                    ${escapeHtml(conversationName)}
                </div>
                <div class="conversation-info">
                    <span><i class="fas ${conversation.is_group ? 'fa-users' : 'fa-user-secret'}"></i> ${conversation.is_group ? 'Group' : 'Direct'}</span>
                    <span><i class="fas fa-user-friends"></i> ${conversation.member_count} members</span>
                </div>
            `;
            
            div.addEventListener('click', () => selectConversation(conversation.id));
            conversationsList.appendChild(div);
        });
    }
    
    async function selectConversation(conversationId) {
        // Find conversation
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        // Update active conversation
        activeConversation = conversation;
        
        // Update UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === conversationId) {
                item.classList.add('active');
            }
        });
        
        // Update chat header
        let conversationName = conversation.name;
        if (!conversationName && !conversation.is_group) {
            // For direct messages, use the other user's name
            const otherUser = conversation.members.find(member => member.id !== currentUserId);
            conversationName = otherUser ? otherUser.username : 'Unknown';
        }
        
        chatHeader.innerHTML = `
            <div class="header-info">
                <h2><i class="fas ${conversation.is_group ? 'fa-users' : 'fa-user'}"></i> ${escapeHtml(conversationName)}</h2>
                <div><i class="fas fa-user-friends"></i> ${conversation.members.length} members</div>
            </div>
            <div class="header-actions">
                <button id="view-info-btn" class="btn-secondary" title="View Information">
                    <i class="fas fa-info-circle"></i> Info
                </button>
                <button id="delete-conversation" class="btn-danger" title="Delete Conversation">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        // Add event listener for delete button
        document.getElementById('delete-conversation').addEventListener('click', () => deleteConversation(conversation.id));
        
        // Add event listener for info button
        document.getElementById('view-info-btn').addEventListener('click', () => {
            if (conversation.is_group) {
                showGroupInfo(conversation);
            } else {
                viewUserInfo(conversation);
            }
        });
        
        // Reset lastMessageId when changing conversations
        lastMessageId = 0;
        
        // Load messages
        await loadMessages(true);
    }
    
    async function deleteConversation(conversationId) {
        const confirm = window.confirm("Are you sure you want to delete this conversation? This will permanently delete all messages and cannot be undone.");
        
        if (!confirm) return;
        
        try {
            const response = await fetch('api/delete_conversation.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversation_id: conversationId })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Remove conversation from list
            conversations = conversations.filter(c => c.id !== conversationId);
            
            // Clear active conversation
            activeConversation = null;
            
            // Clear messages
            messagesContainer.innerHTML = '';
            
            // Clear chat header
            chatHeader.innerHTML = '';
            
            // Update UI
            renderConversations();
            
            // Select first conversation if available
            if (conversations.length > 0) {
                selectConversation(conversations[0].id);
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            alert('Failed to delete conversation. Please try again.');
        }
    }
    
    // ----- Message Management -----
    
    async function loadMessages(fetchAll = false) {
        if (!activeConversation) return;
        
        try {
            // Only get new messages unless fetchAll is true
            let url = `api/get_messages.php?conversation_id=${activeConversation.id}`;
            if (!fetchAll && lastMessageId > 0) {
                url += `&last_id=${lastMessageId}`;
            } else {
                // Reset lastMessageId when changing conversations
                lastMessageId = 0;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // If fetching all messages, clear the container first
            if (fetchAll || lastMessageId === 0) {
                messagesContainer.innerHTML = '';
            }
            
            // Render only new messages
            if (data.messages.length > 0) {
                await renderMessages(data.messages);
                
                // Update the last message ID
                const newestMessage = data.messages[data.messages.length - 1];
                lastMessageId = Math.max(lastMessageId, newestMessage.id);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    async function renderMessages(messages) {
        // If we're loading the first batch of messages or all messages, add the encryption notice
        if (messagesContainer.innerHTML === '' || lastMessageId === 0) {
            const encryptionNotice = document.createElement('div');
            encryptionNotice.className = 'encryption-notice';
            encryptionNotice.innerHTML = `
                <i class="fas fa-lock"></i> 
                <p>Messages in this conversation are end-to-end encrypted. Only conversation participants can read them.</p>
            `;
            messagesContainer.appendChild(encryptionNotice);
        }
        
        for (const message of messages) {
            try {
                // Determine if message was sent by current user
                const isSent = parseInt(message.sender_id) === currentUserId;
                
                // Create message element
                const div = document.createElement('div');
                div.className = `message ${isSent ? 'sent' : 'received'}`;
                
                // Try to decrypt the message
                let messageContent = 'Unable to decrypt message';
                
                try {
                    const encryptedContent = base64ToArrayBuffer(message.encrypted_content);
                    const iv = base64ToArrayBuffer(message.iv);
                    
                    // Decrypt the message
                    messageContent = await decryptMessage(
                        encryptedContent, 
                        iv, 
                        message.encrypted_keys || '{}'
                    );
                } catch (decryptError) {
                    console.error('Failed to decrypt message:', decryptError);
                }
                
                // Set message content with icons
                div.innerHTML = `
                    ${!isSent ? `<div class="message-sender"><i class="fas fa-user"></i> ${escapeHtml(message.sender_name)}</div>` : ''}
                    <div class="message-content">${escapeHtml(messageContent)}</div>
                    <div class="message-time"><i class="far fa-clock"></i> ${message.created_at}</div>
                `;
                
                messagesContainer.appendChild(div);
            } catch (err) {
                console.error('Error rendering message:', err);
            }
        }
        
        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    async function sendMessage() {
        if (!activeConversation || !messageInput.value.trim()) return;
        
        try {
            const messageText = messageInput.value.trim();
            
            // Generate a random AES key for this message
            const aesKey = await generateAESKey();
            const iv = generateIV();
            
            // Encrypt the message with AES
            const encryptedContent = await encryptAES(messageText, aesKey, iv);
            
            // Convert encrypted data to base64 for sending
            const encryptedContentBase64 = arrayBufferToBase64(encryptedContent);
            const ivBase64 = arrayBufferToBase64(iv);
            
            // Export the AES key
            const exportedKey = await window.crypto.subtle.exportKey("raw", aesKey);
            
            // Encrypt the AES key for each recipient using their public key
            const encryptedKeys = {};
            
            for (const member of activeConversation.members) {
                try {
                    // Import recipient's public key
                    const recipientPublicKey = await importPublicKey(member.public_key);
                    
                    // Encrypt the AES key with the recipient's public key
                    const encryptedKey = await window.crypto.subtle.encrypt(
                        {
                            name: "RSA-OAEP"
                        },
                        recipientPublicKey,
                        exportedKey
                    );
                    
                    // Store the encrypted key for this recipient
                    encryptedKeys[member.id] = arrayBufferToBase64(encryptedKey);
                } catch (keyError) {
                    console.error(`Failed to encrypt key for user ${member.username}:`, keyError);
                }
            }
            
            // Prepare the message for sending
            const messageData = {
                conversation_id: activeConversation.id,
                encrypted_content: encryptedContentBase64,
                iv: ivBase64,
                encrypted_keys: JSON.stringify(encryptedKeys)
            };
            
            // Send the message
            const response = await fetch('api/send_message.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageData)
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Clear input
            messageInput.value = '';
            
            // Reload messages
            await loadMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }
    
    // ----- Encryption/Decryption -----
    
    async function decryptMessage(encryptedData, iv, encryptedKeys) {
        try {
            console.log("Decrypting message...");
            
            // Check if we have a valid private key
            if (!privateKey || !(privateKey instanceof CryptoKey)) {
                console.error("No valid private key available for decryption");
                return "-- INVALID PRIVATE KEY --";
            }
            
            // Parse the encrypted keys JSON
            let keysData;
            try {
                keysData = JSON.parse(encryptedKeys || '{}');
            } catch (jsonError) {
                console.error("Failed to parse encrypted keys JSON:", jsonError);
                return "Message has invalid encryption format";
            }
            
            // Get the encrypted key for current user
            const encryptedKeyBase64 = keysData[currentUserId];
            
            if (!encryptedKeyBase64) {
                console.log("No encrypted key found for current user");
                return "Message not intended for you";
            }
            
            // Convert from base64 to ArrayBuffer
            const encryptedKey = base64ToArrayBuffer(encryptedKeyBase64);
            
            console.log("Attempting to decrypt the message key...");
            // Decrypt the AES key using our private key
            const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
                {
                    name: "RSA-OAEP"
                },
                privateKey,
                encryptedKey
            );
            
            console.log("Message key decrypted successfully");
            
            // Import the decrypted AES key
            const messageKey = await window.crypto.subtle.importKey(
                "raw",
                decryptedKeyBuffer,
                {
                    name: "AES-GCM",
                    length: 256,
                },
                false, // not extractable
                ["decrypt"]
            );
            
            // Decrypt the message content
            return await decryptAES(encryptedData, messageKey, iv);
        } catch (error) {
            console.error('Decryption error:', error);
            return 'Unable to decrypt message: ' + error.message;
        }
    }
    
    // ----- User and Group Info Management -----
    
    function viewUserInfo(conversation) {
        if (!conversation || conversation.is_group) return;
        
        // Get the other user in the conversation
        const otherUser = conversation.members.find(member => member.id !== currentUserId);
        
        if (!otherUser) {
            alert('User information not available.');
            return;
        }
        
        // Format the user information
        userInfoContent.innerHTML = `
            <div class="user-info-item">
                <span class="info-label"><i class="fas fa-user"></i> Username:</span>
                <span class="info-value">${escapeHtml(otherUser.username)}</span>
            </div>
            <div class="user-info-item">
                <span class="info-label"><i class="fas fa-key"></i> Public Key:</span>
                <span class="info-value key-preview">${escapeHtml(otherUser.public_key.substring(0, 40))}...</span>
            </div>
            <div class="user-info-item">
                <span class="info-label"><i class="fas fa-shield-alt"></i> Encryption:</span>
                <span class="info-value"><i class="fas fa-lock text-success"></i> End-to-end encrypted</span>
            </div>
        `;
        
        // Show the modal
        userInfoModal.style.display = 'block';
    }
    
    function showGroupInfo(conversation) {
        if (!conversation || !conversation.is_group) return;
        
        // Set the current group name in the input
        groupNameInput.value = conversation.name || '';
        
        // Set up group details
        const createdDate = new Date(conversation.created_at).toLocaleString();
        groupDetails.innerHTML = `
            <div class="info-item">
                <span class="info-label"><i class="fas fa-calendar-alt"></i> Created:</span>
                <span class="info-value">${createdDate}</span>
            </div>
            <div class="info-item">
                <span class="info-label"><i class="fas fa-user-friends"></i> Members:</span>
                <span class="info-value">${conversation.members.length} participants</span>
            </div>
            <div class="info-item">
                <span class="info-label"><i class="fas fa-shield-alt"></i> Encryption:</span>
                <span class="info-value"><i class="fas fa-lock text-success"></i> End-to-end encrypted</span>
            </div>
        `;
        
        // Set up members list
        groupMembers.innerHTML = '';
        memberCount.textContent = conversation.members.length;
        
        conversation.members.forEach(member => {
            const isCurrentUser = member.id === currentUserId;
            const memberItem = document.createElement('div');
            memberItem.className = 'member-item';
            memberItem.innerHTML = `
                <div class="member-info">
                    <i class="fas fa-user-circle member-avatar"></i>
                    <div class="member-details">
                        <span class="member-name">${escapeHtml(member.username)} ${isCurrentUser ? '(You)' : ''}</span>
                    </div>
                </div>
            `;
            
            groupMembers.appendChild(memberItem);
        });
        
        // Set up group name save button
        saveGroupNameBtn.onclick = async () => {
            const newName = groupNameInput.value.trim();
            if (newName) {
                await updateGroupName(conversation.id, newName);
            } else {
                alert('Group name cannot be empty.');
            }
        };
        
        // Show the modal
        groupInfoModal.style.display = 'block';
    }
    
    async function updateGroupName(conversationId, newName) {
        if (!newName) {
            alert('Group name cannot be empty.');
            return;
        }
        
        try {
            const response = await fetch('api/update_group_name.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversation_id: conversationId,
                    name: newName
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Update the conversation in our list
            const index = conversations.findIndex(c => c.id === conversationId);
            if (index !== -1) {
                conversations[index].name = newName;
            }
            
            // Update active conversation if this is the one being renamed
            if (activeConversation && activeConversation.id === conversationId) {
                activeConversation.name = newName;
                // Refresh the conversation display
                selectConversation(conversationId);
            }
            
            // Close the modal
            groupInfoModal.style.display = 'none';
            
            // Update the conversation list
            renderConversations();
            
            alert('Group name updated successfully!');
            
        } catch (error) {
            console.error('Error updating group name:', error);
            alert('Failed to update group name: ' + error.message);
        }
    }
    
    // ----- New Conversation Modal -----
    
    async function showNewConversationModal() {
        try {
            // Clear previous selections
            selectedUsers = [];
            userList.innerHTML = '';
            
            // Load users
            const response = await fetch('api/get_users.php');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.users.length === 0) {
                userList.innerHTML = '<p class="no-users">No other users found. Invite some friends!</p>';
                return;
            }
            
            // Render user list
            data.users.forEach(user => {
                const div = document.createElement('div');
                div.className = 'user-item';
                div.dataset.id = user.id;
                div.dataset.username = user.username;
                div.dataset.publicKey = user.public_key;
                
                div.innerHTML = `
                    <span><i class="fas fa-user"></i> ${escapeHtml(user.username)}</span>
                `;
                
                div.addEventListener('click', () => toggleUserSelection(user));
                userList.appendChild(div);
            });
            
            // Show modal
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading users:', error);
            alert('Failed to load users. Please try again.');
        }
    }
    
    function toggleUserSelection(user) {
        const index = selectedUsers.findIndex(u => u.id === user.id);
        const userElement = document.querySelector(`.user-item[data-id="${user.id}"]`);
        
        if (index === -1) {
            // Add user to selection
            selectedUsers.push(user);
            userElement.classList.add('selected');
        } else {
            // Remove user from selection
            selectedUsers.splice(index, 1);
            userElement.classList.remove('selected');
        }
        
        // Update start button state
        startConversationBtn.disabled = selectedUsers.length === 0;
    }
    
    async function createConversation() {
        if (selectedUsers.length === 0) return;
        
        try {
            const isGroup = selectedUsers.length > 1;
            let name = null;
            
            if (isGroup) {
                name = prompt('Enter a name for this group conversation:');
                if (!name) name = `Group with ${selectedUsers.map(u => u.username).join(', ')}`;
            }
            
            const conversationData = {
                user_ids: selectedUsers.map(u => u.id),
                name: name,
                is_group: isGroup
            };
            
            const response = await fetch('api/create_conversation.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(conversationData)
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Close modal
            modal.style.display = 'none';
            
            // Reload conversations and select the new one
            await loadConversations();
            selectConversation(data.conversation.id);
        } catch (error) {
            console.error('Error creating conversation:', error);
            alert('Failed to create conversation. Please try again.');
        }
    }
    
    // ----- Key Management Functions -----
    
    function exportPrivateKey() {
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
    }
    
    async function importPrivateKey() {
        const input = document.createElement('input');
        input.type = 'file';
        
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const privateKeyData = event.target.result;
                    localStorage.setItem('privateKey', privateKeyData);
                    alert('Private key imported successfully. You can now decrypt your messages.');
                    window.location.reload();
                } catch (error) {
                    alert('Error importing private key: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // ----- Utility Functions -----
    
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    function startPolling() {
        // Poll for new messages every 1 second
        pollingInterval = setInterval(async () => {
            if (activeConversation) {
                await loadMessages();
            }
        }, 1000); // Changed from 5000 to 1000 for faster updates
    }
    
    function debugKeyStatus() {
        console.log("---- Key Debug Information ----");
        console.log("Private key in localStorage:", localStorage.getItem('privateKey') ? "Present" : "Missing");
        console.log("privateKey variable is CryptoKey:", privateKey instanceof CryptoKey);
        console.log("Current user ID:", currentUserId);
        console.log("-----------------------------");
    }
    
    // ----- Event Listeners -----
    
    // Send message
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // New conversation
    if (newConversationBtn) {
        newConversationBtn.addEventListener('click', showNewConversationModal);
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    }
    
    // User info modal close
    if (userInfoClose) {
        userInfoClose.addEventListener('click', () => userInfoModal.style.display = 'none');
    }
    
    // Group info modal close
    if (groupInfoClose) {
        groupInfoClose.addEventListener('click', () => groupInfoModal.style.display = 'none');
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        } else if (e.target === userInfoModal) {
            userInfoModal.style.display = 'none';
        } else if (e.target === groupInfoModal) {
            groupInfoModal.style.display = 'none';
        }
    });
    
    if (startConversationBtn) {
        startConversationBtn.addEventListener('click', createConversation);
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('api/logout.php');
                window.location.href = 'login.php';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
    
    // Search users
    if (searchUser) {
        searchUser.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            document.querySelectorAll('.conversation-item').forEach(item => {
                const name = item.querySelector('.conversation-name').textContent.toLowerCase();
                if (name.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Key management
    if (exportKeyBtn) {
        exportKeyBtn.addEventListener('click', exportPrivateKey);
    }
    
    if (importKeyBtn) {
        importKeyBtn.addEventListener('click', function() {
            importPrivateKey().catch(error => {
                console.error('Import error:', error);
            });
        });
    }
});