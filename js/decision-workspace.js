const API_BASE_URL = '/api';

let currentUser = null;
let currentDecision = null;
let currentOptions = [];
let currentRecommendation = null;
let selectedOptionId = null;

function showDialog(message, isConfirm = false) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('custom-dialog');
        const messageEl = document.getElementById('custom-dialog-message');
        const confirmBtn = document.getElementById('custom-dialog-confirm');
        const cancelBtn = document.getElementById('custom-dialog-cancel');
        
        messageEl.textContent = message;
        
        if (isConfirm) {
            cancelBtn.style.display = 'inline-block';
            confirmBtn.textContent = 'OK';
        } else {
            cancelBtn.style.display = 'none';
            confirmBtn.textContent = 'OK';
        }
        
        dialog.style.display = 'flex';
        
        const handleConfirm = () => {
            dialog.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };
        
        const handleCancel = () => {
            dialog.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

function customAlert(message) {
    return showDialog(message, false);
}

function customConfirm(message) {
    return showDialog(message, true);
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
        console.error('Auth check error:', error);
        return { authenticated: false };
    }
}

async function loadActiveDecision() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/decisions/active`, {
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
        return data;
    } catch (error) {
        console.error('Error loading decision:', error);
        return { success: false };
    }
}

async function loadDecisionById(decisionId) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/decisions/library/${decisionId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading decision by ID:', error);
        return { success: false };
    }
}

async function confirmUnderstanding(decisionId, updates) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}/confirm-understanding`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include',
            body: JSON.stringify(updates)
        });

        return await response.json();
    } catch (error) {
        console.error('Error confirming understanding:', error);
        return { success: false };
    }
}

async function commitDecision(decisionId, note, selectedOptionId) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}/commit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include',
            body: JSON.stringify({ 
                note,
                selected_option_id: selectedOptionId 
            })
        });

        return await response.json();
    } catch (error) {
        console.error('Error committing decision:', error);
        return { success: false };
    }
}

async function deleteDecision(decisionId) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        return await response.json();
    } catch (error) {
        console.error('Error deleting decision:', error);
        return { success: false };
    }
}

async function askFollowup(decisionId, question) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}/ask-followup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include',
            body: JSON.stringify({ question })
        });

        return await response.json();
    } catch (error) {
        console.error('Error asking followup:', error);
        return { success: false };
    }
}

function showState(stateId) {
    document.querySelectorAll('.workspace-state').forEach(state => {
        state.style.display = 'none';
    });
    const targetState = document.getElementById(stateId);
    if (targetState) {
        targetState.style.display = 'block';
    }
}

function renderDecision(decision, options, recommendation, followups) {
    currentDecision = decision;
    currentOptions = options;
    currentRecommendation = recommendation;

    document.getElementById('no-decision-state').style.display = 'none';
    document.getElementById('decision-view').style.display = 'block';

    renderUnderstanding(decision);
    renderStressTests(options);
    renderRecommendation(recommendation, options);
    renderSidebar(decision);
    
    const isCommitted = decision.status === 'committed';
    document.getElementById('active-decision-actions').style.display = isCommitted ? 'none' : 'flex';
    document.getElementById('committed-decision-actions').style.display = isCommitted ? 'flex' : 'none';
    
    if (followups && followups.length > 0) {
        renderFollowups(followups);
        document.getElementById('followup-card').style.display = 'block';
    }
}

function renderUnderstanding(decision) {
    document.getElementById('goal-text').textContent = decision.goal || '—';
    document.getElementById('time-horizon-text').textContent = decision.time_horizon || '—';
    
    const constraintsText = Array.isArray(decision.constraints) && decision.constraints.length > 0
        ? decision.constraints.join(', ')
        : '—';
    document.getElementById('constraints-text').textContent = constraintsText;
    
    const optionsText = currentOptions.map(opt => opt.name).join(', ') || '—';
    document.getElementById('options-text').textContent = optionsText;

    document.getElementById('edit-goal').value = decision.goal || '';
    document.getElementById('edit-time-horizon').value = decision.time_horizon || '';
    document.getElementById('edit-constraints').value = Array.isArray(decision.constraints) 
        ? decision.constraints.join('\n') 
        : '';
    document.getElementById('edit-risk-tolerance').value = decision.risk_tolerance || 'balanced';
}

function renderStressTests(options) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    options.forEach(option => {
        const optionEl = document.createElement('div');
        optionEl.className = 'option-item';
        
        const fragilityClass = `fragility-${option.fragility_score || 'balanced'}`;
        
        optionEl.innerHTML = `
            <div class="option-header">
                <h3 class="option-name">${option.name}</h3>
                <span class="fragility-badge ${fragilityClass}">${option.fragility_score || 'balanced'}</span>
            </div>
            
            <div class="option-detail">
                <div class="option-detail-label">Upside</div>
                <div class="option-detail-text">${option.upside || '—'}</div>
            </div>
            
            <div class="option-detail">
                <div class="option-detail-label">Downside</div>
                <div class="option-detail-text">${option.downside || '—'}</div>
            </div>
            
            <div class="option-detail">
                <div class="option-detail-label">Key assumptions</div>
                <ul class="option-assumptions">
                    ${Array.isArray(option.key_assumptions) 
                        ? option.key_assumptions.map(a => `<li>${a}</li>`).join('') 
                        : '<li>—</li>'}
                </ul>
            </div>
        `;
        
        container.appendChild(optionEl);
    });
}

function renderRecommendation(recommendation, options) {
    if (!recommendation) {
        document.getElementById('recommendation-card').style.display = 'none';
        return;
    }

    const recommendedOption = options.find(opt => opt.id === recommendation.recommended_option_id);
    
    // Set default selected option to recommended
    if (!selectedOptionId) {
        selectedOptionId = recommendation.recommended_option_id;
    }
    
    document.getElementById('recommended-option-name').textContent = recommendedOption?.name || '—';
    document.getElementById('recommendation-reasoning').textContent = recommendation.reasoning || '—';
    document.getElementById('alternatives-text').textContent = recommendation.why_not_alternatives || '—';
    
    // Render selectable option cards
    renderSelectableOptions(options, recommendation.recommended_option_id);
    
    // Show execution plan for selected option
    updateExecutionPlan();
}

function renderSelectableOptions(options, recommendedOptionId) {
    const container = document.getElementById('selectable-options-container');
    container.innerHTML = '';
    
    options.forEach(option => {
        const card = document.createElement('div');
        card.className = 'selectable-option-card';
        card.dataset.optionId = option.id;
        
        if (option.id === recommendedOptionId) {
            card.classList.add('recommended');
        }
        
        if (option.id === selectedOptionId) {
            card.classList.add('selected');
        }
        
        const fragilityClass = `fragility-${option.fragility_score || 'balanced'}`;
        
        card.innerHTML = `
            <div class="selectable-option-header">
                <h3 class="selectable-option-name">${option.name}</h3>
                <span class="fragility-badge ${fragilityClass}">${option.fragility_score || 'balanced'}</span>
            </div>
            
            <div class="selectable-option-body">
                <div class="selectable-option-detail">
                    <div class="selectable-option-detail-label">Upside</div>
                    <div class="selectable-option-detail-text">${option.upside || '—'}</div>
                </div>
                
                <div class="selectable-option-detail">
                    <div class="selectable-option-detail-label">Downside</div>
                    <div class="selectable-option-detail-text">${option.downside || '—'}</div>
                </div>
                
                <div class="selectable-option-detail">
                    <div class="selectable-option-detail-label">Key assumptions</div>
                    <ul class="selectable-option-assumptions">
                        ${Array.isArray(option.key_assumptions) 
                            ? option.key_assumptions.map(a => `<li>${a}</li>`).join('') 
                            : '<li>—</li>'}
                    </ul>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => selectOption(option.id));
        
        container.appendChild(card);
    });
}

function selectOption(optionId) {
    selectedOptionId = optionId;
    
    // Update UI
    document.querySelectorAll('.selectable-option-card').forEach(card => {
        if (card.dataset.optionId === optionId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Update execution plan
    updateExecutionPlan();
}

function updateExecutionPlan() {
    const selectedOption = currentOptions.find(opt => opt.id === selectedOptionId);
    const executionPlanCard = document.getElementById('execution-plan-card');
    const executionPlanText = document.getElementById('execution-plan-text');
    
    if (!selectedOption) {
        executionPlanCard.style.display = 'none';
        return;
    }
    
    // Show execution plan if available
    // For now, generate a placeholder until backend provides execution plans for all options
    if (currentRecommendation && selectedOptionId === currentRecommendation.recommended_option_id && currentRecommendation.execution_plan) {
        executionPlanText.textContent = currentRecommendation.execution_plan;
        executionPlanCard.style.display = 'block';
    } else {
        // Generate basic guidance for non-recommended options
        executionPlanText.innerHTML = `
            <p><strong>You've selected: ${selectedOption.name}</strong></p>
            <p>To execute this option effectively:</p>
            <ol style="margin: 12px 0; padding-left: 20px;">
                <li>Validate your key assumptions first: ${Array.isArray(selectedOption.key_assumptions) ? selectedOption.key_assumptions.join(', ') : 'Review the assumptions listed above'}</li>
                <li>Monitor for downside risks: ${selectedOption.downside || 'Watch for potential failures'}</li>
                <li>Set checkpoints to measure if this is working as expected</li>
                <li>Have a fallback plan if early indicators show this isn't panning out</li>
            </ol>
            <p style="color: #888; font-size: 14px; font-style: italic;">Note: Detailed execution plans are currently only available for the recommended option. Consider asking Onyx a follow-up question for more specific guidance.</p>
        `;
        executionPlanCard.style.display = 'block';
    }
}

function renderSidebar(decision) {
    document.getElementById('sidebar-goal').textContent = decision.goal || '—';
    document.getElementById('sidebar-time-horizon').textContent = decision.time_horizon || '—';
    document.getElementById('sidebar-metric').textContent = decision.primary_metric || '—';
    document.getElementById('sidebar-risk').textContent = decision.risk_tolerance || '—';
    
    const committedDate = document.getElementById('committed-date');
    if (decision.committed_at) {
        const date = new Date(decision.committed_at).toLocaleDateString();
        committedDate.textContent = `Committed: ${date}`;
        committedDate.classList.remove('outcome-empty');
    } else {
        committedDate.textContent = 'Not committed yet';
        committedDate.classList.add('outcome-empty');
    }
}

function renderFollowups(followups) {
    const container = document.getElementById('followup-thread');
    container.innerHTML = '';

    followups.forEach(msg => {
        const msgEl = document.createElement('div');
        msgEl.className = `followup-message ${msg.author_type}`;
        msgEl.innerHTML = `
            <div class="followup-message-label">${msg.author_type === 'user' ? 'You' : 'Onyx'}</div>
            <div>${msg.content}</div>
        `;
        container.appendChild(msgEl);
    });
}

function showNoDecisionState() {
    document.getElementById('no-decision-state').style.display = 'block';
    document.getElementById('decision-view').style.display = 'none';
}

async function logout() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (accessToken) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                credentials: 'include'
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('session');
    localStorage.removeItem('user');
    window.location.href = '/';
}

async function initialize() {
    const authStatus = await checkAuthStatus();

    if (!authStatus.authenticated) {
        showState('unauthorized-state');
        return;
    }

    currentUser = authStatus.user;

    if (!currentUser.paid) {
        showState('unpaid-state');
        return;
    }

    const userName = currentUser.display_name || currentUser.email;
    document.getElementById('username-main').textContent = userName;

    showState('workspace-state');

    const urlParams = new URLSearchParams(window.location.search);
    const decisionId = urlParams.get('decision_id');
    
    let decisionData;
    
    if (decisionId) {
        decisionData = await loadDecisionById(decisionId);
    } else {
        decisionData = await loadActiveDecision();
    }

    if (decisionData.success && decisionData.decision) {
        renderDecision(
            decisionData.decision, 
            decisionData.options, 
            decisionData.recommendation,
            decisionData.followups
        );
    } else {
        showNoDecisionState();
    }

    setupEventListeners();
}

function setupEventListeners() {
    const userMenuTrigger = document.getElementById('user-menu-main');
    const userDropdown = document.getElementById('user-dropdown-main');

    userMenuTrigger?.addEventListener('click', () => {
        const isVisible = userDropdown.style.display === 'block';
        userDropdown.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!userMenuTrigger?.contains(e.target) && !userDropdown?.contains(e.target)) {
            userDropdown.style.display = 'none';
        }
    });

    userDropdown?.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        if (action === 'logout') {
            await logout();
        } else if (action === 'payment') {
            window.location.href = 'https://billing.stripe.com/p/login/7sYaEQaRD57SghT5hSbMQ00';
        } else if (action === 'library') {
            window.location.href = '/app/library.html';
        }
    });

    document.getElementById('edit-understanding-btn')?.addEventListener('click', () => {
        document.getElementById('understanding-display').style.display = 'none';
        document.getElementById('understanding-edit').style.display = 'block';
    });

    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
        document.getElementById('understanding-display').style.display = 'block';
        document.getElementById('understanding-edit').style.display = 'none';
    });

    document.getElementById('confirm-understanding-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('confirm-understanding-btn');
        btn.disabled = true;
        btn.textContent = 'Running stress test...';
        
        const result = await confirmUnderstanding(currentDecision.id, {});
        
        if (result.success) {
            window.location.reload();
        } else {
            btn.disabled = false;
            btn.textContent = 'This looks right';
            await customAlert('Failed to run stress test. Please try again.');
        }
    });

    document.getElementById('save-understanding-btn')?.addEventListener('click', async () => {
        const updates = {
            goal: document.getElementById('edit-goal').value,
            time_horizon: document.getElementById('edit-time-horizon').value,
            constraints: document.getElementById('edit-constraints').value.split('\n').filter(c => c.trim()),
            risk_tolerance: document.getElementById('edit-risk-tolerance').value,
            primary_metric: currentDecision.primary_metric
        };

        const result = await confirmUnderstanding(currentDecision.id, updates);
        
        if (result.success) {
            Object.assign(currentDecision, updates);
            renderUnderstanding(currentDecision);
            renderSidebar(currentDecision);
            
            document.getElementById('understanding-display').style.display = 'block';
            document.getElementById('understanding-edit').style.display = 'none';
        }
    });

    document.getElementById('show-alternatives-btn')?.addEventListener('click', () => {
        const altSection = document.getElementById('alternatives-section');
        const isVisible = altSection.style.display === 'block';
        altSection.style.display = isVisible ? 'none' : 'block';
    });

    document.getElementById('commit-decision-btn')?.addEventListener('click', async () => {
        if (!selectedOptionId) {
            await customAlert('Please select an option before committing.');
            return;
        }
        
        const selectedOption = currentOptions.find(opt => opt.id === selectedOptionId);
        const optionName = selectedOption?.name || 'this option';
        
        const confirmed = await customConfirm(`You're about to commit to: "${optionName}". This will move the decision to your library. Continue?`);
        
        if (!confirmed) return;
        
        const result = await commitDecision(currentDecision.id, '', selectedOptionId);
        
        if (result.success) {
            await customAlert('Decision committed! Moving to library.');
            window.location.reload();
        } else {
            await customAlert('Failed to commit decision. Please try again.');
        }
    });

    document.getElementById('back-to-library-btn')?.addEventListener('click', () => {
        window.location.href = '/app/library.html';
    });

    document.getElementById('delete-decision-btn')?.addEventListener('click', async () => {
        const confirmed = await customConfirm('Are you sure you want to delete this decision? This cannot be undone.');
        
        if (!confirmed) return;
        
        const result = await deleteDecision(currentDecision.id);
        
        if (result.success) {
            await customAlert('Decision deleted.');
            window.location.href = '/app/library.html';
        } else {
            await customAlert('Failed to delete decision. Please try again.');
        }
    });

    document.getElementById('send-followup-btn')?.addEventListener('click', async () => {
        const input = document.getElementById('followup-input');
        const question = input.value.trim();
        
        if (!question) return;
        
        const btn = document.getElementById('send-followup-btn');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        const result = await askFollowup(currentDecision.id, question);
        
        if (result.success && result.answer) {
            const followups = [
                { author_type: 'user', content: question },
                { author_type: 'system', content: result.answer.content }
            ];
            renderFollowups(followups);
            input.value = '';
        }
        
        btn.disabled = false;
        btn.textContent = 'Send';
    });
}

document.addEventListener('DOMContentLoaded', initialize);
