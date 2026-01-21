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
        const sessionData = localStorage.getItem('session');
        console.log('[APP] Session data:', sessionData ? 'found' : 'not found');
        
        if (!sessionData) {
            console.warn('[APP] No session in localStorage');
            return { authenticated: false };
        }
        
        const session = JSON.parse(sessionData);
        const accessToken = session.access_token;
        console.log('[APP] Access token:', accessToken ? 'found' : 'missing');
        
        if (!accessToken) {
            console.warn('[APP] No access token in session');
            return { authenticated: false };
        }
        
        console.log('[APP] Calling /api/auth/status');
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        console.log('[APP] Auth status response:', response.status);

        if (!response.ok) {
            console.warn('[APP] Auth check failed:', response.status);
            return { authenticated: false };
        }

        const data = await response.json();
        console.log('[APP] Auth response data:', JSON.stringify(data, null, 2));
        console.log('[APP] User object:', data.user);
        console.log('[APP] User paid status:', data.user?.paid);
        
        return { 
            authenticated: data.authenticated !== false, 
            user: data.user 
        };
    } catch (error) {
        console.error('[APP] Auth check error:', error);
        return { authenticated: false };
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
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('session');
    localStorage.removeItem('user');
    
    window.location.href = '/';
}

async function initialize() {
    console.log('[APP] Initializing workspace...');
    const authStatus = await checkAuthStatus();

    console.log('[APP] Auth status:', authStatus.authenticated);
    if (!authStatus.authenticated) {
        console.warn('[APP] Not authenticated - showing unauthorized');
        showState('unauthorized-state');
        return;
    }

    currentUser = authStatus.user;
    console.log('[APP] Current user:', currentUser);

    if (!currentUser) {
        console.error('[APP] No user data - showing unauthorized');
        showState('unauthorized-state');
        return;
    }

    console.log('[APP] Checking paid status:', currentUser.paid);
    if (!currentUser.paid) {
        console.warn('[APP] User not paid - showing unpaid state');
        showState('unpaid-state');
        return;
    }

    const userName = currentUser.display_name || currentUser.email;
    console.log('[APP] Showing workspace for user:', userName);
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
