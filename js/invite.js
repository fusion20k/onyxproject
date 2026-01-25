// API Configuration (will be replaced with actual backend)
const API_BASE_URL = '/api';

// State management
let currentToken = null;
let currentEmail = null;

// Get URL parameters
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Show specific state
function showState(stateId) {
    document.querySelectorAll('.invite__state').forEach(state => {
        state.style.display = 'none';
    });
    const targetState = document.getElementById(stateId);
    if (targetState) {
        targetState.style.display = 'block';
    }
}

// Show error message
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

// API: Validate token
async function validateToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/invite/validate-token?token=${encodeURIComponent(token)}`);
        
        if (!response.ok) {
            return { valid: false };
        }
        
        const data = await response.json();
        return { valid: true, email: data.email };
    } catch (error) {
        console.error('Token validation error:', error);
        return { valid: false };
    }
}

// API: Validate email
async function validateEmail(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/invite/validate-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
            return { approved: false };
        }
        
        const data = await response.json();
        return { approved: data.approved, email: email };
    } catch (error) {
        console.error('Email validation error:', error);
        return { approved: false };
    }
}

// API: Create account
async function createAccount(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/create-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Account creation failed' };
        }
        
        const responseData = await response.json();
        
        if (responseData.token) {
            localStorage.setItem('onyx-token', responseData.token);
        }
        
        if (responseData.user) {
            localStorage.setItem('onyx-user-data', JSON.stringify(responseData.user));
        }
        
        return { success: true };
    } catch (error) {
        console.error('Account creation error:', error);
        return { success: false, error: 'Account creation failed' };
    }
}

// Initialize page
async function initialize() {
    const token = getUrlParam('token');
    
    if (token) {
        // State B: Token-based flow
        currentToken = token;
        const result = await validateToken(token);
        
        if (result.valid) {
            currentEmail = result.email;
            document.getElementById('account-email').textContent = result.email;
            showState('create-account-state');
        } else {
            showState('invalid-state');
        }
    } else {
        // State A: Email verification flow
        showState('email-state');
    }
}

// Handle email form submission
document.addEventListener('DOMContentLoaded', function() {
    const emailForm = document.getElementById('email-form');
    const accountForm = document.getElementById('account-form');
    
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const submitButton = emailForm.querySelector('button[type="submit"]');
            
            submitButton.disabled = true;
            submitButton.textContent = 'Verifying...';
            
            const result = await validateEmail(email);
            
            submitButton.disabled = false;
            submitButton.textContent = 'Continue';
            
            if (result.approved) {
                currentEmail = result.email;
                document.getElementById('account-email').textContent = result.email;
                showState('create-account-state');
            } else {
                showState('not-approved-state');
            }
        });
    }
    
    if (accountForm) {
        accountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const displayName = document.getElementById('display-name').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate passwords match
            if (password !== confirmPassword) {
                showError('account-error', 'Passwords do not match');
                return;
            }
            
            // Validate password length
            if (password.length < 8) {
                showError('account-error', 'Password must be at least 8 characters');
                return;
            }
            
            const submitButton = accountForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Creating account...';
            
            const result = await createAccount({
                token: currentToken,
                email: currentEmail,
                password: password,
                displayName: displayName || null
            });
            
            if (result.success) {
                showState('success-state');
                setTimeout(() => {
                    window.location.href = '/onboarding';
                }, 2000);
            } else {
                submitButton.disabled = false;
                submitButton.textContent = 'Create account';
                showError('account-error', result.error);
            }
        });
    }
    
    // Initialize on page load
    initialize();
});
