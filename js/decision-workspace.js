const API_BASE_URL = '/api';

let currentUser = null;
let currentDecision = null;
let currentOptions = [];
let currentRecommendation = null;

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

async function commitDecision(decisionId, note) {
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
            body: JSON.stringify({ note })
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
    document.getElementById('workspace-directives-sidebar').style.display = 'none';

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
    
    document.getElementById('recommended-option-name').textContent = recommendedOption?.name || '—';
    document.getElementById('recommendation-reasoning').textContent = recommendation.reasoning || '—';
    document.getElementById('alternatives-text').textContent = recommendation.why_not_alternatives || '—';
    
    // Show execution plan
    updateExecutionPlan();
}

function updateExecutionPlan() {
    const executionPlanCard = document.getElementById('execution-plan-card');
    const executionPlanText = document.getElementById('execution-plan-text');
    
    if (!currentRecommendation || !currentRecommendation.execution_plan) {
        executionPlanCard.style.display = 'none';
        return;
    }
    
    // Parse and format execution plan
    const formattedPlan = formatExecutionPlan(currentRecommendation.execution_plan);
    executionPlanText.innerHTML = formattedPlan;
    executionPlanCard.style.display = 'block';
}

function formatExecutionPlan(executionPlan) {
    if (!executionPlan) return '<p>No execution plan available.</p>';
    
    // Try to parse as JSON (in case backend sends structured data)
    try {
        const parsed = JSON.parse(executionPlan);
        
        // If it's a structured plan with steps
        if (Array.isArray(parsed)) {
            // Also populate the action directives sidebar
            populateActionDirectives(parsed);
            
            let html = '<div class="execution-steps">';
            parsed.forEach((step, index) => {
                html += `
                    <div class="execution-step">
                        <div class="execution-step-header">
                            <span class="execution-step-number">Step ${index + 1}</span>
                            ${step.step ? `<span class="execution-step-title">${step.step}</span>` : ''}
                            ${step.timeline ? `<span class="execution-step-timeline">${step.timeline}</span>` : ''}
                        </div>
                        ${step.action ? `<div class="execution-step-detail"><strong>Action:</strong> ${step.action}</div>` : ''}
                        ${step.dependencies ? `<div class="execution-step-detail"><strong>Dependencies:</strong> ${step.dependencies}</div>` : ''}
                        ${step.validation_point ? `<div class="execution-step-detail"><strong>Validation:</strong> ${step.validation_point}</div>` : ''}
                        ${step.metrics ? `<div class="execution-step-detail"><strong>Metrics:</strong> ${step.metrics}</div>` : ''}
                        ${step.success_criteria ? `<div class="execution-step-detail"><strong>Success:</strong> ${step.success_criteria}</div>` : ''}
                    </div>
                `;
            });
            html += '</div>';
            return html;
        }
    } catch (e) {
        // Not JSON, treat as plain text
    }
    
    // Format plain text with better readability
    const formatted = executionPlan
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/(\d+)\.\s+/g, '<br><strong>$1.</strong> ')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
    
    return formatted;
}

function populateActionDirectives(steps) {
    const card = document.getElementById('action-directives-card');
    const list = document.getElementById('action-directives-list');
    
    if (!steps || steps.length === 0) {
        card.style.display = 'none';
        return;
    }
    
    // Load saved progress from localStorage
    const progressKey = `action_progress_${currentDecision?.id}`;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    
    list.innerHTML = '';
    let completedCount = 0;
    
    steps.forEach((step, index) => {
        const stepId = `step_${index}`;
        const isCompleted = savedProgress[stepId] || false;
        if (isCompleted) completedCount++;
        
        const item = document.createElement('div');
        item.className = `action-directive-item ${isCompleted ? 'completed' : ''}`;
        item.innerHTML = `
            <div class="action-directive-checkbox" data-step-id="${stepId}">
                <svg class="check-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="action-directive-content">
                <div class="action-directive-header">
                    <strong>${step.step || `Step ${index + 1}`}</strong>
                    ${step.timeline ? `<span class="action-directive-timeline">${step.timeline}</span>` : ''}
                </div>
                <div class="action-directive-action">${step.action}</div>
                ${step.success_criteria ? `<div class="action-directive-success">✓ ${step.success_criteria}</div>` : ''}
            </div>
        `;
        
        // Add click handler to toggle completion
        const checkbox = item.querySelector('.action-directive-checkbox');
        checkbox.addEventListener('click', () => toggleActionComplete(stepId, item));
        
        list.appendChild(item);
    });
    
    // Update progress bar
    updateProgressBar(completedCount, steps.length);
    
    card.style.display = 'block';
}

function toggleActionComplete(stepId, itemElement) {
    const progressKey = `action_progress_${currentDecision?.id}`;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    
    savedProgress[stepId] = !savedProgress[stepId];
    localStorage.setItem(progressKey, JSON.stringify(savedProgress));
    
    itemElement.classList.toggle('completed');
    
    // Recalculate progress
    const completedCount = Object.values(savedProgress).filter(v => v).length;
    const totalSteps = document.querySelectorAll('.action-directive-item').length;
    updateProgressBar(completedCount, totalSteps);
}

function updateProgressBar(completed, total) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('progress-percentage').textContent = `${percentage}%`;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
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
    document.getElementById('workspace-directives-sidebar').style.display = 'block';
    
    // Load workspace directives
    loadWorkspaceDirectives();
}

async function loadWorkspaceDirectives() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        const response = await fetch(`${API_BASE_URL}/decisions/library`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const decisions = data.decisions || [];
        
        if (decisions.length === 0) {
            document.getElementById('workspace-empty-directives').style.display = 'block';
            document.getElementById('workspace-directives-content').style.display = 'none';
            return;
        }
        
        // Populate decision selector
        const selector = document.getElementById('workspace-decision-selector');
        selector.innerHTML = '';
        
        decisions.forEach(decision => {
            const option = document.createElement('option');
            option.value = decision.id;
            option.textContent = decision.title || decision.goal || 'Untitled Decision';
            selector.appendChild(option);
        });
        
        if (decisions.length > 1) {
            selector.style.display = 'block';
        }
        
        // Load first decision's directives
        await loadDirectivesForDecision(decisions[0].id);
        
        // Add change listener
        selector.addEventListener('change', async (e) => {
            await loadDirectivesForDecision(e.target.value);
        });
        
    } catch (error) {
        console.error('Error loading workspace directives:', error);
    }
}

async function loadDirectivesForDecision(decisionId) {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        const response = await fetch(`${API_BASE_URL}/decisions/library/${decisionId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.recommendation && data.recommendation.execution_plan) {
            try {
                const executionPlan = JSON.parse(data.recommendation.execution_plan);
                if (Array.isArray(executionPlan)) {
                    populateWorkspaceDirectives(executionPlan, decisionId);
                    document.getElementById('workspace-empty-directives').style.display = 'none';
                    document.getElementById('workspace-directives-content').style.display = 'block';
                    return;
                }
            } catch (e) {
                // Not valid JSON
            }
        }
        
        document.getElementById('workspace-empty-directives').style.display = 'block';
        document.getElementById('workspace-directives-content').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading directives for decision:', error);
    }
}

function populateWorkspaceDirectives(steps, decisionId) {
    const list = document.getElementById('workspace-action-directives-list');
    
    if (!steps || steps.length === 0) {
        return;
    }
    
    // Load saved progress from localStorage
    const progressKey = `action_progress_${decisionId}`;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    
    list.innerHTML = '';
    let completedCount = 0;
    
    steps.forEach((step, index) => {
        const stepId = `step_${index}`;
        const isCompleted = savedProgress[stepId] || false;
        if (isCompleted) completedCount++;
        
        const item = document.createElement('div');
        item.className = `action-directive-item ${isCompleted ? 'completed' : ''}`;
        item.innerHTML = `
            <div class="action-directive-checkbox" data-step-id="${stepId}" data-decision-id="${decisionId}">
                <svg class="check-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="action-directive-content">
                <div class="action-directive-header">
                    <strong>${step.step || `Step ${index + 1}`}</strong>
                    ${step.timeline ? `<span class="action-directive-timeline">${step.timeline}</span>` : ''}
                </div>
                <div class="action-directive-action">${step.action}</div>
                ${step.success_criteria ? `<div class="action-directive-success">✓ ${step.success_criteria}</div>` : ''}
            </div>
        `;
        
        // Add click handler to toggle completion
        const checkbox = item.querySelector('.action-directive-checkbox');
        checkbox.addEventListener('click', () => toggleWorkspaceActionComplete(stepId, decisionId, item));
        
        list.appendChild(item);
    });
    
    // Update progress bar
    updateWorkspaceProgressBar(completedCount, steps.length);
}

function toggleWorkspaceActionComplete(stepId, decisionId, itemElement) {
    const progressKey = `action_progress_${decisionId}`;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    
    savedProgress[stepId] = !savedProgress[stepId];
    localStorage.setItem(progressKey, JSON.stringify(savedProgress));
    
    itemElement.classList.toggle('completed');
    
    // Recalculate progress
    const completedCount = Object.values(savedProgress).filter(v => v).length;
    const totalSteps = document.querySelectorAll('#workspace-action-directives-list .action-directive-item').length;
    updateWorkspaceProgressBar(completedCount, totalSteps);
}

function updateWorkspaceProgressBar(completed, total) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('workspace-progress-percentage').textContent = `${percentage}%`;
    document.getElementById('workspace-progress-fill').style.width = `${percentage}%`;
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
        const result = await commitDecision(currentDecision.id, '');
        
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
