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

function renderHub() {
    const activeCount = allDecisions.active ? 1 : 0;
    const resolvedCount = allDecisions.resolved.length;
    const momentum = calculateClarityMomentum(allDecisions);
    
    document.getElementById('active-count').textContent = activeCount;
    document.getElementById('resolved-count').textContent = resolvedCount;
    
    const momentumElement = document.getElementById('clarity-momentum');
    if (momentumElement) {
        momentumElement.textContent = momentum;
        momentumElement.className = `hub-stat-value hub-stat-value--momentum hub-stat-value--${momentum.toLowerCase()}`;
    }
    
    if (currentUser) {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            const displayName = currentUser.display_name || currentUser.email?.split('@')[0] || 'User';
            userDisplay.textContent = displayName;
        }
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
    document.querySelectorAll('[id^="logout-btn"]').forEach(btn => {
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
