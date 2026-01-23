const API_BASE_URL = '/api';

let currentUser = null;
let decisions = [];

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

async function loadLibrary() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        if (!accessToken) {
            return { success: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/decisions/library`, {
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
        console.error('Error loading library:', error);
        return { success: false };
    }
}

async function loadDecisionDetail(decisionId) {
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

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading decision detail:', error);
        return { success: false };
    }
}

function renderLibrary(decisions) {
    const container = document.getElementById('library-list');
    const emptyState = document.getElementById('empty-state');
    
    if (!decisions || decisions.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = '';

    decisions.forEach(decision => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.dataset.id = decision.id;
        
        const date = new Date(decision.committed_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        item.innerHTML = `
            <div class="library-item-header">
                <h3 class="library-item-title">${decision.title || 'Untitled Decision'}</h3>
                <span class="library-item-date">${date}</span>
            </div>
            <div class="library-item-meta">
                ${decision.goal || 'No goal specified'}
            </div>
            <div class="library-item-action">Open →</div>
        `;
        
        item.addEventListener('click', () => openDecisionModal(decision.id));
        
        container.appendChild(item);
    });
}

async function openDecisionModal(decisionId) {
    const modal = document.getElementById('decision-modal');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    
    modalBody.innerHTML = '<p style="text-align: center; padding: 40px; color: #888;">Loading...</p>';
    modal.style.display = 'block';
    
    const data = await loadDecisionDetail(decisionId);
    
    if (!data.success || !data.decision) {
        modalBody.innerHTML = '<p style="text-align: center; padding: 40px; color: #ff6b6b;">Failed to load decision</p>';
        return;
    }

    const { decision, options, recommendation } = data;
    
    modalTitle.textContent = decision.title || 'Decision Detail';
    
    let html = '';
    
    html += `
        <div class="modal-section">
            <h3 class="modal-section-title">Understanding</h3>
            <ul class="modal-understanding-list">
                <li><strong>Goal:</strong> ${decision.goal || '—'}</li>
                <li><strong>Time horizon:</strong> ${decision.time_horizon || '—'}</li>
                <li><strong>Constraints:</strong> ${Array.isArray(decision.constraints) ? decision.constraints.join(', ') : '—'}</li>
                <li><strong>Primary metric:</strong> ${decision.primary_metric || '—'}</li>
                <li><strong>Risk tolerance:</strong> ${decision.risk_tolerance || '—'}</li>
            </ul>
        </div>
    `;
    
    if (options && options.length > 0) {
        html += `
            <div class="modal-section">
                <h3 class="modal-section-title">Options Analyzed</h3>
                <div class="modal-options">
        `;
        
        options.forEach(option => {
            const fragilityClass = `fragility-${option.fragility_score || 'balanced'}`;
            html += `
                <div class="modal-option">
                    <div class="modal-option-header">
                        <h4 class="modal-option-name">${option.name}</h4>
                        <span class="fragility-badge ${fragilityClass}">${option.fragility_score || 'balanced'}</span>
                    </div>
                    <div class="modal-option-detail">
                        <div class="modal-option-label">Upside</div>
                        <div class="modal-option-text">${option.upside || '—'}</div>
                    </div>
                    <div class="modal-option-detail">
                        <div class="modal-option-label">Downside</div>
                        <div class="modal-option-text">${option.downside || '—'}</div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    if (recommendation) {
        const recommendedOption = options?.find(opt => opt.id === recommendation.recommended_option_id);
        html += `
            <div class="modal-section">
                <h3 class="modal-section-title">Analysis</h3>
                <div class="modal-recommendation">
                    <span class="modal-recommendation-label">Most robust option:</span>
                    <h3>${recommendedOption?.name || 'Unknown'}</h3>
                    <p>${recommendation.reasoning || '—'}</p>
                </div>
            </div>
        `;
    }
    
    modalBody.innerHTML = html;
}

function closeModal() {
    document.getElementById('decision-modal').style.display = 'none';
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
        window.location.href = '/';
        return;
    }

    currentUser = authStatus.user;
    const userName = currentUser.display_name || currentUser.email;
    document.getElementById('username').textContent = userName;

    const libraryData = await loadLibrary();

    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('library-content').style.display = 'block';

    if (libraryData.success && libraryData.decisions) {
        decisions = libraryData.decisions;
        renderLibrary(decisions);
    } else {
        document.getElementById('empty-state').style.display = 'block';
    }

    setupEventListeners();
}

function setupEventListeners() {
    const userMenuTrigger = document.getElementById('user-menu');
    const userDropdown = document.getElementById('user-dropdown');

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
        } else if (action === 'workspace') {
            window.location.href = '/app';
        }
    });

    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', closeModal);
}

document.addEventListener('DOMContentLoaded', initialize);
