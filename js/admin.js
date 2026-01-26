const BACKEND_URL = 'https://onyxbackend-55af.onrender.com';

let currentSection = 'overview';
let currentUserFilter = 'all';
let currentTrialFilter = 'active';
let currentSubFilter = 'all';

let cachedData = {
    overview: null,
    users: null,
    trials: null,
    subscriptions: null,
    revenue: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

function initializeAdmin() {
    showState('auth-state');
    
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    initializeNavigation();
    initializeRefreshButtons();
    initializeFilters();
    initializeModalHandlers();
    
    checkAuth();
}

function checkAuth() {
    const token = localStorage.getItem('onyx-admin-token');
    
    if (token) {
        showState('dashboard-state');
        loadDashboard();
    } else {
        showState('auth-state');
    }
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

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorElement = document.getElementById('login-error');
    
    if (!email || !password) {
        showError('login-error', 'Please enter email and password');
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError('login-error', data.message || 'Invalid credentials');
            return;
        }
        
        if (!data.user || !data.user.is_admin) {
            showError('login-error', 'Admin access required');
            return;
        }
        
        localStorage.setItem('onyx-admin-token', data.token);
        errorElement.style.display = 'none';
        showState('dashboard-state');
        loadDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        showError('login-error', 'Unable to connect to server');
    }
}

function handleLogout() {
    localStorage.removeItem('onyx-admin-token');
    cachedData = {
        overview: null,
        users: null,
        trials: null,
        subscriptions: null,
        revenue: null
    };
    showState('auth-state');
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

function initializeNavigation() {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

function initializeRefreshButtons() {
    document.getElementById('refresh-overview-btn')?.addEventListener('click', () => loadOverview(true));
    document.getElementById('refresh-users-btn')?.addEventListener('click', () => loadUsers(true));
    document.getElementById('refresh-trials-btn')?.addEventListener('click', () => loadTrials(true));
    document.getElementById('refresh-subscriptions-btn')?.addEventListener('click', () => loadSubscriptions(true));
    document.getElementById('refresh-revenue-btn')?.addEventListener('click', () => loadRevenue(true));
    document.getElementById('refresh-monitoring-btn')?.addEventListener('click', () => loadMonitoring(true));
}

function initializeFilters() {
    document.querySelectorAll('.admin-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.admin-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentUserFilter = this.getAttribute('data-filter');
            renderUsers();
        });
    });
    
    document.querySelectorAll('.admin-filter-btn-trials').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.admin-filter-btn-trials').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTrialFilter = this.getAttribute('data-filter');
            renderTrials();
        });
    });
    
    document.querySelectorAll('.admin-filter-btn-subs').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.admin-filter-btn-subs').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSubFilter = this.getAttribute('data-filter');
            renderSubscriptions();
        });
    });
}

function initializeModalHandlers() {
    const closeBtn = document.getElementById('close-user-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('user-modal').classList.remove('show');
        });
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }
    
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    currentSection = sectionId;
    loadSectionData(sectionId);
}

function loadDashboard() {
    loadOverview();
}

function loadSectionData(section) {
    switch(section) {
        case 'overview':
            loadOverview();
            break;
        case 'users':
            loadUsers();
            break;
        case 'trials':
            loadTrials();
            break;
        case 'subscriptions':
            loadSubscriptions();
            break;
        case 'revenue':
            loadRevenue();
            break;
        case 'monitoring':
            loadMonitoring();
            break;
    }
}

async function loadOverview(forceRefresh = false) {
    if (cachedData.overview && !forceRefresh) {
        renderOverview(cachedData.overview);
        return;
    }
    
    const token = localStorage.getItem('onyx-admin-token');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/overview`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch overview data');
        }
        
        const data = await response.json();
        cachedData.overview = data;
        renderOverview(data);
        updateBadges(data);
        
    } catch (error) {
        console.error('Error loading overview:', error);
        renderOverview({
            total_users: 0,
            active_trials: 0,
            paid_subscribers: 0,
            mrr: 0,
            churn_rate: 0,
            trial_conversion_rate: 0
        });
    }
}

function renderOverview(data) {
    document.getElementById('overview-total-users').textContent = data.total_users || 0;
    document.getElementById('overview-active-trials').textContent = data.active_trials || 0;
    document.getElementById('overview-paid-subs').textContent = data.paid_subscribers || 0;
    document.getElementById('overview-mrr').textContent = `$${(data.mrr || 0).toLocaleString()}`;
    
    document.getElementById('overview-total-users-subtext').textContent = '';
    document.getElementById('overview-active-trials-subtext').textContent = '';
    document.getElementById('overview-paid-subs-subtext').textContent = data.churn_rate ? `${data.churn_rate.toFixed(1)}% churn` : '';
    document.getElementById('overview-mrr-subtext').textContent = data.trial_conversion_rate ? `${data.trial_conversion_rate.toFixed(1)}% conversion` : '';
    
    loadRecentActivity();
}

async function loadRecentActivity() {
    const token = localStorage.getItem('onyx-admin-token');
    
    try {
        const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users?limit=3&sort=created_desc`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const signupsList = document.getElementById('recent-signups-list');
            
            if (usersData.users && usersData.users.length > 0) {
                signupsList.innerHTML = usersData.users.map(user => `
                    <div class="activity-item">
                        <strong>${user.name}</strong> (${user.email}) - ${formatRelativeTime(user.created_at)}
                    </div>
                `).join('');
            } else {
                signupsList.innerHTML = '<div class="activity-item">No recent signups</div>';
            }
        }
        
        const trialsResponse = await fetch(`${BACKEND_URL}/api/admin/trials?filter=expiring&limit=3`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (trialsResponse.ok) {
            const trialsData = await trialsResponse.json();
            const trialsList = document.getElementById('expiring-trials-list');
            
            if (trialsData.trials && trialsData.trials.length > 0) {
                trialsList.innerHTML = trialsData.trials.map(trial => `
                    <div class="activity-item">
                        <strong>${trial.name}</strong> (${trial.email}) - ${trial.days_left} days left
                    </div>
                `).join('');
            } else {
                trialsList.innerHTML = '<div class="activity-item">No expiring trials</div>';
            }
        }
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

function updateBadges(data) {
    if (data) {
        document.getElementById('users-badge').textContent = data.total_users || 0;
        document.getElementById('trials-badge').textContent = data.active_trials || 0;
        document.getElementById('subscriptions-badge').textContent = data.paid_subscribers || 0;
    }
}

async function loadUsers(forceRefresh = false) {
    if (cachedData.users && !forceRefresh) {
        renderUsers();
        return;
    }
    
    document.getElementById('loading-users').style.display = 'block';
    document.getElementById('users-container').style.display = 'none';
    document.getElementById('no-users').style.display = 'none';
    
    const token = localStorage.getItem('onyx-admin-token');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        cachedData.users = data.users || [];
        renderUsers();
        
    } catch (error) {
        console.error('Error loading users:', error);
        cachedData.users = [];
        renderUsers();
    }
}

function renderUsers() {
    const loading = document.getElementById('loading-users');
    const container = document.getElementById('users-container');
    const noUsers = document.getElementById('no-users');
    const tbody = document.getElementById('users-tbody');
    
    loading.style.display = 'none';
    
    let filtered = cachedData.users || [];
    if (currentUserFilter !== 'all') {
        filtered = filtered.filter(u => u.subscription_status === currentUserFilter);
    }
    
    if (filtered.length === 0) {
        container.style.display = 'none';
        noUsers.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    noUsers.style.display = 'none';
    
    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.company || 'N/A'}</td>
            <td><span class="admin-table__status admin-table__status--${user.subscription_status}">${user.subscription_status}</span></td>
            <td>${user.subscription_plan || 'None'}</td>
            <td>$${user.mrr || 0}</td>
            <td>
                <div class="admin-table__actions">
                    <button class="admin-table__action-btn" onclick="viewUser('${user.id}')">View</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadTrials(forceRefresh = false) {
    if (cachedData.trials && !forceRefresh) {
        renderTrials();
        return;
    }
    
    document.getElementById('loading-trials').style.display = 'block';
    document.getElementById('trials-container').style.display = 'none';
    document.getElementById('no-trials').style.display = 'none';
    
    const token = localStorage.getItem('onyx-admin-token');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/trials`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch trials');
        }
        
        const data = await response.json();
        cachedData.trials = data.trials || [];
        renderTrials();
        
    } catch (error) {
        console.error('Error loading trials:', error);
        cachedData.trials = [];
        renderTrials();
    }
}

function renderTrials() {
    const loading = document.getElementById('loading-trials');
    const container = document.getElementById('trials-container');
    const noTrials = document.getElementById('no-trials');
    const tbody = document.getElementById('trials-tbody');
    
    loading.style.display = 'none';
    
    let filtered = cachedData.trials || [];
    if (currentTrialFilter === 'active') {
        filtered = filtered.filter(t => t.status === 'active' && t.days_left > 3);
    } else if (currentTrialFilter === 'expiring') {
        filtered = filtered.filter(t => t.status === 'active' && t.days_left <= 3 && t.days_left > 0);
    } else if (currentTrialFilter === 'expired') {
        filtered = filtered.filter(t => t.status === 'expired');
    } else if (currentTrialFilter === 'converted') {
        filtered = filtered.filter(t => t.status === 'converted');
    }
    
    if (filtered.length === 0) {
        container.style.display = 'none';
        noTrials.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    noTrials.style.display = 'none';
    
    tbody.innerHTML = filtered.map(trial => `
        <tr>
            <td>${trial.name}</td>
            <td>${trial.email}</td>
            <td>${formatDate(trial.trial_start)}</td>
            <td>${formatDate(trial.trial_end)}</td>
            <td>${trial.days_left}</td>
            <td>${trial.last_active || 'N/A'}</td>
            <td><span class="admin-table__status admin-table__status--${trial.status}">${trial.status}</span></td>
            <td>
                <div class="admin-table__actions">
                    <button class="admin-table__action-btn">Contact</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadSubscriptions(forceRefresh = false) {
    if (cachedData.subscriptions && !forceRefresh) {
        renderSubscriptions();
        return;
    }
    
    document.getElementById('loading-subscriptions').style.display = 'block';
    document.getElementById('subscriptions-container').style.display = 'none';
    document.getElementById('no-subscriptions').style.display = 'none';
    
    const token = localStorage.getItem('onyx-admin-token');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/subscriptions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch subscriptions');
        }
        
        const data = await response.json();
        cachedData.subscriptions = data.subscriptions || [];
        renderSubscriptions();
        
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        cachedData.subscriptions = [];
        renderSubscriptions();
    }
}

function renderSubscriptions() {
    const loading = document.getElementById('loading-subscriptions');
    const container = document.getElementById('subscriptions-container');
    const noSubs = document.getElementById('no-subscriptions');
    const tbody = document.getElementById('subscriptions-tbody');
    
    loading.style.display = 'none';
    
    let filtered = cachedData.subscriptions || [];
    if (currentSubFilter !== 'all') {
        filtered = filtered.filter(s => s.plan.toLowerCase() === currentSubFilter);
    }
    
    if (filtered.length === 0) {
        container.style.display = 'none';
        noSubs.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    noSubs.style.display = 'none';
    
    tbody.innerHTML = filtered.map(sub => `
        <tr>
            <td>${sub.name}</td>
            <td>${sub.email}</td>
            <td>${sub.plan}</td>
            <td>${formatDate(sub.subscription_start)}</td>
            <td>${sub.next_billing_date ? formatDate(sub.next_billing_date) : 'N/A'}</td>
            <td>$${sub.mrr}</td>
            <td><span class="admin-table__status admin-table__status--${sub.status}">${sub.status}</span></td>
            <td>
                <div class="admin-table__actions">
                    <button class="admin-table__action-btn">Manage</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadRevenue(forceRefresh = false) {
    if (cachedData.revenue && !forceRefresh) {
        renderRevenue(cachedData.revenue);
        return;
    }
    
    const token = localStorage.getItem('onyx-admin-token');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/revenue`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch revenue data');
        }
        
        const data = await response.json();
        cachedData.revenue = data;
        renderRevenue(data);
        
    } catch (error) {
        console.error('Error loading revenue:', error);
        renderRevenue({
            mrr: 0,
            arr: 0,
            arpu: 0,
            churn_rate: 0,
            mrr_growth: 0,
            plan_breakdown: { solo: {}, team: {}, agency: {} }
        });
    }
}

function renderRevenue(data) {
    document.getElementById('revenue-mrr').textContent = `$${(data.mrr || 0).toLocaleString()}`;
    document.getElementById('revenue-arr').textContent = `$${(data.arr || 0).toLocaleString()}`;
    document.getElementById('revenue-arpu').textContent = `$${data.arpu || 0}`;
    document.getElementById('revenue-churn').textContent = `${data.churn_rate || 0}%`;
    
    const mrrGrowth = data.mrr_growth || 0;
    const mrrChangeEl = document.getElementById('revenue-mrr-change');
    mrrChangeEl.textContent = `${mrrGrowth >= 0 ? '+' : ''}${mrrGrowth}%`;
    mrrChangeEl.className = mrrGrowth >= 0 ? 'revenue-change positive' : 'revenue-change negative';
    
    const arrGrowth = data.arr_growth || 0;
    const arrChangeEl = document.getElementById('revenue-arr-change');
    arrChangeEl.textContent = `${arrGrowth >= 0 ? '+' : ''}${arrGrowth}%`;
    arrChangeEl.className = arrGrowth >= 0 ? 'revenue-change positive' : 'revenue-change negative';
    
    document.getElementById('revenue-arpu-change').textContent = '—';
    
    const churnChange = data.churn_change || 0;
    const churnChangeEl = document.getElementById('revenue-churn-change');
    churnChangeEl.textContent = `${churnChange >= 0 ? '+' : ''}${churnChange}%`;
    
    const breakdown = data.plan_breakdown || {};
    
    document.getElementById('solo-count').textContent = `${breakdown.solo?.count || 0} users`;
    document.getElementById('solo-revenue').textContent = `$${(breakdown.solo?.revenue || 0).toLocaleString()}/mo`;
    
    document.getElementById('team-count').textContent = `${breakdown.team?.count || 0} users`;
    document.getElementById('team-revenue').textContent = `$${(breakdown.team?.revenue || 0).toLocaleString()}/mo`;
    
    document.getElementById('agency-count').textContent = `${breakdown.agency?.count || 0} users`;
    document.getElementById('agency-revenue').textContent = `$${(breakdown.agency?.revenue || 0).toLocaleString()}/mo`;
}

function loadMonitoring() {
}

function viewUser(userId) {
    const user = (cachedData.users || []).find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('user-modal-title');
    const modalContent = document.getElementById('user-modal-content');
    
    modalTitle.textContent = `User: ${user.name}`;
    modalContent.innerHTML = `
        <div style="display: grid; gap: 20px;">
            <div>
                <strong>Email:</strong> ${user.email}
            </div>
            <div>
                <strong>Company:</strong> ${user.company || 'N/A'}
            </div>
            <div>
                <strong>Status:</strong> <span class="admin-table__status admin-table__status--${user.subscription_status}">${user.subscription_status}</span>
            </div>
            <div>
                <strong>Plan:</strong> ${user.subscription_plan || 'None'}
            </div>
            <div>
                <strong>MRR:</strong> $${user.mrr || 0}
            </div>
            <div>
                <strong>Joined:</strong> ${formatDate(user.created_at)}
            </div>
            ${user.trial_end ? `<div><strong>Trial Ends:</strong> ${formatDate(user.trial_end)}</div>` : ''}
        </div>
    `;
    
    modal.classList.add('show');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Less than an hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
}

document.addEventListener('click', function(e) {
    const modal = document.getElementById('user-modal');
    if (modal && modal.classList.contains('show')) {
        if (e.target.classList.contains('modal-overlay')) {
            modal.classList.remove('show');
        }
    }
});
