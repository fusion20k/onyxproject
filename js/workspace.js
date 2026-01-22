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
    const activeCard = document.getElementById('active-decision-card');
    const noActiveDecision = document.getElementById('no-active-decision');
    const decisionsList = document.getElementById('decisions-list');
    const decisionsFilter = document.getElementById('decisions-filter');
    
    if (allDecisions.active) {
        const decision = allDecisions.active;
        activeCard.style.display = 'flex';
        noActiveDecision.style.display = 'none';
        
        const statusMap = {
            'in_progress': 'In progress',
            'under_review': 'Under review',
            'responded': 'Responded',
            'resolved': 'Resolved'
        };
        
        document.getElementById('active-decision-title').textContent = 
            decision.title || decision.situation.substring(0, 80) + '...';
        document.getElementById('active-decision-stage').textContent = 
            statusMap[decision.status] || decision.status;
        document.getElementById('active-decision-next').textContent = 
            decision.status === 'in_progress' ? 'Complete decision form' : 'Review feedback';
        
        document.getElementById('open-decision-btn').onclick = () => navigateToDecision(decision.id);
    } else {
        activeCard.style.display = 'none';
        noActiveDecision.style.display = 'block';
    }
    
    renderAllDecisions(decisionsFilter.value);
    
    decisionsFilter.onchange = () => renderAllDecisions(decisionsFilter.value);
    
    showState('hub-state');
}

function renderAllDecisions(filter = 'all') {
    const decisionsList = document.getElementById('decisions-list');
    decisionsList.innerHTML = '';
    
    let decisions = [];
    
    if (filter === 'all') {
        if (allDecisions.active) decisions.push(allDecisions.active);
        decisions = decisions.concat(allDecisions.resolved);
    } else if (filter === 'active') {
        if (allDecisions.active) decisions.push(allDecisions.active);
    } else if (filter === 'resolved') {
        decisions = allDecisions.resolved;
    }
    
    if (decisions.length === 0) {
        decisionsList.innerHTML = '<div class="empty-state">No decisions found.</div>';
        return;
    }
    
    decisions.forEach(decision => {
        const row = document.createElement('div');
        row.className = 'decision-row';
        row.style.cursor = 'pointer';
        row.onclick = () => navigateToDecision(decision.id);
        
        const timestamp = new Date(decision.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        const statusText = decision.status === 'resolved' ? 'Resolved' : 'Active';
        
        row.innerHTML = `
            <div>
                <div class="decision-row-title">${escapeHtml(decision.title || decision.situation.substring(0, 60) + '...')}</div>
                <div class="decision-row-meta">${statusText} • Updated ${timestamp}</div>
            </div>
        `;
        
        decisionsList.appendChild(row);
    });
}

function renderDecisionForm(decision) {
    currentDecision = decision;
    
    const titleInput = document.getElementById('decision-title-input');
    titleInput.value = decision.title || '';
    titleInput.addEventListener('input', setupAutosave);
    
    const statusMap = {
        'in_progress': 'In progress',
        'under_review': 'Under review',
        'responded': 'Responded',
        'resolved': 'Resolved'
    };
    document.getElementById('decision-stage-text').textContent = `Stage: ${statusMap[decision.status] || decision.status}`;
    
    const updatedDate = new Date(decision.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
    document.getElementById('decision-updated-text').textContent = `Updated ${updatedDate}`;
    
    const contextEl = document.getElementById('context');
    contextEl.value = decision.context || '';
    contextEl.addEventListener('input', setupAutosave);
    
    const choiceEl = document.getElementById('choice');
    choiceEl.value = decision.choice || '';
    choiceEl.addEventListener('input', setupAutosave);
    
    const expectationsEl = document.getElementById('expectations');
    expectationsEl.value = decision.expectations || '';
    expectationsEl.addEventListener('input', setupAutosave);
    
    const feelingsEl = document.getElementById('feelings');
    feelingsEl.value = decision.feelings || '';
    feelingsEl.addEventListener('input', setupAutosave);
    
    const risksEl = document.getElementById('risks');
    risksEl.value = decision.risks || '';
    risksEl.addEventListener('input', setupAutosave);
    
    const nextStep1 = document.getElementById('next-step-1');
    nextStep1.value = decision.next_step_1 || '';
    nextStep1.addEventListener('input', setupAutosave);
    
    const nextStep2 = document.getElementById('next-step-2');
    nextStep2.value = decision.next_step_2 || '';
    nextStep2.addEventListener('input', setupAutosave);
    
    const nextStep3 = document.getElementById('next-step-3');
    nextStep3.value = decision.next_step_3 || '';
    nextStep3.addEventListener('input', setupAutosave);
    
    renderOptions(decision);
    
    const isResolved = decision.status === 'resolved';
    if (isResolved) {
        document.querySelectorAll('#decision-form-state textarea, #decision-form-state input').forEach(el => {
            el.disabled = true;
        });
    }
    
    showState('decision-form-state');
}

function renderOptions(decision) {
    const optionsList = document.getElementById('options-list');
    optionsList.innerHTML = '';
    
    const options = [
        { key: 'option_a', value: decision.option_a },
        { key: 'option_b', value: decision.option_b },
        { key: 'option_c', value: decision.option_c }
    ].filter(opt => opt.value);
    
    if (options.length === 0) {
        options.push({ key: 'option_a', value: '' }, { key: 'option_b', value: '' });
    }
    
    options.forEach((opt, index) => {
        const optionBlock = document.createElement('div');
        optionBlock.className = 'option-block';
        
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = `Option ${String.fromCharCode(65 + index)}`;
        
        const textarea = document.createElement('textarea');
        textarea.className = 'input';
        textarea.rows = 3;
        textarea.placeholder = 'Describe this option...';
        textarea.value = opt.value || '';
        textarea.dataset.optionKey = opt.key;
        textarea.addEventListener('input', () => setupAutosave());
        
        optionBlock.appendChild(label);
        optionBlock.appendChild(textarea);
        optionsList.appendChild(optionBlock);
    });
}

let autosaveTimeout = null;
let isSaving = false;

function setupAutosave() {
    if (isSaving || !currentDecision) return;
    
    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(async () => {
        await performAutosave();
    }, 1000);
}

async function performAutosave() {
    if (!currentDecision) return;
    
    isSaving = true;
    
    const optionTextareas = document.querySelectorAll('#options-list textarea');
    const updates = {
        title: document.getElementById('decision-title-input')?.value || null,
        context: document.getElementById('context')?.value || null,
        choice: document.getElementById('choice')?.value || null,
        expectations: document.getElementById('expectations')?.value || null,
        feelings: document.getElementById('feelings')?.value || null,
        risks: document.getElementById('risks')?.value || null,
        next_step_1: document.getElementById('next-step-1')?.value || null,
        next_step_2: document.getElementById('next-step-2')?.value || null,
        next_step_3: document.getElementById('next-step-3')?.value || null
    };
    
    optionTextareas.forEach((textarea, index) => {
        const key = textarea.dataset.optionKey || `option_${String.fromCharCode(97 + index)}`;
        updates[key] = textarea.value || null;
    });
    
    await updateDecision(currentDecision.id, updates);
    
    isSaving = false;
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
