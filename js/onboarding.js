// Onyx Onboarding Flow

let currentStep = 1;
const totalSteps = 5;
const onboardingData = {
    profile: {},
    icp: {},
    channels: {
        linkedin: false,
        email: false
    }
};

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadSavedData();
    initializeForms();
});

function checkAuth() {
    const token = localStorage.getItem('onyx-token');
    
    if (!token) {
        window.location.href = '/';
        return;
    }

    const onboardingComplete = localStorage.getItem('onyx-onboarding-complete');
    if (onboardingComplete === 'true') {
        window.location.href = '/app';
        return;
    }
}

function loadSavedData() {
    const saved = localStorage.getItem('onyx-onboarding-data');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            Object.assign(onboardingData, data);
            populateFormFields();
        } catch (e) {
            console.error('Error loading saved data:', e);
            localStorage.removeItem('onyx-onboarding-data');
        }
    }
}

function saveData() {
    localStorage.setItem('onyx-onboarding-data', JSON.stringify(onboardingData));
}

function populateFormFields() {
    if (onboardingData.profile.companyName) {
        document.getElementById('company-name').value = onboardingData.profile.companyName;
    }
    if (onboardingData.profile.description) {
        document.getElementById('company-description').value = onboardingData.profile.description;
    }
    if (onboardingData.profile.website) {
        document.getElementById('company-website').value = onboardingData.profile.website;
    }
    if (onboardingData.profile.industry) {
        document.getElementById('company-industry').value = onboardingData.profile.industry;
    }
    
    if (onboardingData.icp.industries) {
        document.getElementById('icp-industries').value = onboardingData.icp.industries;
    }
    if (onboardingData.icp.size) {
        document.getElementById('icp-size').value = onboardingData.icp.size;
    }
    if (onboardingData.icp.location) {
        document.getElementById('icp-location').value = onboardingData.icp.location;
    }
    if (onboardingData.icp.titles) {
        document.getElementById('icp-titles').value = onboardingData.icp.titles;
    }
    if (onboardingData.icp.painPoints) {
        document.getElementById('icp-pain-points').value = onboardingData.icp.painPoints;
    }
}

function initializeForms() {
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfileData();
            nextStep();
        });
    }

    const icpForm = document.getElementById('icp-form');
    if (icpForm) {
        icpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveICPData();
            nextStep();
        });
    }
}

function saveProfileData() {
    onboardingData.profile = {
        companyName: document.getElementById('company-name').value,
        description: document.getElementById('company-description').value,
        website: document.getElementById('company-website').value,
        industry: document.getElementById('company-industry').value
    };
    saveData();
}

function saveICPData() {
    onboardingData.icp = {
        industries: document.getElementById('icp-industries').value,
        size: document.getElementById('icp-size').value,
        location: document.getElementById('icp-location').value,
        titles: document.getElementById('icp-titles').value,
        painPoints: document.getElementById('icp-pain-points').value
    };
    saveData();
    updateSummary();
}

function updateSummary() {
    document.getElementById('summary-industries').textContent = onboardingData.icp.industries || '—';
    document.getElementById('summary-size').textContent = onboardingData.icp.size || '—';
    document.getElementById('summary-titles').textContent = onboardingData.icp.titles || '—';
    document.getElementById('summary-location').textContent = onboardingData.icp.location || '—';
}

function nextStep() {
    if (currentStep < totalSteps) {
        updateStepDisplay(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 1) {
        updateStepDisplay(currentStep - 1);
    }
}

function updateStepDisplay(stepNumber) {
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach((step, index) => {
        const stepNum = index + 1;
        if (stepNum < stepNumber) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
    
    currentStep = stepNumber;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function connectChannel(channel) {
    alert(`Channel connection will be implemented with backend integration.\n\nFor now, this is a placeholder. You'll connect your ${channel.charAt(0).toUpperCase() + channel.slice(1)} account here.`);
    
    onboardingData.channels[channel] = true;
    
    const channelCards = document.querySelectorAll('.channel-card');
    channelCards.forEach(card => {
        const channelName = card.querySelector('.channel-name').textContent.toLowerCase();
        if (channelName === channel) {
            const statusEl = card.querySelector('.channel-status');
            const btnEl = card.querySelector('.btn-channel');
            statusEl.textContent = 'Connected';
            statusEl.classList.add('connected');
            btnEl.textContent = 'Disconnect';
            btnEl.classList.add('connected');
        }
    });
    
    saveData();
}

function completeOnboarding() {
    if (!onboardingData.profile.companyName) {
        alert('Please complete your business profile first.');
        updateStepDisplay(2);
        return;
    }
    
    if (!onboardingData.icp.industries || !onboardingData.icp.size) {
        alert('Please complete your ICP configuration first.');
        updateStepDisplay(3);
        return;
    }
    
    localStorage.setItem('onyx-onboarding-complete', 'true');
    
    localStorage.setItem('onyx-user-data', JSON.stringify({
        profile: onboardingData.profile,
        icp: onboardingData.icp,
        channels: onboardingData.channels,
        setupDate: new Date().toISOString()
    }));
    
    window.location.href = '/app';
}
