// Onyx Admin Panel - Autonomous Outreach Platform

const mockData = {
    overview: {
        totalUsers: 147,
        activeTrials: 42,
        paidSubscribers: 105,
        mrr: 28794,
        recentSignups: [
            { name: 'John Smith', email: 'john@techstartup.com', date: '2 hours ago' },
            { name: 'Sarah Johnson', email: 'sarah@growthco.io', date: '5 hours ago' },
            { name: 'Mike Davis', email: 'mike@scalelabs.com', date: '1 day ago' }
        ],
        expiringTrials: [
            { name: 'Emma Wilson', email: 'emma@startup.co', daysLeft: 2 },
            { name: 'Tom Brown', email: 'tom@bizdev.com', daysLeft: 3 },
            { name: 'Lisa Anderson', email: 'lisa@marketing.io', daysLeft: 5 }
        ]
    },
    users: [
        { id: 1, name: 'Alice Cooper', email: 'alice@company.com', company: 'TechCorp', status: 'paid', plan: 'Team', mrr: 297, joined: '2024-01-15' },
        { id: 2, name: 'Bob Johnson', email: 'bob@startup.io', company: 'StartupXYZ', status: 'trial', plan: 'Solo', mrr: 0, joined: '2024-03-20' },
        { id: 3, name: 'Carol White', email: 'carol@agency.co', company: 'GrowthAgency', status: 'paid', plan: 'Agency', mrr: 797, joined: '2023-11-10' },
        { id: 4, name: 'David Miller', email: 'david@saas.com', company: 'SaaSPro', status: 'paid', plan: 'Solo', mrr: 97, joined: '2024-02-05' },
        { id: 5, name: 'Eve Davis', email: 'eve@consulting.com', company: 'ConsultCo', status: 'expired', plan: 'Solo', mrr: 0, joined: '2024-01-25' }
    ],
    trials: [
        { id: 1, name: 'Bob Johnson', email: 'bob@startup.io', started: '2024-03-20', expires: '2024-04-03', daysLeft: 10, activity: 'High', status: 'active' },
        { id: 2, name: 'Frank Wilson', email: 'frank@newco.com', started: '2024-03-25', expires: '2024-04-08', daysLeft: 3, activity: 'Medium', status: 'expiring' },
        { id: 3, name: 'Grace Lee', email: 'grace@bizdev.io', started: '2024-02-15', expires: '2024-03-01', daysLeft: 0, activity: 'Low', status: 'expired' },
        { id: 4, name: 'Henry Kim', email: 'henry@growth.co', started: '2024-03-10', expires: '2024-03-24', daysLeft: 0, activity: 'High', status: 'converted' }
    ],
    subscriptions: [
        { id: 1, name: 'Alice Cooper', email: 'alice@company.com', plan: 'Team', started: '2024-01-15', nextBilling: '2024-04-15', mrr: 297, status: 'active' },
        { id: 2, name: 'Carol White', email: 'carol@agency.co', plan: 'Agency', started: '2023-11-10', nextBilling: '2024-04-10', mrr: 797, status: 'active' },
        { id: 3, name: 'David Miller', email: 'david@saas.com', plan: 'Solo', started: '2024-02-05', nextBilling: '2024-04-05', mrr: 97, status: 'active' },
        { id: 4, name: 'Ian Foster', email: 'ian@marketing.com', plan: 'Team', started: '2024-03-01', nextBilling: '2024-04-01', mrr: 297, status: 'active' }
    ],
    revenue: {
        mrr: 28794,
        arr: 345528,
        arpu: 274,
        churn: 3.2,
        mrrChange: 18,
        arrChange: 22,
        arpuChange: -5,
        churnChange: 1.2,
        planBreakdown: {
            solo: { count: 45, revenue: 4365 },
            team: { count: 48, revenue: 14256 },
            agency: { count: 12, revenue: 9564 }
        }
    }
};

let currentSection = 'overview';
let currentUserFilter = 'all';
let currentTrialFilter = 'active';
let currentSubFilter = 'all';

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

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    if (email && password) {
        localStorage.setItem('onyx-admin-token', 'mock-admin-token');
        showState('dashboard-state');
        loadDashboard();
    } else {
        showError('login-error', 'Please enter email and password');
    }
}

function handleLogout() {
    localStorage.removeItem('onyx-admin-token');
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
    document.getElementById('refresh-overview-btn')?.addEventListener('click', () => loadOverview());
    document.getElementById('refresh-users-btn')?.addEventListener('click', () => loadUsers());
    document.getElementById('refresh-trials-btn')?.addEventListener('click', () => loadTrials());
    document.getElementById('refresh-subscriptions-btn')?.addEventListener('click', () => loadSubscriptions());
    document.getElementById('refresh-revenue-btn')?.addEventListener('click', () => loadRevenue());
    document.getElementById('refresh-monitoring-btn')?.addEventListener('click', () => loadMonitoring());
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
    updateBadges();
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

function updateBadges() {
    document.getElementById('users-badge').textContent = mockData.users.length;
    document.getElementById('trials-badge').textContent = mockData.trials.filter(t => t.status === 'active').length;
    document.getElementById('subscriptions-badge').textContent = mockData.subscriptions.length;
}

function loadOverview() {
    document.getElementById('overview-total-users').textContent = mockData.overview.totalUsers;
    document.getElementById('overview-active-trials').textContent = mockData.overview.activeTrials;
    document.getElementById('overview-paid-subs').textContent = mockData.overview.paidSubscribers;
    document.getElementById('overview-mrr').textContent = `$${mockData.overview.mrr.toLocaleString()}`;
    
    const signupsList = document.getElementById('recent-signups-list');
    signupsList.innerHTML = mockData.overview.recentSignups.map(signup => `
        <div class="activity-item">
            <strong>${signup.name}</strong> (${signup.email}) - ${signup.date}
        </div>
    `).join('');
    
    const trialsList = document.getElementById('expiring-trials-list');
    trialsList.innerHTML = mockData.overview.expiringTrials.map(trial => `
        <div class="activity-item">
            <strong>${trial.name}</strong> (${trial.email}) - ${trial.daysLeft} days left
        </div>
    `).join('');
}

function loadUsers() {
    document.getElementById('loading-users').style.display = 'block';
    document.getElementById('users-container').style.display = 'none';
    document.getElementById('no-users').style.display = 'none';
    
    setTimeout(() => {
        renderUsers();
    }, 300);
}

function renderUsers() {
    const loading = document.getElementById('loading-users');
    const container = document.getElementById('users-container');
    const noUsers = document.getElementById('no-users');
    const tbody = document.getElementById('users-tbody');
    
    loading.style.display = 'none';
    
    let filtered = mockData.users;
    if (currentUserFilter !== 'all') {
        filtered = mockData.users.filter(u => u.status === currentUserFilter);
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
            <td>${formatDate(user.joined)}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.company}</td>
            <td><span class="admin-table__status admin-table__status--${user.status}">${user.status}</span></td>
            <td>${user.plan}</td>
            <td>$${user.mrr}</td>
            <td>
                <div class="admin-table__actions">
                    <button class="admin-table__action-btn" onclick="viewUser(${user.id})">View</button>
                    <button class="admin-table__action-btn">Impersonate</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadTrials() {
    document.getElementById('loading-trials').style.display = 'block';
    document.getElementById('trials-container').style.display = 'none';
    document.getElementById('no-trials').style.display = 'none';
    
    setTimeout(() => {
        renderTrials();
    }, 300);
}

function renderTrials() {
    const loading = document.getElementById('loading-trials');
    const container = document.getElementById('trials-container');
    const noTrials = document.getElementById('no-trials');
    const tbody = document.getElementById('trials-tbody');
    
    loading.style.display = 'none';
    
    let filtered = mockData.trials;
    if (currentTrialFilter !== 'all') {
        filtered = mockData.trials.filter(t => t.status === currentTrialFilter);
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
            <td>${formatDate(trial.started)}</td>
            <td>${formatDate(trial.expires)}</td>
            <td>${trial.daysLeft}</td>
            <td>${trial.activity}</td>
            <td><span class="admin-table__status admin-table__status--${trial.status}">${trial.status}</span></td>
            <td>
                <div class="admin-table__actions">
                    <button class="admin-table__action-btn">Extend</button>
                    <button class="admin-table__action-btn">Contact</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadSubscriptions() {
    document.getElementById('loading-subscriptions').style.display = 'block';
    document.getElementById('subscriptions-container').style.display = 'none';
    document.getElementById('no-subscriptions').style.display = 'none';
    
    setTimeout(() => {
        renderSubscriptions();
    }, 300);
}

function renderSubscriptions() {
    const loading = document.getElementById('loading-subscriptions');
    const container = document.getElementById('subscriptions-container');
    const noSubs = document.getElementById('no-subscriptions');
    const tbody = document.getElementById('subscriptions-tbody');
    
    loading.style.display = 'none';
    
    let filtered = mockData.subscriptions;
    if (currentSubFilter !== 'all') {
        filtered = mockData.subscriptions.filter(s => s.plan.toLowerCase() === currentSubFilter);
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
            <td>${formatDate(sub.started)}</td>
            <td>${formatDate(sub.nextBilling)}</td>
            <td>$${sub.mrr}</td>
            <td><span class="admin-table__status admin-table__status--${sub.status}">${sub.status}</span></td>
            <td>
                <div class="admin-table__actions">
                    <button class="admin-table__action-btn">Manage</button>
                    <button class="admin-table__action-btn">Cancel</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadRevenue() {
    const data = mockData.revenue;
    
    document.getElementById('revenue-mrr').textContent = `$${data.mrr.toLocaleString()}`;
    document.getElementById('revenue-arr').textContent = `$${data.arr.toLocaleString()}`;
    document.getElementById('revenue-arpu').textContent = `$${data.arpu}`;
    document.getElementById('revenue-churn').textContent = `${data.churn}%`;
    
    document.getElementById('revenue-mrr-change').textContent = `+${data.mrrChange}%`;
    document.getElementById('revenue-arr-change').textContent = `+${data.arrChange}%`;
    document.getElementById('revenue-arpu-change').textContent = `${data.arpuChange}%`;
    document.getElementById('revenue-churn-change').textContent = `${data.churnChange}%`;
    
    document.getElementById('solo-count').textContent = `${data.planBreakdown.solo.count} users`;
    document.getElementById('solo-revenue').textContent = `$${data.planBreakdown.solo.revenue.toLocaleString()}/mo`;
    
    document.getElementById('team-count').textContent = `${data.planBreakdown.team.count} users`;
    document.getElementById('team-revenue').textContent = `$${data.planBreakdown.team.revenue.toLocaleString()}/mo`;
    
    document.getElementById('agency-count').textContent = `${data.planBreakdown.agency.count} users`;
    document.getElementById('agency-revenue').textContent = `$${data.planBreakdown.agency.revenue.toLocaleString()}/mo`;
}

function loadMonitoring() {
}

function viewUser(userId) {
    const user = mockData.users.find(u => u.id === userId);
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
                <strong>Company:</strong> ${user.company}
            </div>
            <div>
                <strong>Status:</strong> <span class="admin-table__status admin-table__status--${user.status}">${user.status}</span>
            </div>
            <div>
                <strong>Plan:</strong> ${user.plan}
            </div>
            <div>
                <strong>MRR:</strong> $${user.mrr}
            </div>
            <div>
                <strong>Joined:</strong> ${formatDate(user.joined)}
            </div>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #1a1a1a;">
            <button class="admin-button" style="margin-right: 8px;">Reset Password</button>
            <button class="admin-button">Send Email</button>
        </div>
    `;
    
    modal.classList.add('show');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

document.addEventListener('click', function(e) {
    const modal = document.getElementById('user-modal');
    if (modal && modal.classList.contains('show')) {
        if (e.target.classList.contains('modal-overlay')) {
            modal.classList.remove('show');
        }
    }
});
