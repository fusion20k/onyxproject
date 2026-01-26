const BACKEND_URL = 'https://onyxbackend-55af.onrender.com';

const mockData = {
    user: {
        name: 'Demo User',
        email: 'demo@onyx.ai',
        trialDaysRemaining: 14
    },
    metrics: {
        activeConversations: 24,
        replyRate: '32%',
        qualifiedLeads: 12,
        readyForYou: 5
    },
    pipeline: {
        new: [
            { id: 1, name: 'John Smith', company: 'TechCorp', status: 'Outreach sent' },
            { id: 2, name: 'Jane Doe', company: 'SaaS Inc', status: 'Prospecting' },
            { id: 3, name: 'Mike Johnson', company: 'StartupXYZ', status: 'Outreach sent' }
        ],
        engaged: [
            { id: 4, name: 'Sarah Williams', company: 'CloudTech', status: 'Replied' },
            { id: 5, name: 'Tom Brown', company: 'DataCo', status: 'Following up' }
        ],
        qualified: [
            { id: 6, name: 'Emily Davis', company: 'Growth Inc', status: 'Qualified' },
            { id: 7, name: 'David Miller', company: 'ScaleUp', status: 'Qualified' }
        ],
        ready: [
            { id: 8, name: 'Lisa Anderson', company: 'Enterprise LLC', status: 'Ready to close' },
            { id: 9, name: 'Chris Wilson', company: 'BigCorp', status: 'Needs your input' }
        ]
    },
    conversations: [
        {
            id: 1,
            name: 'Lisa Anderson',
            company: 'Enterprise LLC',
            status: 'needs-attention',
            lastMessage: 'When can we schedule a call?',
            timestamp: '5 min ago'
        },
        {
            id: 2,
            name: 'Chris Wilson',
            company: 'BigCorp',
            status: 'active',
            lastMessage: 'Thanks for the info',
            timestamp: '2 hours ago'
        }
    ]
};

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

async function checkAuth() {
    const token = localStorage.getItem('onyx-token');
    const loadingState = document.getElementById('loading-state');
    const unauthorizedState = document.getElementById('unauthorized-state');
    const mainWorkspace = document.getElementById('main-workspace');

    if (!token) {
        loadingState.style.display = 'none';
        unauthorizedState.style.display = 'block';
        return;
    }

    const onboardingComplete = localStorage.getItem('onyx-onboarding-complete');
    if (onboardingComplete !== 'true') {
        window.location.href = '/onboarding';
        return;
    }

    try {
        const response = await fetch('/api/auth/status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                localStorage.setItem('onyx-user-data', JSON.stringify(data.user));
                
                if (data.user.subscription_status === 'expired') {
                    window.location.href = '/payment';
                    return;
                }
                
                if (data.user.trial_end) {
                    const trialEnd = new Date(data.user.trial_end);
                    const now = new Date();
                    if (trialEnd < now && data.user.subscription_status !== 'active') {
                        window.location.href = '/payment';
                        return;
                    }
                }
            }
        }
    } catch (error) {
        console.log('Session check failed, continuing with cached data');
    }

    setTimeout(() => {
        loadingState.style.display = 'none';
        mainWorkspace.style.display = 'grid';
        initializeWorkspace();
    }, 500);
}

function initializeWorkspace() {
    loadUserInfo();
    loadDashboardData();
    initializeNavigation();
    initializeUserMenu();
    initializeMobileMenu();
    initializePipeline();
    initializeConversations();
}

function loadUserInfo() {
    const userName = document.getElementById('user-name');
    const trialDays = document.getElementById('trial-days');
    const trialBadge = document.getElementById('trial-badge');
    const trialWarning = document.getElementById('trial-warning');
    const warningDays = document.getElementById('warning-days');
    
    userName.textContent = mockData.user.name;
    const daysRemaining = mockData.user.trialDaysRemaining;
    trialDays.textContent = daysRemaining;
    
    if (daysRemaining <= 3) {
        trialBadge.classList.add('trial-badge--warning');
        if (trialWarning) {
            trialWarning.style.display = 'flex';
            warningDays.textContent = daysRemaining;
        }
    } else if (daysRemaining <= 7) {
        trialBadge.classList.add('trial-badge--caution');
        if (trialWarning) {
            trialWarning.style.display = 'flex';
            warningDays.textContent = daysRemaining;
        }
    }
}

function loadDashboardData() {
    document.getElementById('metric-active').textContent = mockData.metrics.activeConversations;
    document.getElementById('metric-reply').textContent = mockData.metrics.replyRate;
    document.getElementById('metric-qualified').textContent = mockData.metrics.qualifiedLeads;
    document.getElementById('metric-ready').textContent = mockData.metrics.readyForYou;
}

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(navItem => {
        navItem.addEventListener('click', function() {
            const targetView = this.getAttribute('data-view');
            
            navItems.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(`${targetView}-view`).classList.add('active');
        });
    });
}

function initializeUserMenu() {
    const menuTrigger = document.getElementById('user-menu-trigger');
    const menuDropdown = document.getElementById('user-menu-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (menuTrigger) {
        menuTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = menuDropdown.style.display === 'block';
            menuDropdown.style.display = isVisible ? 'none' : 'block';
        });
    }

    document.addEventListener('click', function() {
        if (menuDropdown) {
            menuDropdown.style.display = 'none';
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('onyx-token');
            localStorage.removeItem('onyx-user-data');
            localStorage.removeItem('onyx-onboarding-complete');
            localStorage.removeItem('onyx-onboarding-data');
            window.location.href = '/';
        });
    }
}

function initializeMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const workspaceNav = document.querySelector('.workspace-nav');
    const navItems = document.querySelectorAll('.nav-item');

    if (mobileMenuToggle && workspaceNav) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileMenuToggle.classList.toggle('active');
            workspaceNav.classList.toggle('active');
        });

        navItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    mobileMenuToggle.classList.remove('active');
                    workspaceNav.classList.remove('active');
                }
            });
        });

        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && 
                !workspaceNav.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                mobileMenuToggle.classList.remove('active');
                workspaceNav.classList.remove('active');
            }
        });
    }
}

function initializePipeline() {
    renderPipelineColumn('new', mockData.pipeline.new);
    renderPipelineColumn('engaged', mockData.pipeline.engaged);
    renderPipelineColumn('qualified', mockData.pipeline.qualified);
    renderPipelineColumn('ready', mockData.pipeline.ready);
}

function renderPipelineColumn(columnId, leads) {
    const columnContent = document.getElementById(`column-${columnId}`);
    const countElement = document.getElementById(`count-${columnId}`);
    
    if (!columnContent) return;
    
    countElement.textContent = leads.length;
    
    columnContent.innerHTML = leads.map(lead => `
        <div class="lead-card" data-lead-id="${lead.id}">
            <div class="lead-name">${lead.name}</div>
            <div class="lead-company">${lead.company}</div>
            <div class="lead-status">${lead.status}</div>
        </div>
    `).join('');
}

function initializeConversations() {
    const conversationsList = document.getElementById('conversations-list');
    
    if (!conversationsList) return;
    
    conversationsList.innerHTML = mockData.conversations.map(conv => `
        <div class="conversation-item" data-conversation-id="${conv.id}">
            <div style="font-size: 0.9375rem; margin-bottom: 4px;">${conv.name}</div>
            <div style="font-size: 0.8125rem; color: rgba(255, 255, 255, 0.6); margin-bottom: 8px;">${conv.company}</div>
            <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5);">${conv.lastMessage}</div>
            <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); margin-top: 4px;">${conv.timestamp}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.conversation-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            loadConversationDetail(this.getAttribute('data-conversation-id'));
        });
    });
}

function loadConversationDetail(conversationId) {
    const detailArea = document.getElementById('conversation-detail');
    const conversation = mockData.conversations.find(c => c.id == conversationId);
    
    if (!conversation) return;
    
    detailArea.innerHTML = `
        <div style="padding: 32px; width: 100%; max-width: 700px;">
            <div style="margin-bottom: 24px;">
                <div style="font-size: 1.5rem; margin-bottom: 8px;">${conversation.name}</div>
                <div style="font-size: 0.9375rem; color: rgba(255, 255, 255, 0.6);">${conversation.company}</div>
            </div>
            
            <div style="background: #0a0a0a; border: 1px solid #222; padding: 20px; margin-bottom: 16px;">
                <div style="font-size: 0.8125rem; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px;">ONYX (Yesterday)</div>
                <div style="font-size: 0.9375rem; line-height: 1.6;">
                    Hi ${conversation.name.split(' ')[0]}, I noticed ${conversation.company} is in the ${mockData.pipeline.ready[0]?.status || 'growth'} phase. 
                    I wanted to reach out about how we help companies like yours scale their outreach operations.
                </div>
            </div>
            
            <div style="background: #1a1a1a; border: 1px solid #333; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 0.8125rem; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px;">${conversation.name.toUpperCase()} (5 min ago)</div>
                <div style="font-size: 0.9375rem; line-height: 1.6;">
                    ${conversation.lastMessage}
                </div>
            </div>
            
            <button class="btn-primary">Jump In & Reply</button>
        </div>
    `;
}

const saveCampaignBtn = document.getElementById('save-campaign');
if (saveCampaignBtn) {
    saveCampaignBtn.addEventListener('click', function() {
        alert('Campaign configuration saved! (Demo mode - backend integration required)');
    });
}
