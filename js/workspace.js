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

function renderHub() {
    const activeCount = allDecisions.active ? 1 : 0;
    const resolvedCount = allDecisions.resolved.length;
    
    document.getElementById('active-count').textContent = activeCount;
    document.getElementById('resolved-count').textContent = resolvedCount;
    
    if (resolvedCount > 0) {
        const totalResolutionTime = allDecisions.resolved.reduce((sum, d) => {
            const created = new Date(d.created_at);
            const resolved = new Date(d.resolved_at);
            return sum + (resolved - created);
        }, 0);
        const avgDays = Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24));
        document.getElementById('avg-time').textContent = `${avgDays}d`;
    } else {
        document.getElementById('avg-time').textContent = '—';
    }
    
    const decisionsList = document.getElementById('decisions-list');
    const noDecisions = document.getElementById('no-decisions');
    const startBtn = document.getElementById('start-new-decision-btn');
    
    decisionsList.innerHTML = '';
    
    if (allDecisions.active) {
        noDecisions.style.display = 'none';
        decisionsList.style.display = 'flex';
        
        const decision = allDecisions.active;
        const card = document.createElement('div');
        card.className = 'hub-decision-card';
        card.onclick = () => navigateToDecision(decision.id);
        
        const statusMap = {
            'in_progress': 'In Progress',
            'under_review': 'Under Review',
            'responded': 'Responded',
            'resolved': 'Resolved'
        };
        
        const timestamp = new Date(decision.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        card.innerHTML = `
            <div class="hub-decision-info">
                <div class="hub-decision-title">${escapeHtml(decision.title || decision.situation.substring(0, 50) + '...')}</div>
                <div class="hub-decision-meta">Last updated ${timestamp}</div>
            </div>
            <div class="hub-decision-badge hub-decision-badge--${decision.status}">
                ${statusMap[decision.status]}
            </div>
        `;
        
        decisionsList.appendChild(card);
        startBtn.disabled = true;
    } else {
        decisionsList.style.display = 'none';
        noDecisions.style.display = 'block';
        startBtn.disabled = false;
    }
    
    showState('hub-state');
}

function renderDecisionForm(decision) {
    currentDecision = decision;
    
    document.getElementById('situation-display').textContent = decision.situation;
    document.getElementById('context').value = decision.context || '';
    document.getElementById('option-a').value = decision.option_a || '';
    document.getElementById('option-b').value = decision.option_b || '';
    document.getElementById('option-c').value = decision.option_c || '';
    document.getElementById('risks').value = decision.risks || '';
    document.getElementById('unknowns').value = decision.unknowns || '';
    
    const statusBadge = document.getElementById('status-badge');
    const statusMap = {
        'in_progress': 'In Progress',
        'under_review': 'Under Review',
        'responded': 'Responded',
        'resolved': 'Resolved'
    };
    statusBadge.textContent = statusMap[decision.status] || decision.status;
    statusBadge.className = `workspace-status-badge workspace-status-badge--${decision.status}`;
    
    if (decision.status !== 'in_progress') {
        const feedbackSection = document.getElementById('feedback-section');
        feedbackSection.style.display = 'block';
        renderFeedback(currentFeedback);
    }
    
    if (decision.status === 'resolved') {
        document.querySelectorAll('#decision-form-state textarea').forEach(el => {
            el.disabled = true;
        });
        document.getElementById('save-decision-btn').style.display = 'none';
    }
    
    showState('decision-form-state');
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
        renderDecisionForm(result.decision);
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

    const sidebar = document.getElementById('workspace-sidebar');
    if (sidebar) {
        sidebar.style.display = 'block';
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
        showState('first-time-state');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[id^="logout-btn"], #sidebar-logout-btn').forEach(btn => {
        btn.addEventListener('click', logout);
    });

    const initialForm = document.getElementById('initial-decision-form');
    if (initialForm) {
        initialForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const situation = document.getElementById('situation').value.trim();
            
            if (situation.length < 20) {
                alert('Please provide more detail about your situation (minimum 20 characters).');
                return;
            }
            
            const submitBtn = initialForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';
            
            const result = await createDecision(situation);
            
            if (result.success) {
                await navigateToHub();
            } else {
                alert(result.error || 'Failed to create decision');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Continue';
            }
        });
    }

    const saveBtn = document.getElementById('save-decision-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            if (!currentDecision) return;
            
            const updates = {
                context: document.getElementById('context').value,
                option_a: document.getElementById('option-a').value,
                option_b: document.getElementById('option-b').value,
                option_c: document.getElementById('option-c').value,
                risks: document.getElementById('risks').value,
                unknowns: document.getElementById('unknowns').value
            };
            
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            const result = await updateDecision(currentDecision.id, updates);
            
            if (result.success) {
                saveBtn.textContent = 'Saved';
                setTimeout(async () => {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Progress';
                    await navigateToDecision(currentDecision.id);
                }, 1000);
            } else {
                alert('Failed to save progress');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Progress';
            }
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
            showState('first-time-state');
        });
    }

    const requestSupportBtn = document.getElementById('request-support-btn');
    if (requestSupportBtn) {
        requestSupportBtn.addEventListener('click', function() {
            alert('Support functionality coming soon. Please email support@onyx-project.com for assistance.');
        });
    }

    const viewInsightsBtn = document.getElementById('view-insights-btn');
    if (viewInsightsBtn) {
        viewInsightsBtn.addEventListener('click', function() {
            alert('Insights functionality coming soon.');
        });
    }

    const navWorkspace = document.getElementById('nav-workspace');
    if (navWorkspace) {
        navWorkspace.addEventListener('click', async function(e) {
            e.preventDefault();
            document.querySelectorAll('.workspace-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            navWorkspace.classList.add('active');
            await navigateToHub();
        });
    }

    const navArchive = document.getElementById('nav-archive');
    if (navArchive) {
        navArchive.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.workspace-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            navArchive.classList.add('active');
            alert('Archive view coming soon.');
        });
    }

    const backToHubBtn = document.getElementById('back-to-hub-btn');
    if (backToHubBtn) {
        backToHubBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            document.querySelectorAll('.workspace-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            const navWorkspace = document.getElementById('nav-workspace');
            if (navWorkspace) {
                navWorkspace.classList.add('active');
            }
            await navigateToHub();
        });
    }

    initialize();
});
