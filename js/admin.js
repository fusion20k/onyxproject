const API_BASE_URL = '/api';

let authToken = null;
let currentApplicationId = null;

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
        authToken = data.token || 'demo-token';
        localStorage.setItem('admin_token', authToken);
        return { success: true };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Cannot connect to backend. Check if backend is running.' };
    }
}

async function fetchApplications() {
    try {
        const token = authToken || localStorage.getItem('admin_token');
        
        const response = await fetch(`${API_BASE_URL}/admin/applications`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.status === 401) {
            return { success: false, error: 'Authentication failed. Please check your credentials.' };
        }

        if (!response.ok) {
            return { success: false, error: 'Failed to fetch applications. Backend may not be ready.' };
        }

        const data = await response.json();
        return { success: true, applications: data.applications || [] };
    } catch (error) {
        console.error('Fetch applications error:', error);
        return { success: false, error: 'Cannot connect to backend. Please check if backend is running.' };
    }
}

async function approveApplication(applicationId) {
    try {
        const token = authToken || localStorage.getItem('admin_token');
        
        const response = await fetch(`${API_BASE_URL}/admin/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
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
        const token = authToken || localStorage.getItem('admin_token');
        
        const response = await fetch(`${API_BASE_URL}/admin/deny`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
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
    const tbody = document.getElementById('applications-tbody');
    const container = document.getElementById('applications-container');
    const noApps = document.getElementById('no-applications');
    const loading = document.getElementById('loading-table');
    const statsText = document.getElementById('stats-text');

    loading.style.display = 'none';

    if (!applications || applications.length === 0) {
        container.style.display = 'none';
        noApps.style.display = 'block';
        statsText.textContent = 'No applications';
        return;
    }

    noApps.style.display = 'none';
    container.style.display = 'block';

    const pending = applications.filter(a => a.status === 'pending').length;
    const approved = applications.filter(a => a.status === 'approved').length;
    const denied = applications.filter(a => a.status === 'denied').length;
    statsText.textContent = `Total: ${applications.length} | Pending: ${pending} | Approved: ${approved} | Denied: ${denied}`;

    tbody.innerHTML = '';

    applications.forEach(app => {
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
    document.getElementById('loading-table').style.display = 'block';
    document.getElementById('applications-container').style.display = 'none';
    document.getElementById('no-applications').style.display = 'none';

    const result = await fetchApplications();

    if (result.success) {
        renderApplications(result.applications);
    } else {
        document.getElementById('loading-table').textContent = result.error || 'Failed to load applications';
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('admin_token');
    showState('auth-state');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (token) {
        authToken = token;
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

    checkAuth();
});
