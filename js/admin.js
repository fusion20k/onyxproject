const API_BASE_URL = '/api';

let session = null;
let currentApplicationId = null;
let currentFilter = 'pending';
let currentDecisionFilter = 'all';
let allApplications = [];
let allDecisions = [];
let currentDecisionDetail = null;

function getSession() {
    if (session) return session;
    const stored = localStorage.getItem('session');
    if (stored) {
        session = JSON.parse(stored);
    }
    return session;
}

function getAccessToken() {
    const sess = getSession();
    return sess ? sess.access_token : null;
}

function showState(stateId) {
    document.querySelectorAll('.admin-state').forEach(state => {
        state.style.display = 'none';
    });
    const targetState = document.getElementById(stateId);
    if (targetState) {
        targetState.style.display = stateId === 'dashboard-state' ? 'flex' : 'block';
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }
    
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNavItem = document.querySelector(`[data-section="${sectionId.replace('-section', '')}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Login failed:', response.status, errorText);
            return { success: false, error: `Login failed (${response.status}). Check backend logs.` };
        }

        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.session) {
            session = data.session;
            localStorage.setItem('session', JSON.stringify(data.session));
            console.log('Stored session:', session);
            console.log('Access token:', session.access_token);
        } else {
            console.error('No session in login response. Full response:', data);
            return { success: false, error: 'Invalid login response format' };
        }
        
        return { success: true };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Cannot connect to backend. Check if backend is running.' };
    }
}

async function fetchApplications() {
    try {
        const accessToken = getAccessToken();
        
        console.log('Fetching applications with token:', accessToken);
        console.log('Full session:', getSession());
        
        if (!accessToken) {
            console.error('No access token available');
            return { success: false, error: 'Not authenticated' };
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/applications`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Applications response status:', response.status);

        if (response.status === 401) {
            return { success: false, error: 'Authentication failed. Please check your credentials.' };
        }

        if (!response.ok) {
            return { success: false, error: 'Failed to fetch applications. Backend may not be ready.' };
        }

        const data = await response.json();
        console.log('Applications data received:', data);
        console.log('Applications array:', data.applications || data);
        
        const applications = data.applications || data || [];
        return { success: true, applications: applications };
    } catch (error) {
        console.error('Fetch applications error:', error);
        return { success: false, error: 'Cannot connect to backend. Please check if backend is running.' };
    }
}

async function fetchDecisions(statusFilter = null) {
    try {
        const accessToken = getAccessToken();
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        let url = `${API_BASE_URL}/admin/decisions`;
        if (statusFilter && statusFilter !== 'all') {
            url += `?status=${statusFilter}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false, error: 'Failed to fetch decisions' };
        }

        const data = await response.json();
        const decisions = data.decisions || data || [];
        return { success: true, decisions: decisions };
    } catch (error) {
        console.error('Fetch decisions error:', error);
        return { success: false, error: 'Failed to fetch decisions' };
    }
}

async function fetchDecisionDetail(decisionId) {
    try {
        const accessToken = getAccessToken();
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/decisions/${decisionId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false, error: 'Failed to fetch decision detail' };
        }

        const data = await response.json();
        return { success: true, data: data };
    } catch (error) {
        console.error('Fetch decision detail error:', error);
        return { success: false, error: 'Failed to fetch decision detail' };
    }
}

async function respondToDecision(decisionId, content) {
    try {
        const accessToken = getAccessToken();
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/decisions/${decisionId}/respond`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Failed to send response' };
        }

        return { success: true };
    } catch (error) {
        console.error('Respond to decision error:', error);
        return { success: false, error: 'Failed to send response' };
    }
}

async function approveApplication(applicationId) {
    try {
        const accessToken = getAccessToken();
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ applicationId })
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Approval failed' };
        }

        return { success: true };
    } catch (error) {
        console.error('Approve error:', error);
        return { success: false, error: 'Approval failed' };
    }
}

async function denyApplication(applicationId, reason = '') {
    try {
        const accessToken = getAccessToken();
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/deny`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ applicationId, reason })
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Denial failed' };
        }

        return { success: true };
    } catch (error) {
        console.error('Deny error:', error);
        return { success: false, error: 'Denial failed' };
    }
}

async function clearDeniedApplications() {
    try {
        const accessToken = getAccessToken();
        
        if (!accessToken) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/clear-denied`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Failed to clear denied applications' };
        }

        const data = await response.json();
        return { success: true, count: data.count || 0 };
    } catch (error) {
        console.error('Clear denied error:', error);
        return { success: false, error: 'Failed to clear denied applications' };
    }
}

function renderApplications(applications) {
    allApplications = applications || [];
    
    const tbody = document.getElementById('applications-tbody');
    const container = document.getElementById('applications-container');
    const noApps = document.getElementById('no-applications');
    const loading = document.getElementById('loading-applications');
    const badge = document.getElementById('applications-badge');

    loading.style.display = 'none';

    let filteredApps = allApplications;
    if (currentFilter !== 'all') {
        filteredApps = allApplications.filter(a => a.status === currentFilter);
    }

    const pending = allApplications.filter(a => a.status === 'pending').length;
    if (badge) badge.textContent = pending;

    if (filteredApps.length === 0) {
        container.style.display = 'none';
        noApps.style.display = 'block';
        noApps.textContent = `No ${currentFilter} applications`;
        return;
    }

    noApps.style.display = 'none';
    container.style.display = 'block';

    tbody.innerHTML = '';

    filteredApps.forEach(app => {
        const tr = document.createElement('tr');
        tr.dataset.status = app.status;
        
        tr.innerHTML = `
            <td>${formatDate(app.created_at)}</td>
            <td>${escapeHtml(app.name)}</td>
            <td>${escapeHtml(app.email)}</td>
            <td>${escapeHtml(app.role || 'N/A')}</td>
            <td>${escapeHtml(app.reason || app.context || 'N/A')}</td>
            <td>${escapeHtml(app.project || 'N/A')}</td>
            <td><span class="admin-table__status admin-table__status--${app.status}">${app.status}</span></td>
            <td>
                <div class="admin-table__actions">
                ${app.status === 'pending' ? `
                    <button class="admin-table__action-btn admin-table__action-btn--approve" data-id="${app.id}">Approve</button>
                    <button class="admin-table__action-btn admin-table__action-btn--deny" data-id="${app.id}">Deny</button>
                ` : '-'}
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });

    document.querySelectorAll('.admin-table__action-btn--approve').forEach(btn => {
        btn.addEventListener('click', handleApprove);
    });

    document.querySelectorAll('.admin-table__action-btn--deny').forEach(btn => {
        btn.addEventListener('click', handleDeny);
    });
}

function renderDecisions(decisions) {
    allDecisions = decisions || [];
    
    const listView = document.getElementById('decisions-list-view');
    const noDecisions = document.getElementById('no-decisions');
    const loading = document.getElementById('loading-decisions');
    const badge = document.getElementById('decisions-badge');

    loading.style.display = 'none';

    let filteredDecisions = allDecisions;
    if (currentDecisionFilter !== 'all') {
        filteredDecisions = allDecisions.filter(d => d.status === currentDecisionFilter);
    }

    const underReview = allDecisions.filter(d => d.status === 'under_review').length;
    if (badge) badge.textContent = underReview;

    if (filteredDecisions.length === 0) {
        listView.style.display = 'none';
        noDecisions.style.display = 'block';
        noDecisions.textContent = `No ${currentDecisionFilter} decisions`;
        return;
    }

    noDecisions.style.display = 'none';
    listView.style.display = 'grid';

    listView.innerHTML = '';

    filteredDecisions.forEach(decision => {
        const card = document.createElement('div');
        card.className = 'decision-card';
        card.dataset.id = decision.id;
        
        const statusMap = {
            'in_progress': 'In Progress',
            'under_review': 'Under Review',
            'responded': 'Responded',
            'resolved': 'Resolved'
        };
        
        card.innerHTML = `
            <div class="decision-card-header">
                <div>
                    <div class="decision-card-user">${escapeHtml(decision.user_name || decision.user_email)}</div>
                    <div class="decision-card-email">${escapeHtml(decision.user_email)}</div>
                </div>
                <span class="decision-card-status decision-card-status--${decision.status}">${statusMap[decision.status] || decision.status}</span>
            </div>
            <div class="decision-card-situation">${escapeHtml(decision.title || decision.situation || 'No situation provided')}</div>
            <div class="decision-card-meta">
                <span>Created ${formatDate(decision.created_at)}</span>
                <span>${decision.feedback_count || 0} messages</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            showDecisionDetail(decision.id);
        });

        listView.appendChild(card);
    });
}

async function showDecisionDetail(decisionId) {
    const listView = document.getElementById('decisions-list-view');
    const detailView = document.getElementById('decision-detail-view');
    const loading = document.getElementById('loading-decisions');
    const noDecisions = document.getElementById('no-decisions');

    listView.style.display = 'none';
    noDecisions.style.display = 'none';
    loading.style.display = 'block';
    detailView.style.display = 'none';

    const result = await fetchDecisionDetail(decisionId);

    loading.style.display = 'none';

    if (!result.success) {
        alert(result.error || 'Failed to load decision detail');
        listView.style.display = 'grid';
        return;
    }

    currentDecisionDetail = result.data;
    const { decision, user, feedback } = result.data;

    const detailContent = document.getElementById('decision-detail-content');
    
    const statusMap = {
        'in_progress': 'In Progress',
        'under_review': 'Under Review',
        'responded': 'Responded',
        'resolved': 'Resolved'
    };

    detailContent.innerHTML = `
        <div class="decision-detail-header">
            <div class="decision-detail-user">${escapeHtml(user.display_name || user.email)}</div>
            <div class="decision-detail-meta">
                <span>Email: ${escapeHtml(user.email)}</span>
                <span>Status: <span class="decision-card-status decision-card-status--${decision.status}">${statusMap[decision.status]}</span></span>
                <span>Created: ${formatDate(decision.created_at)}</span>
            </div>
        </div>

        <div class="decision-detail-sections">
            <div class="decision-detail-section decision-detail-section--full">
                <h3>Situation</h3>
                <p>${escapeHtml(decision.situation) || '<span class="empty">No situation provided</span>'}</p>
            </div>

            <div class="decision-detail-section">
                <h3>Context</h3>
                <p>${decision.context ? escapeHtml(decision.context) : '<span class="empty">Not provided</span>'}</p>
            </div>

            <div class="decision-detail-section">
                <h3>Risks</h3>
                <p>${decision.risks ? escapeHtml(decision.risks) : '<span class="empty">Not provided</span>'}</p>
            </div>

            <div class="decision-detail-section">
                <h3>Unknowns</h3>
                <p>${decision.unknowns ? escapeHtml(decision.unknowns) : '<span class="empty">Not provided</span>'}</p>
            </div>

            <div class="decision-detail-section decision-detail-section--full">
                <h3>Options</h3>
                <p><strong>A:</strong> ${decision.option_a ? escapeHtml(decision.option_a) : '<span class="empty">Not provided</span>'}</p>
                <p><strong>B:</strong> ${decision.option_b ? escapeHtml(decision.option_b) : '<span class="empty">Not provided</span>'}</p>
                ${decision.option_c ? `<p><strong>C:</strong> ${escapeHtml(decision.option_c)}</p>` : ''}
            </div>
        </div>

        <div class="decision-feedback-section">
            <h2>Communication Thread</h2>
            <div class="decision-feedback-list">
                ${feedback && feedback.length > 0 ? feedback.map(item => `
                    <div class="decision-feedback-item decision-feedback-item--${item.author_type}">
                        <div class="decision-feedback-meta">
                            <span class="decision-feedback-author">${item.author_type === 'admin' ? 'Admin' : 'User'}</span>
                            <span class="decision-feedback-time">${formatDateTime(item.created_at)}</span>
                        </div>
                        <div class="decision-feedback-content">${escapeHtml(item.content)}</div>
                    </div>
                `).join('') : '<p class="empty">No messages yet</p>'}
            </div>

            <form class="decision-response-form" id="decision-response-form">
                <textarea id="admin-response-input" placeholder="Type your response to the user..." required></textarea>
                <button type="submit">Send Response</button>
            </form>
        </div>
    `;

    detailView.style.display = 'block';

    const responseForm = document.getElementById('decision-response-form');
    if (responseForm) {
        responseForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const input = document.getElementById('admin-response-input');
            const content = input.value.trim();
            
            if (!content) return;
            
            const submitBtn = responseForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            
            const result = await respondToDecision(decision.id, content);
            
            if (result.success) {
                await showDecisionDetail(decision.id);
            } else {
                alert(result.error || 'Failed to send response');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Response';
            }
        });
    }
}

async function handleApprove(e) {
    const applicationId = e.target.dataset.id;
    
    if (!confirm('Approve this application and send invite?')) {
        return;
    }

    e.target.disabled = true;
    e.target.textContent = 'Approving...';

    const result = await approveApplication(applicationId);

    if (result.success) {
        await loadApplications();
    } else {
        alert(result.error || 'Approval failed');
        e.target.disabled = false;
        e.target.textContent = 'Approve';
    }
}

function handleDeny(e) {
    currentApplicationId = e.target.dataset.id;
    showModal('deny-modal');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

async function loadApplications() {
    const loading = document.getElementById('loading-applications');
    const container = document.getElementById('applications-container');
    const noApps = document.getElementById('no-applications');

    if (!loading || !container || !noApps) {
        console.error('Application elements not found');
        return;
    }

    loading.style.display = 'block';
    container.style.display = 'none';
    noApps.style.display = 'none';

    const result = await fetchApplications();

    loading.style.display = 'none';

    if (result.success) {
        renderApplications(result.applications);
    } else {
        noApps.style.display = 'block';
        noApps.textContent = result.error || 'Failed to load applications';
    }
}

async function loadDecisions() {
    const loading = document.getElementById('loading-decisions');
    const listView = document.getElementById('decisions-list-view');
    const noDecisions = document.getElementById('no-decisions');

    if (!loading || !listView || !noDecisions) {
        console.error('Decision elements not found');
        return;
    }

    loading.style.display = 'block';
    listView.style.display = 'none';
    noDecisions.style.display = 'none';

    const result = await fetchDecisions(currentDecisionFilter !== 'all' ? currentDecisionFilter : null);

    loading.style.display = 'none';

    if (result.success) {
        renderDecisions(result.decisions);
    } else {
        noDecisions.style.display = 'block';
        noDecisions.textContent = result.error || 'Failed to load decisions';
    }
}

function logout() {
    session = null;
    localStorage.removeItem('session');
    showState('auth-state');
}

async function checkAuth() {
    const sess = getSession();
    
    if (sess && sess.access_token) {
        showState('dashboard-state');
        setTimeout(async () => {
            await loadApplications();
            await loadDecisions();
        }, 50);
    } else {
        showState('auth-state');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const refreshApplicationsBtn = document.getElementById('refresh-applications-btn');
    const refreshDecisionsBtn = document.getElementById('refresh-decisions-btn');
    const denyForm = document.getElementById('deny-form');
    const cancelDenyBtn = document.getElementById('cancel-deny');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const loginError = document.getElementById('login-error');

            loginError.style.display = 'none';
            submitButton.disabled = true;
            submitButton.textContent = 'Signing in...';

            const result = await login(email, password);

            if (result.success) {
                showState('dashboard-state');
                setTimeout(async () => {
                    await loadApplications();
                    await loadDecisions();
                }, 50);
            } else {
                showError('login-error', result.error || 'Login failed');
                submitButton.disabled = false;
                submitButton.textContent = 'Sign In';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    if (refreshApplicationsBtn) {
        refreshApplicationsBtn.addEventListener('click', loadApplications);
    }

    if (refreshDecisionsBtn) {
        refreshDecisionsBtn.addEventListener('click', loadDecisions);
    }

    const clearDeniedBtn = document.getElementById('clear-denied-btn');
    if (clearDeniedBtn) {
        clearDeniedBtn.addEventListener('click', async function() {
            const deniedCount = allApplications.filter(a => a.status === 'denied').length;
            
            if (deniedCount === 0) {
                alert('No denied applications to clear');
                return;
            }
            
            if (!confirm(`Are you sure you want to permanently delete ${deniedCount} denied application(s)?`)) {
                return;
            }

            this.disabled = true;
            this.textContent = 'Clearing...';

            const result = await clearDeniedApplications();

            this.disabled = false;
            this.textContent = 'Clear Denied';

            if (result.success) {
                alert(`Successfully deleted ${result.count} denied application(s)`);
                await loadApplications();
            } else {
                alert(result.error || 'Failed to clear denied applications');
            }
        });
    }

    if (denyForm) {
        denyForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const reason = document.getElementById('deny-reason').value;
            const submitButton = denyForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'Denying...';

            const result = await denyApplication(currentApplicationId, reason);

            submitButton.disabled = false;
            submitButton.textContent = 'Confirm Deny';

            if (result.success) {
                hideModal('deny-modal');
                await loadApplications();
            } else {
                alert(result.error || 'Denial failed');
            }
        });
    }

    if (cancelDenyBtn) {
        cancelDenyBtn.addEventListener('click', function() {
            hideModal('deny-modal');
        });
    }

    const filterBtns = document.querySelectorAll('.admin-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            currentFilter = this.dataset.filter;
            
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            renderApplications(allApplications);
        });
    });

    const decisionFilterBtns = document.querySelectorAll('.admin-filter-btn-decisions');
    decisionFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            currentDecisionFilter = this.dataset.filter;
            
            decisionFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            renderDecisions(allDecisions);
        });
    });

    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(`${section}-section`);
            
            if (section === 'decisions') {
                const detailView = document.getElementById('decision-detail-view');
                detailView.style.display = 'none';
                const listView = document.getElementById('decisions-list-view');
                listView.style.display = 'grid';
            }
        });
    });

    const backToDecisionsBtn = document.getElementById('back-to-decisions-list');
    if (backToDecisionsBtn) {
        backToDecisionsBtn.addEventListener('click', function() {
            const listView = document.getElementById('decisions-list-view');
            const detailView = document.getElementById('decision-detail-view');
            
            detailView.style.display = 'none';
            listView.style.display = 'grid';
        });
    }

    checkAuth();
});
