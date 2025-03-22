/**
 * Mobile Messenger App
 * Main application script
 */
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const menuToggle = document.getElementById('menu-toggle');
    const profileButton = document.getElementById('profile-button');
    const sideMenu = document.querySelector('.side-menu');
    const sideMenuOverlay = document.querySelector('.side-menu-overlay');
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');
    const backButtons = document.querySelectorAll('.back-button');
    const fabNewChat = document.getElementById('fab-new-chat');
    const conversationsList = document.getElementById('conversations-list');
    const searchChats = document.getElementById('search-chats');
    const searchUsers = document.getElementById('search-users');
    const usersList = document.getElementById('users-list');
    const selectedUsersList = document.getElementById('selected-users');
    const startConversationBtn = document.getElementById('start-conversation');
    const createGroupToggle = document.getElementById('create-group-toggle');
    const groupNameInput = document.querySelector('.group-name-input');
    const groupNameField = document.getElementById('group-name');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message');
    const messagesContainer = document.getElementById('messages-container');
    const chatInfoElement = document.getElementById('chat-info');
    const chatMenuButton = document.getElementById('chat-menu-button');
    const chatOptionsMenu = document.getElementById('chat-options-menu');
    const viewInfoBtn = document.getElementById('view-info-btn');
    const deleteChatBtn = document.getElementById('delete-chat-btn');
    const chatInfoModal = document.getElementById('chat-info-modal');
    const modalCloseButtons = document.querySelectorAll('.close-button');
    const chatInfoContent = document.getElementById('chat-info-content');
    const modalTitle = document.getElementById('modal-title');
    const exportKeyBtn = document.getElementById('export-key-btn');
    const importKeyBtn = document.getElementById('import-key-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // User data
    const userData = document.getElementById('user-data');
    const currentUserId = parseInt(userData.dataset.userId);
    const currentUsername = userData.dataset.username;
    const currentUserPublicKey = userData.dataset.publicKey;
    
    // Application state
    let privateKey = null;
    let conversations = [];
    let users = [];
    let activeConversation = null;
    let selectedUsers = [];
    let isCreatingGroup = false;
    let pollingInterval = null;
    let lastMessageId = 0;
    let isMenuOpen = false;
    
    // Initialize the app
    init();
    
    async function init() {
        try {
            // Check for private key in local storage
            const storedPrivateKey = localStorage.getItem('privateKey');
            if (storedPrivateKey) {
                try {
                    privateKey = await importPrivateKeyFromJWK(storedPrivateKey);
                    console.log("Private key imported successfully");
                } catch (keyError) {
                    console.error("Failed to import private key:", keyError);
                    showToast("Failed to import your encryption key", "error");
                }
            }
            
            // Load conversations
            await loadConversations();
            
            // Set up message polling
            startPolling();
            
            // Auto-resize message input
            setupTextareaAutoResize();
            
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Failed to initialize the application', 'error');
        }
    }
    
    // ----- Navigation and UI Interactions -----
    
    // Toggle side menu
    menuToggle.addEventListener('click', () => {
        sideMenu.classList.add('active');
        sideMenuOverlay.classList.add('active');
        isMenuOpen = true;
    });
    
    // Close side menu when clicking overlay
    sideMenuOverlay.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        sideMenuOverlay.classList.remove('active');
        isMenuOpen = false;
    });
    
    // Navigation items click
    navItems.forEach(item => {
        if (item.dataset.screen) {
            item.addEventListener('click', () => {
                const targetScreen = item.dataset.screen;
                showScreen(targetScreen);
                
                // Update active nav item
                navItems.forEach(navItem => navItem.classList.remove('active'));
                item.classList.add('active');
                
                // Close side menu
                sideMenu.classList.remove('active');
                sideMenuOverlay.classList.remove('active');
                isMenuOpen = false;
                
                // Load data for the new screen
                if (targetScreen === 'new-chat') {
                    loadUsers();
                }
            });
        }
    });
    
    // Back buttons
    backButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetScreen = btn.dataset.target;
            showScreen(targetScreen);
        });
    });
    
    // New chat FAB
    fabNewChat.addEventListener('click', () => {
        showScreen('new-chat');
        loadUsers();
    });
    
    // Chat menu button
    chatMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        chatOptionsMenu.classList.toggle('active');
        
        // Close menu when clicking outside
        const closeMenuHandler = () => {
            chatOptionsMenu.classList.remove('active');
            document.removeEventListener('click', closeMenuHandler);
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenuHandler);
        }, 10);
    });
    
    // View chat info
    viewInfoBtn.addEventListener('click', () => {
        chatOptionsMenu.classList.remove('active');
        showChatInfo();
    });
    
    // Delete chat
    deleteChatBtn.addEventListener('click', () => {
        chatOptionsMenu.classList.remove('active');
        
        // Show confirmation
        if (activeConversation) {
            if (confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
                deleteConversation(activeConversation.id);
            }
        }
    });
    
    // Close modals
    modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            modal.classList.remove('active');
        });
    });
    
    // Profile button
    profileButton.addEventListener('click', () => {
        window.location.href = 'profile.php';
    });
    
    // Create group toggle
    createGroupToggle.addEventListener('click', () => {
        isCreatingGroup = !isCreatingGroup;
        groupNameInput.classList.toggle('hidden', !isCreatingGroup);
        createGroupToggle.innerHTML = isCreatingGroup ? 
            '<i class="fas fa-user"></i> Direct Message' : 
            '<i class="fas fa-users"></i> Create Group';
        updateStartButton();
    });
    
    // Logout button
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('../api/logout.php');
            window.location.href = 'login.php';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to logout', 'error');
        }
    });
    
    // Key export button
    exportKeyBtn.addEventListener('click', exportPrivateKey);
    
    // Key import button
    importKeyBtn.addEventListener('click', importPrivateKey);
    
    // ----- Conversation Management -----
    async function loadConversations() {
        try {
            const response = await fetch('../api/get_conversations.php');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            conversations = data.conversations;
            renderConversations();
            
            // Load first conversation if any and we're on the chats screen
            if (conversations.length > 0 && !activeConversation && 
                document.getElementById('chats-screen').classList.contains('active')) {
                selectConversation(conversations[0].id);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            showToast('Failed to load conversations', 'error');
        }
    }
    
    function renderConversations() {
        conversationsList.innerHTML = '';
        
        if (conversations.length === 0) {
            conversationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>No conversations yet</p>
                    <p>Start a new chat to begin messaging</p>
                </div>
            `;
            return;
        }
        
        conversations.forEach(conversation => {
            // Create conversation name
            let conversationName = conversation.name;
            if (!conversationName && !conversation.is_group) {
                // For direct messages, use the other user's name
                const otherUser = conversation.members.find(member => member.id !== currentUserId);
                conversationName = otherUser ? otherUser.username : 'Unknown';
            }
            
            // Get last message if any
            let lastMessageText = 'No messages yet';
            if (conversation.last_message) {
                lastMessageText = 'Encrypted message';
            }
            
            // Format time
            let timeDisplay = '';
            if (conversation.last_activity) {
                const date = new Date(conversation.last_activity);
                const today = new Date();
                if (date.toDateString() === today.toDateString()) {
                    // Today, show time only
                    timeDisplay = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                    // Not today, show date
                    timeDisplay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                }
            }
            
            const div = document.createElement('div');
            div.className = 'conversation-item';
            div.dataset.id = conversation.id;
            div.innerHTML = `
                <div class="conversation-avatar">
                    <i class="fas ${conversation.is_group ? 'fa-users' : 'fa-user-circle'}"></i>
                </div>
                <div class="conversation-details">
                    <div class="conversation-title">
                        <span class="conversation-name">${escapeHtml(conversationName)}</span>
                    </div>
                    <div class="conversation-last-message">${escapeHtml(lastMessageText)}</div>
                </div>
                <div class="conversation-meta">
                    ${timeDisplay ? `<span class="conversation-time">${timeDisplay}</span>` : ''}
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
        
        // Update UI for active conversation
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === conversationId) {
                item.classList.add('active');
            }
        });
        
        // Create conversation name
        let conversationName = conversation.name;
        if (!conversationName && !conversation.is_group) {
            // For direct messages, use the other user's name
            const otherUser = conversation.members.find(member => member.id !== currentUserId);
            conversationName = otherUser ? otherUser.username : 'Unknown';
        }
        
        // Update chat info
        chatInfoElement.innerHTML = `
            <h2><i class="fas ${conversation.is_group ? 'fa-users' : 'fa-user-circle'}"></i> ${escapeHtml(conversationName)}</h2>
            <p>${conversation.members.length} member${conversation.members.length !== 1 ? 's' : ''}</p>
        `;
        
        // Reset lastMessageId when changing conversations
        lastMessageId = 0;
        
        // Load messages
        await loadMessages(true);
        
        // Show chat screen
        showScreen('chat');
    }
    
    async function deleteConversation(conversationId) {
        try {
            const response = await fetch('../api/delete_conversation.php', {
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
            
            // Update UI
            renderConversations();
            
            // Go back to chats screen
            showScreen('chats');
            
            showToast('Conversation deleted', 'success');
        } catch (error) {
            console.error('Error deleting conversation:', error);
            showToast('Failed to delete conversation', 'error');
        }
    }
    
    // ----- User Management -----
    
    async function loadUsers() {
        try {
            usersList.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
            
            const response = await fetch('../api/get_users.php');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            users = data.users;
            renderUsers();
        } catch (error) {
            console.error('Error loading users:', error);
            showToast('Failed to load users', 'error');
        }
    }
    
    function renderUsers() {
        usersList.innerHTML = '';
        
        if (users.length === 0) {
            usersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No users found</p>
                </div>
            `;
            return;
        }
        
        users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'user-item';
            div.dataset.id = user.id;
            div.dataset.username = user.username;
            div.dataset.publicKey = user.public_key;
            
            // Check if user is already selected
            const isSelected = selectedUsers.some(u => u.id === user.id);
            if (isSelected) {
                div.classList.add('selected');
            }
            
            div.innerHTML = `
                <div class="user-item-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="user-item-details">
                    <div class="user-item-name">${escapeHtml(user.username)}</div>
                </div>
                <div class="user-item-check">
                    ${isSelected ? '<i class="fas fa-check"></i>' : ''}
                </div>
            `;
            
            div.addEventListener('click', () => toggleUserSelection(user));
            usersList.appendChild(div);
        });
    }
    
    function toggleUserSelection(user) {
        const index = selectedUsers.findIndex(u => u.id === user.id);
        
        if (index === -1) {
            // Add user to selection
            selectedUsers.push(user);
        } else {
            // Remove user from selection
            selectedUsers.splice(index, 1);
        }
        
        // Update UI
        renderSelectedUsers();
        renderUsers();
        updateStartButton();
    }
    
    function renderSelectedUsers() {
        selectedUsersList.innerHTML = '';
        
        selectedUsers.forEach(user => {
            const chip = document.createElement('div');
            chip.className = 'selected-user-chip';
            chip.innerHTML = `
                <span class="selected-user-name">${escapeHtml(user.username)}</span>
                <span class="remove-user" data-id="${user.id}">×</span>
            `;
            
            // Add click event to remove user
            chip.querySelector('.remove-user').addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = parseInt(e.target.dataset.id);
                const userIndex = selectedUsers.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    selectedUsers.splice(userIndex, 1);
                    renderSelectedUsers();
                    renderUsers();
                    updateStartButton();
                }
            });
            
            selectedUsersList.appendChild(chip);
        });
    }
    
    function updateStartButton() {
        if (selectedUsers.length === 0) {
            startConversationBtn.disabled = true;
            return;
        }
        
        startConversationBtn.disabled = false;
        
        if (isCreatingGroup) {
            startConversationBtn.innerHTML = '<i class="fas fa-users"></i> Create Group';
        } else {
            startConversationBtn.innerHTML = '<i class="fas fa-comment"></i> Start Chat';
        }
    }
    
    // Create conversation
    startConversationBtn.addEventListener('click', createConversation);
    
    async function createConversation() {
        if (selectedUsers.length === 0) return;
        
        try {
            const isGroup = isCreatingGroup && selectedUsers.length > 0;
            let name = null;
            
            if (isGroup) {
                name = groupNameField.value.trim();
                if (!name) {
                    name = `Group with ${selectedUsers.map(u => u.username).join(', ')}`;
                }
            }
            
            showToast('Creating conversation...', 'info');
            
            const conversationData = {
                user_ids: selectedUsers.map(u => u.id),
                name: name,
                is_group: isGroup
            };
            
            const response = await fetch('../api/create_conversation.php', {
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
            
            // Reset state
            selectedUsers = [];
            isCreatingGroup = false;
            groupNameInput.classList.add('hidden');
            groupNameField.value = '';
            createGroupToggle.innerHTML = '<i class="fas fa-users"></i> Create Group';
            
            // Reload conversations and select the new one
            await loadConversations();
            
            if (data.conversation && data.conversation.id) {
                selectConversation(data.conversation.id);
            } else {
                showScreen('chats');
            }
            
            showToast('Conversation created', 'success');
        } catch (error) {
            console.error('Error creating conversation:', error);
            showToast('Failed to create conversation', 'error');
        }
    }
    
    // ----- Message Management -----
    
    async function loadMessages(fetchAll = false) {
        if (!activeConversation) return;
        
        try {
            // Only get new messages unless fetchAll is true
            let url = `../api/get_messages.php?conversation_id=${activeConversation.id}`;
            if (!fetchAll && lastMessageId > 0) {
                url += `&last_id=${lastMessageId}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // If fetching all messages, clear the container first
            if (fetchAll || lastMessageId === 0) {
                messagesContainer.innerHTML = '';
                
                // Add encryption notice
                const notice = document.createElement('div');
                notice.className = 'encryption-notice';
                notice.innerHTML = `
                    <i class="fas fa-lock"></i>
                    <span>Messages in this conversation are end-to-end encrypted</span>
                `;
                messagesContainer.appendChild(notice);
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
            showToast('Failed to load messages', 'error');
        }
    }
    
    async function renderMessages(messages) {
        for (const message of messages) {
            const isSent = parseInt(message.sender_id) === currentUserId;
            const isGroupMessage = activeConversation.is_group;
            
            // Decrypt message content
            let messageContent = 'Unable to decrypt message';
            
            try {
                if (privateKey) {
                    const encryptedContent = base64ToArrayBuffer(message.encrypted_content);
                    const iv = base64ToArrayBuffer(message.iv);
                    
                    messageContent = await decryptMessage(
                        encryptedContent, 
                        iv, 
                        message.encrypted_keys || '{}'
                    );
                }
            } catch (decryptError) {
                console.error('Failed to decrypt message:', decryptError);
            }
            
            // Format time
            let timeDisplay = '';
            if (message.created_at) {
                const date = new Date(message.created_at);
                timeDisplay = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            
            const div = document.createElement('div');
            div.className = `message ${isSent ? 'sent' : 'received'}`;
            
            let senderInfo = '';
            if (!isSent && isGroupMessage) {
                senderInfo = `<div class="message-sender">${escapeHtml(message.sender_name)}</div>`;
            }
            
            div.innerHTML = `
                ${senderInfo}
                <div class="message-content">${escapeHtml(messageContent)}</div>
                <div class="message-time">${timeDisplay}</div>
            `;
            
            messagesContainer.appendChild(div);
        }
        
        // Scroll to the bottom
        scrollToBottom();
    }
    
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Send message
    sendMessageBtn.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    async function sendMessage() {
        if (!activeConversation || !messageInput.value.trim()) return;
        
        if (!privateKey) {
            showToast('You need an encryption key to send messages', 'error');
            return;
        }
        
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
            
            // Create optimistic message
            const optimisticMessage = {
                id: 'temp-' + Date.now(),
                sender_id: currentUserId,
                sender_name: currentUsername,
                message_content: messageText,
                created_at: new Date().toLocaleString()
            };
            
            // Clear input before the API call
            messageInput.value = '';
            messageInput.style.height = 'auto';
            
            // Add optimistic message to UI
            const tempDiv = document.createElement('div');
            tempDiv.className = 'message sent';
            tempDiv.dataset.tempId = optimisticMessage.id;
            tempDiv.innerHTML = `
                <div class="message-content">${escapeHtml(optimisticMessage.message_content)}</div>
                <div class="message-time">Sending...</div>
            `;
            messagesContainer.appendChild(tempDiv);
            scrollToBottom();
            
            // Prepare the message for sending
            const messageData = {
                conversation_id: activeConversation.id,
                encrypted_content: encryptedContentBase64,
                iv: ivBase64,
                encrypted_keys: JSON.stringify(encryptedKeys)
            };
            
            // Send the message
            const response = await fetch('../api/send_message.php', {
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
            
            // Remove optimistic message
            const tempMessage = document.querySelector(`[data-temp-id="${optimisticMessage.id}"]`);
            if (tempMessage) {
                tempMessage.remove();
            }
            
            // Reload messages to get the real one
            await loadMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
        }
    }
    
    async function decryptMessage(encryptedData, iv, encryptedKeys) {
        try {
            if (!privateKey) {
                return "Import your private key to decrypt messages";
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
                return "This message was not intended for you";
            }
            
            // Convert from base64 to ArrayBuffer
            const encryptedKey = base64ToArrayBuffer(encryptedKeyBase64);
            
            // Decrypt the AES key using our private key
            const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
                {
                    name: "RSA-OAEP"
                },
                privateKey,
                encryptedKey
            );
            
            // Import the decrypted AES key
            const messageKey = await window.crypto.subtle.importKey(
                "raw",
                decryptedKeyBuffer,
                {
                    name: "AES-GCM",
                    length: 256,
                },
                false,
                ["decrypt"]
            );
            
            // Decrypt the message content
            return await decryptAES(encryptedData, messageKey, iv);
        } catch (error) {
            console.error('Decryption error:', error);
            return 'Unable to decrypt message';
        }
    }
    
    // ----- Chat Info -----
    
    function showChatInfo() {
        if (!activeConversation) return;
        
        modalTitle.innerHTML = `<i class="fas fa-${activeConversation.is_group ? 'users' : 'user'}-circle"></i> ${activeConversation.is_group ? 'Group' : 'Chat'} Info`;
        
        // Create chat name
        let chatName = activeConversation.name;
        if (!chatName && !activeConversation.is_group) {
            // For direct messages, use the other user's name
            const otherUser = activeConversation.members.find(member => member.id !== currentUserId);
            chatName = otherUser ? otherUser.username : 'Unknown';
        }
        
        // Format date
        const createdDate = new Date(activeConversation.created_at).toLocaleDateString([], {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let html = `
            <div class="chat-info-header">
                <div class="chat-avatar large">
                    <i class="fas fa-${activeConversation.is_group ? 'users' : 'user-circle'}"></i>
                </div>
                <h3>${escapeHtml(chatName)}</h3>
                <p>${activeConversation.is_group ? 'Group chat' : 'Direct message'}</p>
            </div>
            
            <div class="info-section">
                <h4>Details</h4>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-calendar"></i> Created</span>
                    <span class="info-value">${createdDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-lock"></i> Encryption</span>
                    <span class="info-value">End-to-end encrypted</span>
                </div>
            </div>
            
            <div class="info-section">
                <h4>Members (${activeConversation.members.length})</h4>
                <div class="members-list">
        `;
        
        // Add members
        activeConversation.members.forEach(member => {
            const isCurrentUser = member.id === currentUserId;
            html += `
                <div class="member-item">
                    <div class="member-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="member-info">
                        <span class="member-name">${escapeHtml(member.username)} ${isCurrentUser ? '(You)' : ''}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        chatInfoContent.innerHTML = html;
        chatInfoModal.classList.add('active');
    }
    
    // ----- Utility Functions -----
    
    function showScreen(screenId) {
        screens.forEach(screen => {
            screen.classList.remove('active');
            if (screen.id === `${screenId}-screen`) {
                screen.classList.add('active');
            }
        });
    }
    
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    function setupTextareaAutoResize() {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            const newHeight = Math.min(this.scrollHeight, 120);
            this.style.height = newHeight + 'px';
        });
    }
    
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
    
    function startPolling() {
        // Poll for new messages every 2 seconds
        pollingInterval = setInterval(async () => {
            if (activeConversation) {
                await loadMessages();
            }
        }, 2000);
    }
    
    async function exportPrivateKey() {
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
    }
    
    async function importPrivateKey() {
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
                        privateKey = await importPrivateKeyFromJWK(privateKeyData);
                        showToast('Private key imported successfully', 'success');
                        
                        // Reload messages if we're in a conversation
                        if (activeConversation) {
                            await loadMessages(true);
                        }
                    } catch (importError) {
                        throw new Error("Key couldn't be imported: " + importError.message);
                    }
                } catch (error) {
                    showToast('Error importing key: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // Handle back button
    window.addEventListener('popstate', function(e) {
        if (isMenuOpen) {
            // Close menu if open
            sideMenu.classList.remove('active');
            sideMenuOverlay.classList.remove('active');
            isMenuOpen = false;
            e.preventDefault();
            history.pushState(null, null, window.location.pathname);
        } else if (document.getElementById('chat-screen').classList.contains('active')) {
            // Go back to chats
            showScreen('chats');
            e.preventDefault();
            history.pushState(null, null, window.location.pathname);
        }
    });
    
    // Push initial state
    history.pushState(null, null, window.location.pathname);
});