const API_BASE_URL = '/api';

let session = null;
let currentApplicationId = null;
let currentFilter = 'pending';
let allApplications = [];

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
    document.querySelectorAll('.admin__state').forEach(state => {
        state.style.display = 'none';
    });
    const targetState = document.getElementById(stateId);
    if (targetState) {
        targetState.style.display = 'block';
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
        
        // Backend might return data.applications or just an array directly
        const applications = data.applications || data || [];
        return { success: true, applications: applications };
    } catch (error) {
        console.error('Fetch applications error:', error);
        return { success: false, error: 'Cannot connect to backend. Please check if backend is running.' };
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

async function denyApplication(applicationId, reason) {
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

function renderApplications(applications) {
    allApplications = applications || [];
    
    const tbody = document.getElementById('applications-tbody');
    const container = document.getElementById('applications-container');
    const noApps = document.getElementById('no-applications');
    const loading = document.getElementById('loading-table');
    const statsText = document.getElementById('stats-text');

    loading.style.display = 'none';

    // Filter applications based on current filter
    let filteredApps = allApplications;
    if (currentFilter !== 'all') {
        filteredApps = allApplications.filter(a => a.status === currentFilter);
    }

    // Update stats with all applications
    const pending = allApplications.filter(a => a.status === 'pending').length;
    const approved = allApplications.filter(a => a.status === 'approved').length;
    const denied = allApplications.filter(a => a.status === 'denied').length;
    statsText.textContent = `Pending: ${pending} | Approved: ${approved} | Denied: ${denied}`;

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
            <td class="admin__reason">${escapeHtml(app.reason || app.context || 'N/A')}</td>
            <td>${escapeHtml(app.project || 'N/A')}</td>
            <td><span class="admin__status admin__status--${app.status}">${app.status}</span></td>
            <td class="admin__actions">
                ${app.status === 'pending' ? `
                    <button class="admin__button admin__button--approve" data-id="${app.id}">Approve</button>
                    <button class="admin__button admin__button--deny" data-id="${app.id}">Deny</button>
                ` : '-'}
            </td>
        `;

        tbody.appendChild(tr);
    });

    document.querySelectorAll('.admin__button--approve').forEach(btn => {
        btn.addEventListener('click', handleApprove);
    });

    document.querySelectorAll('.admin__button--deny').forEach(btn => {
        btn.addEventListener('click', handleDeny);
    });
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
        modal.style.display = 'flex';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        if (modalId === 'deny-modal') {
            document.getElementById('deny-reason').value = '';
        }
    }
}

async function loadApplications() {
    console.log('loadApplications called');
    document.getElementById('loading-table').style.display = 'block';
    document.getElementById('applications-container').style.display = 'none';
    document.getElementById('no-applications').style.display = 'none';

    const result = await fetchApplications();
    console.log('fetchApplications result:', result);

    if (result.success) {
        console.log('Success - rendering applications');
        renderApplications(result.applications);
    } else {
        console.log('Failed - showing error:', result.error);
        document.getElementById('loading-table').textContent = result.error || 'Failed to load applications';
    }
}

function logout() {
    session = null;
    localStorage.removeItem('session');
    showState('auth-state');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function checkAuth() {
    const sess = getSession();
    if (sess && sess.access_token) {
        showState('dashboard-state');
        loadApplications();
    } else {
        showState('auth-state');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const denyForm = document.getElementById('deny-form');
    const cancelDenyBtn = document.getElementById('cancel-deny');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            const submitButton = loginForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';

            const result = await login(email, password);

            if (result.success) {
                showState('dashboard-state');
                loadApplications();
            } else {
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
                showError('login-error', result.error);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadApplications);
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

    const filterBtns = document.querySelectorAll('.admin__filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            currentFilter = this.dataset.filter;
            
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            renderApplications(allApplications);
        });
    });

    checkAuth();
});
