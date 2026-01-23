console.log('[WORKSPACE] Script loaded');
const API_BASE_URL = '/api';

let currentUser = null;
let currentConversation = null;
let currentMessages = [];
let pollingInterval = null;
let lastMessageId = null;

function showState(stateId) {
    document.querySelectorAll('.workspace-state').forEach(state => {
        state.style.display = 'none';
    });
    const targetState = document.getElementById(stateId);
    if (targetState) {
        targetState.style.display = 'block';
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.workspace-tab').forEach(tab => {
        tab.style.display = 'none';
    });
    
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    
    if (tabName === 'active') {
        startPolling();
    } else {
        stopPolling();
    }
    
    if (tabName === 'library') {
        loadLibrary();
    }
}

async function checkAuthStatus() {
    try {
        const sessionData = localStorage.getItem('session');
        if (!sessionData) {
            return { authenticated: false };
        }
        
        const session = JSON.parse(sessionData);
        const accessToken = session.access_token;
        
        if (!accessToken) {
            return { authenticated: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return { authenticated: false };
        }

        const data = await response.json();
        return { 
            authenticated: data.authenticated !== false, 
            user: data.user 
        };
    } catch (error) {
        console.error('[WORKSPACE] Auth check error:', error);
        return { authenticated: false };
    }
}

async function getActiveConversation() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            console.error('[WORKSPACE] No access token');
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/active-conversation`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        if (response.status === 404) {
            return { success: true, conversation: null, messages: [] };
        }

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return { 
            success: true, 
            conversation: data.conversation, 
            messages: data.messages || [] 
        };
    } catch (error) {
        console.error('[WORKSPACE] Error getting active conversation:', error);
        return { success: false };
    }
}

async function startConversation(content, attachment) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const formData = new FormData();
        formData.append('content', content);
        if (attachment) {
            formData.append('attachment', attachment);
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/start-conversation`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Failed to start conversation' };
        }

        const data = await response.json();
        return { success: true, conversation_id: data.conversation_id };
    } catch (error) {
        console.error('[WORKSPACE] Start conversation error:', error);
        return { success: false, error: 'Failed to start conversation' };
    }
}

async function sendMessage(conversationId, content, attachment) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const formData = new FormData();
        formData.append('content', content);
        if (attachment) {
            formData.append('attachment', attachment);
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/send-message/${conversationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Failed to send message' };
        }

        const data = await response.json();
        return { success: true, message_id: data.message_id };
    } catch (error) {
        console.error('[WORKSPACE] Send message error:', error);
        return { success: false, error: 'Failed to send message' };
    }
}

async function editMessage(messageId, content) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/edit-message/${messageId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return { success: true, edited_at: data.edited_at };
    } catch (error) {
        console.error('[WORKSPACE] Edit message error:', error);
        return { success: false };
    }
}

async function deleteMessage(messageId) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/delete-message/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false };
        }

        return { success: true };
    } catch (error) {
        console.error('[WORKSPACE] Delete message error:', error);
        return { success: false };
    }
}

async function commitToRecommendation(conversationId) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const finalRecommendationMessage = currentMessages.find(m => m.tag === 'final_recommendation');
        if (!finalRecommendationMessage) {
            return { success: false, error: 'No final recommendation found' };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/commit/${conversationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                final_recommendation_id: finalRecommendationMessage.id
            })
        });

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return { success: true, resolved_at: data.resolved_at };
    } catch (error) {
        console.error('[WORKSPACE] Commit error:', error);
        return { success: false };
    }
}

async function getLibrary() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/library`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return { success: true, conversations: data.conversations || [] };
    } catch (error) {
        console.error('[WORKSPACE] Get library error:', error);
        return { success: false };
    }
}

async function getConversationById(conversationId) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/library/${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return { 
            success: true, 
            conversation: data.conversation, 
            messages: data.messages || [] 
        };
    } catch (error) {
        console.error('[WORKSPACE] Get conversation error:', error);
        return { success: false };
    }
}

async function updateSettings(displayName, emailNotifications) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/update-settings`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                display_name: displayName,
                email_notifications_enabled: emailNotifications
            })
        });

        if (!response.ok) {
            return { success: false };
        }

        return { success: true };
    } catch (error) {
        console.error('[WORKSPACE] Update settings error:', error);
        return { success: false };
    }
}

function renderSummaryCard(summary) {
    const summaryCard = document.getElementById('summary-card');
    if (!summary || !summary.decision) {
        summaryCard.style.display = 'none';
        return;
    }
    
    summaryCard.style.display = 'block';
    document.getElementById('summary-decision').textContent = summary.decision || '—';
    document.getElementById('summary-leaning').textContent = summary.current_leaning || '—';
    document.getElementById('summary-status').textContent = summary.status || 'draft';
    
    if (summary.last_update) {
        const date = new Date(summary.last_update);
        document.getElementById('summary-updated').textContent = formatDate(date);
    } else {
        document.getElementById('summary-updated').textContent = 'Never';
    }
}

function renderMessageThread(messages) {
    const thread = document.getElementById('message-thread');
    thread.innerHTML = '';
    
    messages.forEach(msg => {
        if (msg.deleted_at) return;
        
        const messageEl = createMessageElement(msg);
        thread.appendChild(messageEl);
    });
    
    thread.scrollTop = thread.scrollHeight;
    
    const hasFinalRecommendation = messages.some(m => m.tag === 'final_recommendation' && !m.deleted_at);
    const commitSection = document.getElementById('commit-section');
    if (hasFinalRecommendation && currentConversation?.status === 'active') {
        commitSection.style.display = 'block';
    } else {
        commitSection.style.display = 'none';
    }
}

function createMessageElement(msg) {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${msg.author_type}`;
    messageEl.dataset.messageId = msg.id;
    
    const authorEl = document.createElement('div');
    authorEl.className = 'message-author';
    authorEl.textContent = msg.author_type === 'user' ? 'You' : (msg.author_name || 'Onyx');
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = msg.content;
    
    if (msg.attachment_url) {
        const attachmentEl = document.createElement('div');
        attachmentEl.className = 'message-attachment';
        const link = document.createElement('a');
        link.href = msg.attachment_url;
        link.target = '_blank';
        link.textContent = `📎 ${msg.attachment_name || 'View attachment'}`;
        attachmentEl.appendChild(link);
        contentEl.appendChild(attachmentEl);
    }
    
    const metaEl = document.createElement('div');
    metaEl.className = 'message-meta';
    
    const timeEl = document.createElement('span');
    timeEl.className = 'message-time';
    timeEl.textContent = formatTime(new Date(msg.created_at));
    metaEl.appendChild(timeEl);
    
    if (msg.edited_at) {
        const editedEl = document.createElement('span');
        editedEl.className = 'message-edited';
        editedEl.textContent = '(edited)';
        metaEl.appendChild(editedEl);
    }
    
    if (msg.tag) {
        const tagEl = document.createElement('span');
        tagEl.className = 'message-tag';
        tagEl.textContent = formatTag(msg.tag);
        metaEl.appendChild(tagEl);
    }
    
    if (msg.author_type === 'user' && canEditMessage(msg.created_at)) {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'message-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'message-action-btn';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => handleEditMessage(msg.id, msg.content);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'message-action-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => handleDeleteMessage(msg.id);
        
        actionsEl.appendChild(editBtn);
        actionsEl.appendChild(deleteBtn);
        metaEl.appendChild(actionsEl);
    }
    
    messageEl.appendChild(authorEl);
    messageEl.appendChild(contentEl);
    messageEl.appendChild(metaEl);
    
    return messageEl;
}

function canEditMessage(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = (now - created) / 1000 / 60;
    return diffMinutes < 10;
}

function formatTag(tag) {
    const tagMap = {
        'proposed_direction': 'Proposed Direction',
        'key_question': 'Key Question',
        'action_required': 'Action Required',
        'final_recommendation': 'Final Recommendation'
    };
    return tagMap[tag] || tag;
}

function formatDate(date) {
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
}

function formatTime(date) {
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return formatDate(date);
}

async function handleEditMessage(messageId, currentContent) {
    const newContent = prompt('Edit message:', currentContent);
    if (!newContent || newContent === currentContent) return;
    
    const result = await editMessage(messageId, newContent);
    if (result.success) {
        await refreshMessages();
    } else {
        alert('Could not edit message. The 10-minute window may have expired.');
    }
}

async function handleDeleteMessage(messageId) {
    if (!confirm('Delete this message?')) return;
    
    const result = await deleteMessage(messageId);
    if (result.success) {
        await refreshMessages();
    } else {
        alert('Could not delete message. The 10-minute window may have expired.');
    }
}

async function refreshMessages() {
    const result = await getActiveConversation();
    if (result.success && result.conversation) {
        currentConversation = result.conversation;
        currentMessages = result.messages;
        renderMessageThread(currentMessages);
        renderSummaryCard(currentConversation.summary);
    }
}

function startPolling() {
    if (pollingInterval) return;
    
    pollingInterval = setInterval(async () => {
        await refreshMessages();
    }, 7000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

function setupFileUpload(fileInputId, attachBtnId, fileNameId) {
    const fileInput = document.getElementById(fileInputId);
    const attachBtn = document.getElementById(attachBtnId);
    const fileName = document.getElementById(fileNameId);
    
    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('File too large. Maximum size is 5MB.');
                fileInput.value = '';
                fileName.textContent = '';
                return;
            }
            
            const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                alert('Invalid file type. Only PNG, JPG, and PDF are allowed.');
                fileInput.value = '';
                fileName.textContent = '';
                return;
            }
            
            fileName.textContent = file.name;
        } else {
            fileName.textContent = '';
        }
    });
}

async function loadLibrary() {
    const result = await getLibrary();
    const libraryList = document.getElementById('library-list');
    const libraryEmpty = document.getElementById('library-empty');
    
    if (!result.success || result.conversations.length === 0) {
        libraryList.innerHTML = '';
        libraryEmpty.style.display = 'block';
        return;
    }
    
    libraryEmpty.style.display = 'none';
    libraryList.innerHTML = '';
    
    result.conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'library-item';
        
        const title = document.createElement('div');
        title.className = 'library-item-title';
        title.textContent = conv.summary_decision || 'Untitled conversation';
        
        const meta = document.createElement('div');
        meta.className = 'library-item-meta';
        meta.innerHTML = `
            <span>${conv.message_count || 0} messages</span>
            <span>Resolved ${formatDate(new Date(conv.resolved_at))}</span>
        `;
        
        item.appendChild(title);
        item.appendChild(meta);
        
        item.addEventListener('click', () => {
            openConversationModal(conv.id);
        });
        
        libraryList.appendChild(item);
    });
}

async function openConversationModal(conversationId) {
    const modal = document.getElementById('conversation-modal');
    const result = await getConversationById(conversationId);
    
    if (!result.success) {
        alert('Could not load conversation');
        return;
    }
    
    document.getElementById('modal-title').textContent = result.conversation.summary?.decision || 'Conversation';
    
    const modalSummary = document.getElementById('modal-summary');
    if (result.conversation.summary) {
        modalSummary.innerHTML = `
            <div class="summary-field">
                <label>Decision:</label>
                <p>${result.conversation.summary.decision || '—'}</p>
            </div>
            <div class="summary-field">
                <label>Current Leaning:</label>
                <p>${result.conversation.summary.current_leaning || '—'}</p>
            </div>
            <div class="summary-meta">
                <span>Status: ${result.conversation.summary.status || 'resolved'}</span>
            </div>
        `;
    }
    
    const modalMessages = document.getElementById('modal-messages');
    modalMessages.innerHTML = '';
    result.messages.forEach(msg => {
        if (msg.deleted_at) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${msg.author_type}`;
        
        const authorEl = document.createElement('div');
        authorEl.className = 'message-author';
        authorEl.textContent = msg.author_type === 'user' ? 'You' : (msg.author_name || 'Onyx');
        
        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        contentEl.textContent = msg.content;
        
        if (msg.attachment_url) {
            const attachmentEl = document.createElement('div');
            attachmentEl.className = 'message-attachment';
            const link = document.createElement('a');
            link.href = msg.attachment_url;
            link.target = '_blank';
            link.textContent = `📎 ${msg.attachment_name || 'View attachment'}`;
            attachmentEl.appendChild(link);
            contentEl.appendChild(attachmentEl);
        }
        
        const metaEl = document.createElement('div');
        metaEl.className = 'message-meta';
        metaEl.textContent = formatDate(new Date(msg.created_at));
        
        messageEl.appendChild(authorEl);
        messageEl.appendChild(contentEl);
        messageEl.appendChild(metaEl);
        
        modalMessages.appendChild(messageEl);
    });
    
    modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[WORKSPACE] DOM loaded');
    
    const authStatus = await checkAuthStatus();
    
    if (!authStatus.authenticated) {
        showState('unauthorized-state');
        return;
    }
    
    currentUser = authStatus.user;
    
    if (!currentUser.has_paid) {
        showState('unpaid-state');
        return;
    }
    
    document.querySelectorAll('[id^="username-"]').forEach(el => {
        el.textContent = currentUser.display_name || currentUser.email;
    });
    
    const activeConvResult = await getActiveConversation();
    
    if (!activeConvResult.success) {
        alert('Failed to load workspace');
        return;
    }
    
    if (!activeConvResult.conversation) {
        showState('first-time-state');
        setupFirstTimeExperience();
    } else {
        currentConversation = activeConvResult.conversation;
        currentMessages = activeConvResult.messages;
        
        showState('workspace-state');
        renderSummaryCard(currentConversation.summary);
        renderMessageThread(currentMessages);
        
        setupWorkspace();
        startPolling();
    }
});

function setupFirstTimeExperience() {
    setupFileUpload('first-file-input', 'first-attach-btn', 'first-file-name');
    
    document.getElementById('send-first-message').addEventListener('click', async () => {
        const content = document.getElementById('first-message-input').value.trim();
        const fileInput = document.getElementById('first-file-input');
        const attachment = fileInput.files[0] || null;
        
        if (!content) {
            alert('Please enter a message');
            return;
        }
        
        if (content.length < 20) {
            alert('Please provide more context (at least 20 characters)');
            return;
        }
        
        const btn = document.getElementById('send-first-message');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        const result = await startConversation(content, attachment);
        
        if (!result.success) {
            alert(result.error || 'Failed to start conversation');
            btn.disabled = false;
            btn.textContent = 'Send to Onyx';
            return;
        }
        
        window.location.reload();
    });
    
    setupUserMenus();
}

function setupWorkspace() {
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });
    
    setupFileUpload('message-file-input', 'message-attach-btn', 'message-file-name');
    
    document.getElementById('send-message-btn').addEventListener('click', async () => {
        const content = document.getElementById('message-input').value.trim();
        const fileInput = document.getElementById('message-file-input');
        const attachment = fileInput.files[0] || null;
        
        if (!content) {
            alert('Please enter a message');
            return;
        }
        
        const result = await sendMessage(currentConversation.id, content, attachment);
        
        if (!result.success) {
            alert(result.error || 'Failed to send message');
            return;
        }
        
        document.getElementById('message-input').value = '';
        fileInput.value = '';
        document.getElementById('message-file-name').textContent = '';
        
        await refreshMessages();
    });
    
    document.getElementById('message-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('send-message-btn').click();
        }
    });
    
    document.getElementById('commit-btn').addEventListener('click', async () => {
        if (!confirm('Commit to this direction? This will resolve the conversation.')) {
            return;
        }
        
        const result = await commitToRecommendation(currentConversation.id);
        
        if (!result.success) {
            alert('Failed to commit');
            return;
        }
        
        alert('Conversation resolved!');
        window.location.reload();
    });
    
    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('conversation-modal').style.display = 'none';
    });
    
    document.getElementById('settings-name').addEventListener('change', async (e) => {
        const emailNotifications = document.getElementById('settings-email-notifications').checked;
        const result = await updateSettings(e.target.value, emailNotifications);
        
        if (result.success) {
            const msg = document.getElementById('settings-saved-message');
            msg.style.display = 'block';
            setTimeout(() => {
                msg.style.display = 'none';
            }, 2000);
        }
    });
    
    document.getElementById('settings-email-notifications').addEventListener('change', async (e) => {
        const displayName = document.getElementById('settings-name').value;
        const result = await updateSettings(displayName, e.target.checked);
        
        if (result.success) {
            const msg = document.getElementById('settings-saved-message');
            msg.style.display = 'block';
            setTimeout(() => {
                msg.style.display = 'none';
            }, 2000);
        }
    });
    
    document.getElementById('settings-name').value = currentUser.display_name || '';
    document.getElementById('settings-email').value = currentUser.email || '';
    
    if (currentConversation.email_notifications_enabled !== undefined) {
        document.getElementById('settings-email-notifications').checked = currentConversation.email_notifications_enabled;
    }
    
    setupUserMenus();
}

function setupUserMenus() {
    document.querySelectorAll('.user-menu-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdownId = trigger.id.replace('user-menu', 'user-dropdown');
            const dropdown = document.getElementById(dropdownId);
            
            document.querySelectorAll('.user-menu-dropdown').forEach(d => {
                if (d.id !== dropdownId) d.style.display = 'none';
            });
            
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
    });
    
    document.addEventListener('click', () => {
        document.querySelectorAll('.user-menu-dropdown').forEach(d => {
            d.style.display = 'none';
        });
    });
    
    document.querySelectorAll('.user-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            
            if (action === 'logout') {
                localStorage.removeItem('session');
                window.location.href = '/';
            } else if (action === 'payment') {
                window.location.href = '/payment';
            } else if (action === 'settings') {
                switchTab('settings');
            }
        });
    });
}
