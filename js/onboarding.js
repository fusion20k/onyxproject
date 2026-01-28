// Onyx Onboarding Flow

let currentStep = 1;
const totalSteps = 3;
const onboardingData = {
    business_help_who: '',
    business_help_with: '',
    target_industries: [],
    target_company_size: '',
    target_job_titles: '',
    target_location: '',
    service_type: '',
    email_option: '',
    forward_email: null
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
    // Step 1: Business Form
    const businessForm = document.getElementById('business-form');
    if (businessForm) {
        businessForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveBusinessData();
            nextStep();
        });
    }

    // Step 2: Email Form
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveEmailData();
            nextStep();
        });
    }

    // Initialize selectors
    initializeSelectors();
}

function initializeSelectors() {
    // Industry selector (multi-select)
    const industrySelector = document.getElementById('industry-selector');
    if (industrySelector) {
        industrySelector.addEventListener('click', function(e) {
            if (e.target.classList.contains('tag-option')) {
                e.target.classList.toggle('selected');
                updateSelectedIndustries();
            }
        });
    }

    // Single-select button groups
    const selectors = ['size-selector', 'title-selector', 'location-selector', 'service-selector'];
    selectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.addEventListener('click', function(e) {
                if (e.target.classList.contains('option-btn')) {
                    // Remove active from siblings
                    selector.querySelectorAll('.option-btn').forEach(btn => 
                        btn.classList.remove('active')
                    );
                    // Add active to clicked
                    e.target.classList.add('active');
                    
                    // Update hidden input
                    const hiddenInput = selector.closest('.selector-row').querySelector('input[type="hidden"]');
                    if (hiddenInput) {
                        hiddenInput.value = e.target.dataset.value;
                    }
                }
            });
        }
    });

    // Email option selector
    const emailOptions = document.querySelectorAll('.email-option');
    emailOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            emailOptions.forEach(opt => opt.classList.remove('selected'));
            // Add to clicked option
            this.classList.add('selected');
            
            // Check the radio button
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }

            // Show/hide forward email field
            const forwardField = document.querySelector('.forward-email-field');
            if (forwardField) {
                forwardField.style.display = 
                    radio.value === 'forward' ? 'block' : 'none';
            }
        });
    });
}

function updateSelectedIndustries() {
    const selectedTags = document.querySelectorAll('#industry-selector .tag-option.selected');
    const industries = Array.from(selectedTags).map(tag => tag.dataset.value);
    document.getElementById('selected-industries').value = industries.join(',');
}

function saveBusinessData() {
    onboardingData.business_help_who = document.getElementById('help-who').value;
    onboardingData.business_help_with = document.getElementById('help-with').value;
    onboardingData.target_industries = document.getElementById('selected-industries').value.split(',').filter(Boolean);
    onboardingData.target_company_size = document.getElementById('selected-size').value;
    onboardingData.target_job_titles = document.getElementById('selected-titles').value;
    onboardingData.target_location = document.getElementById('selected-location').value;
    onboardingData.service_type = document.getElementById('selected-service').value;
    
    saveData();
}

function saveEmailData() {
    const emailOption = document.querySelector('input[name="email-option"]:checked');
    onboardingData.email_option = emailOption ? emailOption.value : '';
    
    if (onboardingData.email_option === 'forward') {
        onboardingData.forward_email = document.getElementById('forward-email').value;
    }
    
    saveData();
}

function nextStep() {
    if (currentStep < totalSteps) {
        if (currentStep === 2) {
            // Moving to step 3 (launch), start launch sequence
            updateStepDisplay(currentStep + 1);
            startLaunchSequence();
        } else {
            updateStepDisplay(currentStep + 1);
        }
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

function startLaunchSequence() {
    const statusMessages = [
        'Configuring your outreach parameters...',
        'Setting up prospect targeting...',
        'Initializing AI messaging system...',
        'Onyx is ready to work!'
    ];
    
    const statusElement = document.getElementById('status-message');
    const dots = document.querySelectorAll('.progress-dots .dot');
    
    let messageIndex = 0;
    let dotIndex = 0;
    
    const updateMessage = () => {
        if (messageIndex < statusMessages.length - 1) {
            statusElement.textContent = statusMessages[messageIndex];
            
            // Update dots
            if (dotIndex < dots.length) {
                dots[dotIndex].classList.add('active');
                dotIndex++;
            }
            
            messageIndex++;
            setTimeout(updateMessage, 1500);
        } else {
            // Final message and complete onboarding
            statusElement.textContent = statusMessages[statusMessages.length - 1];
            dots.forEach(dot => dot.classList.add('active'));
            
            setTimeout(() => {
                completeOnboarding();
            }, 2000);
        }
    };
    
    // Start the sequence after a short delay
    setTimeout(updateMessage, 1000);
}

async function completeOnboarding() {
    try {
        // Send onboarding data to backend
        const response = await onyxAPI.completeOnboarding(onboardingData);
        
        localStorage.setItem('onyx-onboarding-complete', 'true');
        localStorage.setItem('onyx-onboarding-data', JSON.stringify(onboardingData));
        
        // Redirect to workspace
        window.location.href = '/app';
        
    } catch (error) {
        console.error('Failed to complete onboarding:', error);
        
        // Fallback: complete locally
        localStorage.setItem('onyx-onboarding-complete', 'true');
        localStorage.setItem('onyx-onboarding-data', JSON.stringify(onboardingData));
        
        window.location.href = '/app';
    }
}
