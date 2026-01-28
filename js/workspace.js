// Onyx Workspace - Single Column Dashboard
// Updated to use real API calls instead of mock data

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
        const response = await onyxAPI.checkAuthStatus();
        
        if (response.user) {
            localStorage.setItem('onyx-user-data', JSON.stringify(response.user));
            
            if (response.user.subscription_status === 'expired') {
                window.location.href = '/payment';
                return;
            }
            
            if (response.user.trial_end) {
                const trialEnd = new Date(response.user.trial_end);
                const now = new Date();
                if (trialEnd < now && response.user.subscription_status !== 'active') {
                    window.location.href = '/payment';
                    return;
                }
            }
        }
    } catch (error) {
        console.log('Session check failed, continuing with cached data');
    }

    setTimeout(() => {
        loadingState.style.display = 'none';
        mainWorkspace.style.display = 'block';
        initializeWorkspace();
    }, 500);
}

async function initializeWorkspace() {
    loadUserInfo();
    await loadDashboardData();
    initializeUserMenu();
    initializeFAB();
    setCurrentDate();
}

function loadUserInfo() {
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    
    const userData = localStorage.getItem('onyx-user-data');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            userNameEl.textContent = user.display_name || user.name || 'User';
            userAvatarEl.textContent = (user.display_name || user.name || 'U')[0].toUpperCase();
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
}

function setCurrentDate() {
    const summaryDateEl = document.getElementById('summary-date');
    const today = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    summaryDateEl.textContent = `Today (${today.toLocaleDateString('en-US', options)})`;
}

async function loadDashboardData() {
    try {
        // Try to load real data, fallback to mock if API not available
        const dashboardData = await onyxAPI.safeRequest('/api/workspace/dashboard', 
            onyxAPI.getDashboardDataFallback.bind(onyxAPI)
        );
        const pipelineData = await onyxAPI.safeRequest('/api/workspace/pipeline',
            onyxAPI.getPipelineDataFallback.bind(onyxAPI)
        );
        const activityData = await onyxAPI.safeRequest('/api/workspace/activity',
            onyxAPI.getActivityStreamFallback.bind(onyxAPI)
        );

        // Update daily summary
        if (dashboardData.summary) {
            updateDailySummary(dashboardData.summary);
        }

        // Update status indicator
        if (dashboardData.status) {
            updateStatusIndicator(dashboardData.status);
        }

        // Update pipeline
        if (pipelineData.pipeline) {
            updatePipeline(pipelineData.pipeline);
        }

        // Update activity stream
        if (activityData.activities) {
            updateActivityStream(activityData.activities);
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Show error message to user
        showErrorMessage('Unable to load dashboard data. Please refresh the page.');
    }
}

function updateDailySummary(summary) {
    const conversationsStartedEl = document.getElementById('conversations-started');
    const peopleRepliedEl = document.getElementById('people-replied');
    const qualifiedLeadsEl = document.getElementById('qualified-leads');

    if (conversationsStartedEl) conversationsStartedEl.textContent = summary.conversations_started || 0;
    if (peopleRepliedEl) peopleRepliedEl.textContent = summary.replies || 0;
    if (qualifiedLeadsEl) qualifiedLeadsEl.textContent = summary.qualified_leads || 0;
}

function updateStatusIndicator(status) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');
    
    if (status.is_active && !status.is_paused) {
        statusDot.className = 'status-dot active';
        statusText.textContent = 'Active';
    } else if (status.is_paused) {
        statusDot.className = 'status-dot paused';
        statusText.textContent = 'Paused';
    } else {
        statusDot.className = 'status-dot inactive';
        statusText.textContent = 'Inactive';
    }
}

function updatePipeline(pipeline) {
    const stages = ['found', 'contacted', 'talking', 'ready'];
    
    stages.forEach(stage => {
        const countEl = document.getElementById(`count-${stage}`);
        const contentEl = document.getElementById(`prospects-${stage}`);
        const prospects = pipeline[stage] || [];
        
        // Update count
        if (countEl) countEl.textContent = prospects.length;
        
        // Update content
        if (contentEl) {
            if (prospects.length === 0) {
                contentEl.innerHTML = '<div class="empty-stage">No prospects yet</div>';
            } else {
                contentEl.innerHTML = prospects.map(prospect => `
                    <div class="prospect-card" data-prospect-id="${prospect.id}">
                        <div class="prospect-name">${prospect.first_name}</div>
                        <div class="prospect-company">${prospect.company}</div>
                        <div class="prospect-priority priority-${prospect.priority || 'normal'}"></div>
                    </div>
                `).join('');
                
                // Add click handlers
                contentEl.querySelectorAll('.prospect-card').forEach(card => {
                    card.addEventListener('click', function() {
                        const prospectId = this.dataset.prospectId;
                        showProspectDetails(prospectId);
                    });
                });
            }
        }
    });
}

function updateActivityStream(activities) {
    const activityStreamEl = document.getElementById('activity-stream');
    
    if (!activityStreamEl) return;
    
    if (activities.length === 0) {
        activityStreamEl.innerHTML = '<div class="empty-activity">No recent activity</div>';
        return;
    }
    
    activityStreamEl.innerHTML = activities.map(activity => {
        const timeAgo = formatTimeAgo(activity.created_at);
        return `
            <div class="activity-item">
                <div class="activity-time">${timeAgo}</div>
                <div class="activity-description">${activity.description}</div>
            </div>
        `;
    }).join('');
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return activityTime.toLocaleDateString();
}

function showProspectDetails(prospectId) {
    // TODO: Implement prospect details modal or sidebar
    console.log('Show prospect details for:', prospectId);
    alert(`Prospect details for ID: ${prospectId}\n\nThis will show a modal with conversation history, notes, and actions.`);
}

function initializeUserMenu() {
    const menuBtn = document.getElementById('user-menu-btn');
    const menuDropdown = document.getElementById('user-menu-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (menuBtn) {
        menuBtn.addEventListener('click', function(e) {
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
            logout();
        });
    }
}

function initializeFAB() {
    const fabBtn = document.getElementById('floating-action-btn');
    const fabMenu = document.getElementById('fab-menu');
    const addPersonBtn = document.getElementById('add-person');
    const pauseOnyxBtn = document.getElementById('pause-onyx');
    const settingsBtn = document.getElementById('settings');

    if (fabBtn) {
        fabBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = fabMenu.style.display === 'block';
            fabMenu.style.display = isVisible ? 'none' : 'block';
        });
    }

    document.addEventListener('click', function() {
        if (fabMenu) {
            fabMenu.style.display = 'none';
        }
    });

    if (addPersonBtn) {
        addPersonBtn.addEventListener('click', function() {
            showAddPersonModal();
            fabMenu.style.display = 'none';
        });
    }

    if (pauseOnyxBtn) {
        pauseOnyxBtn.addEventListener('click', function() {
            toggleOnyxStatus();
            fabMenu.style.display = 'none';
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            showSettingsModal();
            fabMenu.style.display = 'none';
        });
    }
}

function showAddPersonModal() {
    // TODO: Implement add person modal
    const name = prompt('Enter person\'s name:');
    const company = prompt('Enter company name:');
    const email = prompt('Enter email address:');
    
    if (name && company && email) {
        addProspectManually(name, company, email);
    }
}

async function addProspectManually(name, company, email) {
    try {
        const prospectData = {
            first_name: name.split(' ')[0],
            last_name: name.split(' ').slice(1).join(' '),
            company: company,
            email: email
        };
        
        await onyxAPI.addProspect(prospectData);
        
        // Refresh dashboard
        await loadDashboardData();
        
        showSuccessMessage(`${name} from ${company} has been added to your pipeline.`);
    } catch (error) {
        console.error('Error adding prospect:', error);
        showErrorMessage('Failed to add prospect. Please try again.');
    }
}

async function toggleOnyxStatus() {
    try {
        const currentSettings = await onyxAPI.getUserSettings();
        const newStatus = !currentSettings.is_paused;
        
        await onyxAPI.updateSettings({ is_paused: newStatus });
        
        // Update status indicator
        updateStatusIndicator({
            is_active: !newStatus,
            is_paused: newStatus
        });
        
        showSuccessMessage(newStatus ? 'Onyx has been paused.' : 'Onyx is now active.');
    } catch (error) {
        console.error('Error toggling status:', error);
        showErrorMessage('Failed to update Onyx status. Please try again.');
    }
}

function showSettingsModal() {
    // TODO: Implement settings modal
    alert('Settings modal will be implemented here.\n\nUsers will be able to:\n- Adjust targeting parameters\n- Update messaging preferences\n- Configure notification settings\n- Manage integrations');
}

function logout() {
    localStorage.removeItem('onyx-token');
    localStorage.removeItem('onyx-user-data');
    localStorage.removeItem('onyx-onboarding-complete');
    localStorage.removeItem('onyx-onboarding-data');
    window.location.href = '/';
}

function showSuccessMessage(message) {
    // TODO: Implement proper notification system
    alert('✅ ' + message);
}

function showErrorMessage(message) {
    // TODO: Implement proper notification system  
    alert('❌ ' + message);
}

// Details button handler
document.getElementById('details-btn')?.addEventListener('click', function() {
    // TODO: Implement detailed analytics modal
    alert('Detailed analytics will show:\n\n• Hourly activity breakdown\n• Performance trends\n• Conversion metrics\n• Response time analysis');
});

// Auto-refresh dashboard every 30 seconds
setInterval(async () => {
    try {
        await loadDashboardData();
    } catch (error) {
        console.error('Auto-refresh failed:', error);
    }
}, 30000);