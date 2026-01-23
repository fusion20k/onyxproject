console.log('[WORKSPACE] Script loaded');
const API_BASE_URL = '/api';

let currentUser = null;
let currentDecision = null;
let currentFeedback = [];
let allDecisions = { active: null, resolved: [] };

function showState(stateId) {
    document.querySelectorAll('.workspace-state').forEach(state => {
        state.style.display = 'none';
    });
    const targetState = document.getElementById(stateId);
    if (targetState) {
        targetState.style.display = 'block';
    }
}

async function checkAuthStatus() {
    try {
        const sessionData = localStorage.getItem('session');
        console.log('[WORKSPACE] Session data:', sessionData ? 'found' : 'not found');
        
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

async function getActiveDecision() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            console.error('[WORKSPACE] No access token');
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/active-decision`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        if (response.status === 404) {
            return { success: true, decision: null };
        }

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return { success: true, decision: data.decision, feedback: data.feedback || [] };
    } catch (error) {
        console.error('[WORKSPACE] Error getting active decision:', error);
        return { success: false };
    }
}

async function getArchive() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/archive`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return { success: true, decisions: data.decisions || [] };
    } catch (error) {
        console.error('[WORKSPACE] Error getting archive:', error);
        return { success: false };
    }
}

async function createDecision(situation) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/create-decision`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ situation })
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Failed to create decision' };
        }

        const data = await response.json();
        return { success: true, decision_id: data.decision_id };
    } catch (error) {
        console.error('[WORKSPACE] Create decision error:', error);
        return { success: false, error: 'Failed to create decision' };
    }
}

async function updateDecision(decisionId, updates) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/update-decision/${decisionId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return { success: true, status: data.status };
    } catch (error) {
        console.error('[WORKSPACE] Update decision error:', error);
        return { success: false };
    }
}

async function addFeedback(decisionId, content) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/add-feedback/${decisionId}`, {
            method: 'POST',
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

        return { success: true };
    } catch (error) {
        console.error('[WORKSPACE] Add feedback error:', error);
        return { success: false };
    }
}

async function resolveDecision(decisionId, resolution) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/workspace/resolve-decision/${decisionId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(resolution)
        });

        if (!response.ok) {
            return { success: false };
        }

        return { success: true };
    } catch (error) {
        console.error('[WORKSPACE] Resolve decision error:', error);
        return { success: false };
    }
}

function openSettings() {
    renderHub('settings');
}

async function saveSettings() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            alert('Please log in again');
            return;
        }
        
        const displayName = document.getElementById('settings-display-name').value.trim();
        
        const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ display_name: displayName })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        
        if (currentUser) {
            currentUser.display_name = displayName;
        }
        
        updateHeaderUsername();
        
        const saveMessage = document.getElementById('settings-save-message');
        if (saveMessage) {
            saveMessage.style.display = 'block';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('[WORKSPACE] Save settings error:', error);
        alert('Unable to save settings. Please try again.');
    }
}

async function saveSettingsHub() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return;
        }
        
        const displayName = document.getElementById('settings-display-name-hub').value.trim();
        
        const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ display_name: displayName })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        
        if (currentUser) {
            currentUser.display_name = displayName;
        }
        
        updateHeaderUsername();
        
        const saveMessage = document.getElementById('settings-save-message-hub');
        if (saveMessage) {
            saveMessage.style.display = 'block';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('[WORKSPACE] Save settings error:', error);
    }
}

async function openCustomerPortal() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            alert('Please log in again');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/payment/customer-portal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to create portal session');
        }
        
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        }
    } catch (error) {
        console.error('[WORKSPACE] Customer portal error:', error);
        alert('Unable to open payment portal. Please try again.');
    }
}

async function logout() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        const headers = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers,
            credentials: 'include'
        });
    } catch (error) {
        console.error('[WORKSPACE] Logout error:', error);
    }
    
    localStorage.removeItem('session');
    localStorage.removeItem('user');
    
    window.location.href = '/';
}

function calculateClarityMomentum(allDecisions) {
    const now = new Date();
    const last7Days = allDecisions.resolved.filter(d => {
        const resolved = new Date(d.resolved_at);
        return (now - resolved) < (7 * 24 * 60 * 60 * 1000);
    });
    
    const last30Days = allDecisions.resolved.filter(d => {
        const resolved = new Date(d.resolved_at);
        return (now - resolved) < (30 * 24 * 60 * 60 * 1000);
    });
    
    if (allDecisions.active || last7Days.length > 0) {
        return "Consistent";
    }
    
    if (last30Days.length > 0) {
        return "Building";
    }
    
    return "Paused";
}

function renderHub(viewName = 'active') {
    showState('hub-state');
    updateHeaderUsername();
    renderActiveView();
    renderLibraryView();
    renderSettingsView();
    switchView(viewName);
}

function switchView(viewName) {
    document.querySelectorAll('.workspace-view').forEach(view => {
        view.style.display = 'none';
    });
    
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.style.display = 'flex';
        targetView.style.flexDirection = 'column';
    }
    
    const targetNavItem = document.querySelector(`.sidebar-nav-item[data-view="${viewName}"]`);
    if (targetNavItem) {
        targetNavItem.classList.add('active');
    }
}

function renderActiveView() {
    const activeSection = document.getElementById('active-decision-section');
    const noActiveDecision = document.getElementById('no-active-decision');
    const singleDecisionNudge = document.getElementById('single-decision-nudge');
    
    if (allDecisions.active) {
        const decision = allDecisions.active;
        activeSection.style.display = 'block';
        noActiveDecision.style.display = 'none';
        
        const totalDecisions = 1 + allDecisions.resolved.length;
        if (totalDecisions === 1) {
            singleDecisionNudge.style.display = 'block';
        } else {
            singleDecisionNudge.style.display = 'none';
        }
        
        const statusMap = {
            'in_progress': 'Draft',
            'under_review': 'In review',
            'responded': 'Committed',
            'resolved': 'Committed'
        };
        
        const now = new Date();
        const updated = new Date(decision.updated_at);
        const daysDiff = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
        const lastAction = daysDiff === 0 ? 'today' : daysDiff === 1 ? '1 day ago' : `${daysDiff} days ago`;
        
        const stage = statusMap[decision.status] || decision.status;
        
        document.getElementById('active-decision-title').textContent = 
            decision.title || decision.situation.substring(0, 80) + '...';
        document.getElementById('active-decision-status-line').textContent = 
            `Status: ${stage} - Reviewed: ${lastAction.charAt(0).toUpperCase() + lastAction.slice(1)}`;
        
        const activeCard = document.getElementById('active-decision-card');
        activeCard.onclick = () => navigateToDecision(decision.id);
        document.getElementById('open-decision-btn').onclick = (e) => {
            e.stopPropagation();
            navigateToDecision(decision.id);
        };
    } else {
        activeSection.style.display = 'none';
        noActiveDecision.style.display = 'block';
    }
}

function renderLibraryView() {
    const decisionsFilter = document.getElementById('decisions-filter');
    renderAllDecisions(decisionsFilter.value);
    decisionsFilter.onchange = () => renderAllDecisions(decisionsFilter.value);
}

function renderSettingsView() {
    if (!currentUser) return;
    
    const displayName = currentUser.display_name 
        || currentUser.user_metadata?.display_name 
        || currentUser.raw_user_meta_data?.display_name
        || '';
    const email = currentUser.email || '';
    
    const displayNameInput = document.getElementById('settings-display-name-hub');
    const emailInput = document.getElementById('settings-email-hub');
    
    if (displayNameInput) displayNameInput.value = displayName;
    if (emailInput) emailInput.value = email;
}

function updateHeaderUsername() {
    if (!currentUser) return;
    
    const displayName = currentUser.display_name 
        || currentUser.user_metadata?.display_name 
        || currentUser.raw_user_meta_data?.display_name
        || currentUser.email?.split('@')[0] 
        || 'User';
    
    const usernameElements = [
        document.getElementById('header-username'),
        document.getElementById('header-username-first')
    ];
    
    usernameElements.forEach(el => {
        if (el) el.textContent = displayName;
    });
}

function renderAllDecisions(filter = 'all') {
    const decisionsList = document.getElementById('decisions-list');
    const libraryEmptyState = document.getElementById('library-empty-state');
    const libraryTitle = document.getElementById('library-title');
    decisionsList.innerHTML = '';
    
    let allDecisionsToShow = [];
    
    if (allDecisions.active) {
        allDecisionsToShow.push(allDecisions.active);
    }
    allDecisionsToShow = allDecisionsToShow.concat(allDecisions.resolved);
    
    let decisions = [];
    
    if (filter === 'all') {
        decisions = allDecisionsToShow;
    } else if (filter === 'draft') {
        decisions = allDecisionsToShow.filter(d => d.status === 'in_progress');
    } else if (filter === 'in_review') {
        decisions = allDecisionsToShow.filter(d => d.status === 'under_review');
    } else if (filter === 'committed') {
        decisions = allDecisionsToShow.filter(
            d => d.status === 'resolved' || d.status === 'responded'
        );
    } else if (filter === 'archived') {
        decisions = allDecisionsToShow.filter(d => d.status === 'archived');
    }
    
    const totalCount = allDecisionsToShow.length;
    libraryTitle.textContent = `Decision library${totalCount > 0 ? ` (${totalCount})` : ''}`;
    
    if (decisions.length === 0 && totalCount === 0) {
        decisionsList.style.display = 'none';
        libraryEmptyState.style.display = 'block';
        return;
    }
    
    decisionsList.style.display = 'flex';
    libraryEmptyState.style.display = 'none';
    
    if (decisions.length === 0) {
        decisionsList.innerHTML = '<div class="empty-state">No decisions found.</div>';
        return;
    }
    
    decisions.forEach(decision => {
        const isActive = allDecisions.active && decision.id === allDecisions.active.id;
        
        const row = document.createElement('div');
        row.className = isActive ? 'decision-row decision-row-active' : 'decision-row';
        row.onclick = () => navigateToDecision(decision.id);
        
        const statusMap = {
            'in_progress': 'Draft',
            'under_review': 'In review',
            'responded': 'Committed',
            'resolved': 'Committed'
        };
        
        const now = new Date();
        const updated = new Date(decision.updated_at);
        const daysDiff = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
        const lastAction = daysDiff === 0 ? 'today' : daysDiff === 1 ? '1 day ago' : `${daysDiff} days ago`;
        
        const stage = statusMap[decision.status] || decision.status;
        const activeIndicator = isActive ? '<span class="decision-active-badge">Active</span>' : '';
        
        row.innerHTML = `
            <div class="decision-row-content">
                <div class="decision-row-title">${escapeHtml(decision.title || decision.situation.substring(0, 60) + '...')}${activeIndicator}</div>
                <div class="decision-row-meta">${stage} - Last reviewed ${lastAction}</div>
            </div>
            <span class="decision-row-action">Open</span>
        `;
        
        decisionsList.appendChild(row);
    });
}

let decisionStepData = {
    title: '',
    stakes: '',
    deadline: null,
    options: [{ label: 'A', prosCons: '' }, { label: 'B', prosCons: '' }],
    favorite: null,
    choice: '',
    reasoning: '',
    changeMind: '',
    firstAction: ''
};

function startDecisionStep1() {
    decisionStepData = {
        title: '',
        stakes: '',
        deadline: null,
        options: [{ label: 'A', prosCons: '' }, { label: 'B', prosCons: '' }],
        favorite: null,
        choice: '',
        reasoning: '',
        changeMind: '',
        firstAction: ''
    };
    
    document.getElementById('step1-title').value = '';
    document.getElementById('step1-stakes').value = '';
    document.getElementById('step1-time-sensitive').checked = false;
    document.getElementById('step1-deadline').value = '';
    document.getElementById('step1-deadline').style.display = 'none';
    
    showState('decision-step1-state');
}

function proceedToStep2() {
    decisionStepData.title = document.getElementById('step1-title').value;
    decisionStepData.stakes = document.getElementById('step1-stakes').value;
    
    if (document.getElementById('step1-time-sensitive').checked) {
        decisionStepData.deadline = document.getElementById('step1-deadline').value;
    }
    
    if (!decisionStepData.title || !decisionStepData.stakes) {
        alert('Please fill in all required fields');
        return;
    }
    
    renderStep2();
    showState('decision-step2-state');
}

function renderStep2() {
    const container = document.getElementById('step2-options-container');
    container.innerHTML = '';
    
    decisionStepData.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'step2-option';
        
        optionDiv.innerHTML = `
            <label class="step2-option-label">Option ${option.label}</label>
            <label class="form-label" style="font-size: 0.875rem; margin-top: 8px;">Pros/Cons</label>
            <textarea class="input" rows="3" data-option-index="${index}">${option.prosCons}</textarea>
        `;
        
        container.appendChild(optionDiv);
    });
    
    const radiosContainer = document.getElementById('step2-favorite-radios');
    radiosContainer.innerHTML = '';
    
    decisionStepData.options.forEach((option, index) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'favorite';
        radio.value = index;
        radio.checked = decisionStepData.favorite === index;
        
        label.appendChild(radio);
        label.appendChild(document.createTextNode(`Option ${option.label}`));
        radiosContainer.appendChild(label);
    });
}

function proceedToStep3() {
    const textareas = document.querySelectorAll('#step2-options-container textarea');
    textareas.forEach((ta, index) => {
        decisionStepData.options[index].prosCons = ta.value;
    });
    
    const favoriteRadio = document.querySelector('input[name="favorite"]:checked');
    if (favoriteRadio) {
        decisionStepData.favorite = parseInt(favoriteRadio.value);
    }
    
    renderStep3();
    showState('decision-step3-state');
}

function renderStep3() {
    const choiceSelect = document.getElementById('step3-choice');
    choiceSelect.innerHTML = '<option value="">Select option...</option>';
    
    decisionStepData.options.forEach((option, index) => {
        const optionEl = document.createElement('option');
        optionEl.value = index;
        optionEl.textContent = `Option ${option.label}`;
        choiceSelect.appendChild(optionEl);
    });
    
    if (decisionStepData.favorite !== null) {
        choiceSelect.value = decisionStepData.favorite;
    }
}

async function saveDecisionFromSteps() {
    const choiceIndex = parseInt(document.getElementById('step3-choice').value);
    if (isNaN(choiceIndex)) {
        alert('Please select your choice');
        return;
    }
    
    decisionStepData.choice = choiceIndex;
    decisionStepData.reasoning = document.getElementById('step3-reasoning').value;
    decisionStepData.changeMind = document.getElementById('step3-change-mind').value;
    decisionStepData.firstAction = document.getElementById('step3-first-action').value;
    
    const sessionData = localStorage.getItem('session');
    const session = sessionData ? JSON.parse(sessionData) : null;
    const accessToken = session?.access_token;
    
    if (!accessToken) {
        alert('Not authenticated');
        return;
    }
    
    const chosenOption = decisionStepData.options[choiceIndex];
    
    const payload = {
        situation: decisionStepData.title,
        title: decisionStepData.title,
        stakes: decisionStepData.stakes,
        deadline: decisionStepData.deadline,
        option_a: decisionStepData.options[0]?.prosCons || null,
        option_b: decisionStepData.options[1]?.prosCons || null,
        option_c: decisionStepData.options[2]?.prosCons || null,
        choice: `Option ${chosenOption.label}`,
        reasoning: decisionStepData.reasoning,
        change_mind: decisionStepData.changeMind,
        first_action: decisionStepData.firstAction
    };
    
    const result = await createDecision(payload.situation);
    
    if (result.success) {
        const updateResult = await updateDecision(result.decision_id, payload);
        if (updateResult.success) {
            await loadHubData();
            if (allDecisions.active) {
                renderDecisionSummary(allDecisions.active);
            }
        }
    } else {
        alert(result.error || 'Failed to save decision');
    }
}

function renderDecisionSummary(decision) {
    currentDecision = decision;
    
    document.getElementById('summary-title').textContent = decision.title || 'Decision';
    
    const statusMap = {
        'in_progress': 'Draft',
        'under_review': 'Under review',
        'responded': 'Responded',
        'resolved': 'Resolved'
    };
    
    document.getElementById('summary-stage').textContent = statusMap[decision.status] || 'Committed';
    
    const date = new Date(decision.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    document.getElementById('summary-date').textContent = date;
    
    document.getElementById('summary-stakes').textContent = decision.stakes || 'Not specified';
    
    const optionsContainer = document.getElementById('summary-options');
    optionsContainer.innerHTML = '';
    
    [decision.option_a, decision.option_b, decision.option_c].forEach((opt, index) => {
        if (opt) {
            const optDiv = document.createElement('div');
            optDiv.className = 'summary-option';
            optDiv.textContent = `Option ${String.fromCharCode(65 + index)}: ${opt}`;
            optionsContainer.appendChild(optDiv);
        }
    });
    
    document.getElementById('summary-reasoning').textContent = decision.reasoning || decision.choice || 'Not specified';
    
    showState('decision-summary-state');
}

function renderFeedback(feedbackList) {
    const container = document.getElementById('feedback-list');
    container.innerHTML = '';
    
    if (feedbackList.length === 0) {
        container.innerHTML = '<p class="feedback-empty">No feedback yet. Admin will respond when your decision is under review.</p>';
        return;
    }
    
    feedbackList.forEach(item => {
        const feedbackItem = document.createElement('div');
        feedbackItem.className = `feedback-item feedback-item--${item.author_type}`;
        
        const timestamp = new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        feedbackItem.innerHTML = `
            <div class="feedback-meta">
                <span class="feedback-author">${item.author_type === 'admin' ? 'Admin' : 'You'}</span>
                <span class="feedback-time">${timestamp}</span>
            </div>
            <div class="feedback-content">${escapeHtml(item.content)}</div>
        `;
        
        container.appendChild(feedbackItem);
    });
    
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function navigateToHub() {
    await loadHubData();
    renderHub();
}

async function navigateToDecision(decisionId) {
    const result = await getActiveDecision();
    
    if (result.success && result.decision) {
        currentFeedback = result.feedback || [];
        renderDecisionSummary(result.decision);
    }
}

async function loadHubData() {
    const activeResult = await getActiveDecision();
    const archiveResult = await getArchive();
    
    allDecisions.active = activeResult.success ? activeResult.decision : null;
    allDecisions.resolved = archiveResult.success ? archiveResult.decisions : [];
}

async function initialize() {
    console.log('[WORKSPACE] Initializing workspace...');
    const authStatus = await checkAuthStatus();

    if (!authStatus.authenticated || !authStatus.user) {
        console.warn('[WORKSPACE] Not authenticated');
        showState('unauthorized-state');
        return;
    }

    currentUser = authStatus.user;
    console.log('[WORKSPACE] User authenticated:', currentUser.email);

    if (!currentUser.paid) {
        console.warn('[WORKSPACE] User not paid');
        showState('unpaid-state');
        return;
    }

    const result = await getActiveDecision();
    
    if (!result.success) {
        console.error('[WORKSPACE] Failed to get active decision');
        showState('unauthorized-state');
        return;
    }

    if (result.decision || (await getArchive()).success) {
        await navigateToHub();
    } else {
        updateHeaderUsername();
        showState('first-time-state');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[id^="logout-btn"]').forEach(btn => {
        btn.addEventListener('click', logout);
    });

    setupUserAccountDropdowns();

    const initialStartBtn = document.getElementById('initial-start-btn');
    if (initialStartBtn) {
        initialStartBtn.addEventListener('click', function() {
            startDecisionStep1();
        });
    }
    
    function setupUserAccountDropdowns() {
        const dropdowns = [
            { trigger: 'user-account-trigger', dropdown: 'user-account-dropdown' },
            { trigger: 'user-account-trigger-first', dropdown: 'user-account-dropdown-first' }
        ];
        
        dropdowns.forEach(({ trigger, dropdown }) => {
            const triggerEl = document.getElementById(trigger);
            const dropdownEl = document.getElementById(dropdown);
            
            if (triggerEl && dropdownEl) {
                triggerEl.addEventListener('click', function(e) {
                    e.stopPropagation();
                    dropdownEl.classList.toggle('active');
                    
                    document.querySelectorAll('.user-account-dropdown').forEach(dd => {
                        if (dd !== dropdownEl) dd.classList.remove('active');
                    });
                });
                
                dropdownEl.querySelectorAll('.user-account-dropdown-item').forEach(item => {
                    item.addEventListener('click', async function() {
                        const action = this.id || this.dataset.action;
                        
                        if (action === 'account-logout' || action === 'logout') {
                            await logout();
                        } else if (action === 'account-payment' || action === 'payment') {
                            await openCustomerPortal();
                        }
                        
                        dropdownEl.classList.remove('active');
                    });
                });
            }
        });
        
        document.addEventListener('click', function() {
            document.querySelectorAll('.user-account-dropdown').forEach(dd => {
                dd.classList.remove('active');
            });
        });
    }



    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentDecision) return;
            
            const input = document.getElementById('feedback-input');
            const content = input.value.trim();
            
            if (!content) return;
            
            const submitBtn = feedbackForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            
            const result = await addFeedback(currentDecision.id, content);
            
            if (result.success) {
                input.value = '';
                await navigateToDecision(currentDecision.id);
            } else {
                alert('Failed to send feedback');
            }
            
            submitBtn.disabled = false;
        });
    }

    const startNewBtn = document.getElementById('start-new-decision-btn');
    if (startNewBtn) {
        startNewBtn.addEventListener('click', function() {
            startDecisionStep1();
        });
    }
    
    const step1TimeSensitive = document.getElementById('step1-time-sensitive');
    if (step1TimeSensitive) {
        step1TimeSensitive.addEventListener('change', function() {
            const deadlineField = document.getElementById('step1-deadline');
            if (this.checked) {
                deadlineField.style.display = 'block';
            } else {
                deadlineField.style.display = 'none';
            }
        });
    }
    
    const step1NextBtn = document.getElementById('step1-next');
    if (step1NextBtn) {
        step1NextBtn.addEventListener('click', proceedToStep2);
    }
    
    const backFromStep1 = document.getElementById('back-from-step1');
    if (backFromStep1) {
        backFromStep1.addEventListener('click', async function() {
            await navigateToHub();
        });
    }
    
    const step2NextBtn = document.getElementById('step2-next');
    if (step2NextBtn) {
        step2NextBtn.addEventListener('click', proceedToStep3);
    }
    
    const backFromStep2 = document.getElementById('back-from-step2');
    if (backFromStep2) {
        backFromStep2.addEventListener('click', function() {
            showState('decision-step1-state');
        });
    }
    
    const step3SaveBtn = document.getElementById('step3-save');
    if (step3SaveBtn) {
        step3SaveBtn.addEventListener('click', saveDecisionFromSteps);
    }
    
    const backFromStep3 = document.getElementById('back-from-step3');
    if (backFromStep3) {
        backFromStep3.addEventListener('click', function() {
            renderStep2();
            showState('decision-step2-state');
        });
    }
    
    const backFromSummary = document.getElementById('back-from-summary');
    if (backFromSummary) {
        backFromSummary.addEventListener('click', async function() {
            await navigateToHub();
        });
    }
    
    const summaryEditBtn = document.getElementById('summary-edit');
    if (summaryEditBtn) {
        summaryEditBtn.addEventListener('click', function() {
            if (currentDecision) {
                startDecisionStep1();
            }
        });
    }
    
    const summarySupportBtn = document.getElementById('summary-support');
    if (summarySupportBtn) {
        summarySupportBtn.addEventListener('click', function() {
            const modal = document.getElementById('support-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }

    const requestSupportBtn = document.getElementById('request-support-btn');
    if (requestSupportBtn) {
        requestSupportBtn.addEventListener('click', function() {
            const modal = document.getElementById('support-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }

    const supportCancel = document.getElementById('support-cancel');
    if (supportCancel) {
        supportCancel.addEventListener('click', function() {
            const modal = document.getElementById('support-modal');
            if (modal) {
                modal.style.display = 'none';
                document.getElementById('support-form').reset();
            }
        });
    }

    const supportForm = document.getElementById('support-form');
    if (supportForm) {
        supportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentDecision) {
                alert('Please create a decision first to request support.');
                return;
            }
            
            const reason = document.getElementById('support-reason').value;
            const details = document.getElementById('support-details').value.trim();
            
            if (!details) return;
            
            const content = `[Support Request - ${reason}]\n\n${details}`;
            const result = await addFeedback(currentDecision.id, content);
            
            if (result.success) {
                const modal = document.getElementById('support-modal');
                if (modal) modal.style.display = 'none';
                supportForm.reset();
                alert('Support request sent. We\'ll respond shortly.');
            } else {
                alert('Failed to send support request. Please try again.');
            }
        });
    }

    const viewInsightsBtn = document.getElementById('view-insights-btn');
    if (viewInsightsBtn) {
        viewInsightsBtn.addEventListener('click', function() {
            renderInsights();
            showState('insights-state');
        });
    }

    const backToHubInsights = document.getElementById('back-to-hub-insights');
    if (backToHubInsights) {
        backToHubInsights.addEventListener('click', async function() {
            await navigateToHub();
        });
    }

    const backToHubBtn = document.getElementById('back-to-hub-btn');
    if (backToHubBtn) {
        backToHubBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await navigateToHub();
        });
    }

    const backFromSettings = document.getElementById('back-from-settings');
    if (backFromSettings) {
        backFromSettings.addEventListener('click', async function() {
            await navigateToHub();
        });
    }

    const settingsDisplayName = document.getElementById('settings-display-name');
    if (settingsDisplayName) {
        settingsDisplayName.addEventListener('input', function() {
            saveSettings();
        });
    }

    const libraryStartBtn = document.getElementById('library-start-btn');
    if (libraryStartBtn) {
        libraryStartBtn.addEventListener('click', function() {
            startDecisionStep1();
        });
    }

    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const viewName = this.getAttribute('data-view');
            switchView(viewName);
        });
    });

    const settingsDisplayNameHub = document.getElementById('settings-display-name-hub');
    if (settingsDisplayNameHub) {
        settingsDisplayNameHub.addEventListener('input', function() {
            saveSettingsHub();
        });
    }

    initialize();
});

function renderInsights() {
    const resolvedCount = allDecisions.resolved.length;
    
    document.getElementById('insights-resolved').textContent = resolvedCount;
    
    if (resolvedCount > 0) {
        const totalResolutionTime = allDecisions.resolved.reduce((sum, d) => {
            const created = new Date(d.created_at);
            const resolved = new Date(d.resolved_at);
            return sum + (resolved - created);
        }, 0);
        const avgDays = Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24));
        document.getElementById('insights-avg-time').textContent = avgDays > 0 ? `${avgDays} days` : '< 1 day';
        
        const lastResolved = new Date(allDecisions.resolved[0].resolved_at);
        const daysAgo = Math.floor((new Date() - lastResolved) / (1000 * 60 * 60 * 24));
        const lastResolvedText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
        document.getElementById('insights-last-resolved').textContent = lastResolvedText;
    } else {
        document.getElementById('insights-avg-time').textContent = '—';
        document.getElementById('insights-last-resolved').textContent = '—';
    }
    
    const recentList = document.getElementById('insights-recent-list');
    if (recentList) {
        recentList.innerHTML = '';
        
        if (allDecisions.resolved.length === 0) {
            recentList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No resolved decisions yet.</p>';
        } else {
            const recent = allDecisions.resolved.slice(0, 5);
            recent.forEach(decision => {
                const item = document.createElement('div');
                item.className = 'insights-recent-item';
                
                const resolved = new Date(decision.resolved_at);
                const dateStr = resolved.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                
                item.innerHTML = `
                    <div class="insights-recent-title">${escapeHtml(decision.title || decision.situation?.substring(0, 60) + '...')}</div>
                    <div class="insights-recent-date">${dateStr}</div>
                `;
                
                recentList.appendChild(item);
            });
        }
    }
}
