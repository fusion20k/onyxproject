const API_BASE_URL = '/api';

let currentUser = null;

function showState(stateId) {
    document.querySelectorAll('.app__state').forEach(state => {
        state.style.display = 'none';
    });
    const targetState = document.getElementById(stateId);
    if (targetState) {
        targetState.style.display = 'block';
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
            credentials: 'include'
        });

        if (!response.ok) {
            return { authenticated: false };
        }

        const data = await response.json();
        return { 
            authenticated: true, 
            user: data.user 
        };
    } catch (error) {
        console.error('Auth check error:', error);
        return { authenticated: false };
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
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
    document.getElementById('user-name').textContent = userName;
    
    showState('workspace-state');
}

document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    initialize();
});
