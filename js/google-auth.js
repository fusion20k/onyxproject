// Google OAuth Authentication for Onyx
// Handles Google Sign-In integration for both signup and login

// Google OAuth configuration
const GOOGLE_CLIENT_ID = '810963662691-t48kqkocpcn67mrp05onjliqc1qa25kg.apps.googleusercontent.com'; // TODO: Replace with actual client ID

// Initialize Google Auth when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeGoogleAuth();
});

function initializeGoogleAuth() {
    // Initialize Google Identity Services
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignUp,
            auto_select: false,
            cancel_on_tap_outside: true
        });
        
        // Add click handler to custom button
        const customBtn = document.getElementById('custom-google-btn');
        if (customBtn) {
            customBtn.addEventListener('click', () => {
                google.accounts.id.prompt();
            });
        }
    } else {
        console.warn('Google Identity Services not loaded');
        // Retry after a short delay
        setTimeout(initializeGoogleAuth, 1000);
    }
}

// Handle Google Sign-Up callback
async function handleGoogleSignUp(response) {
    if (!response.credential) {
        console.error('No credential received from Google');
        showErrorMessage('Google authentication failed. Please try again.');
        return;
    }

    try {
        // Show loading state
        showLoadingState('Signing up with Google...');
        
        // Send the Google credential to our backend
        const result = await onyxAPI.googleAuth(response.credential);
        
        if (result.success) {
            // Store the token
            localStorage.setItem('onyx-token', result.token);
            localStorage.setItem('onyx-user-data', JSON.stringify(result.user));
            
            // Check if onboarding is complete
            if (result.user.onboarding_complete) {
                // Show success message
                showSuccessMessage('Welcome back! Redirecting to your workspace...');
                
                // Redirect to workspace
                setTimeout(() => {
                    window.location.href = '/app';
                }, 1500);
            } else {
                // Show success message
                showSuccessMessage('Account created! Redirecting to setup...');
                
                // Redirect to onboarding
                setTimeout(() => {
                    window.location.href = '/onboarding';
                }, 1500);
            }
        } else {
            throw new Error(result.message || 'Google authentication failed');
        }
        
    } catch (error) {
        console.error('Google auth error:', error);
        hideLoadingState();
        
        // Handle specific error cases
        if (error.message && error.message.includes('already exists')) {
            showErrorMessage('An account with this email already exists. Please try signing in instead.');
        } else {
            showErrorMessage('Failed to sign up with Google. Please try again or use email signup.');
        }
    }
}

// Handle Google Sign-In for existing users (for login page)
async function handleGoogleSignIn(response) {
    if (!response.credential) {
        console.error('No credential received from Google');
        showErrorMessage('Google authentication failed. Please try again.');
        return;
    }

    try {
        // Show loading state
        showLoadingState('Signing in with Google...');
        
        // Send the Google credential to our backend
        const result = await onyxAPI.googleAuth(response.credential);
        
        if (result.success) {
            // Store the token
            localStorage.setItem('onyx-token', result.token);
            localStorage.setItem('onyx-user-data', JSON.stringify(result.user));
            
            // Show success message
            showSuccessMessage('Welcome back! Redirecting to your workspace...');
            
            // Redirect based on onboarding status
            const redirectUrl = result.user.onboarding_complete ? '/app' : '/onboarding';
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
        } else {
            throw new Error(result.message || 'Google authentication failed');
        }
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        hideLoadingState();
        
        if (error.message && error.message.includes('not found')) {
            showErrorMessage('No account found with this Google account. Please sign up first.');
        } else {
            showErrorMessage('Failed to sign in with Google. Please try again or use email login.');
        }
    }
}

// Initialize Google Sign-In for login page
function initializeGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true
        });
        
        // Render sign-in button if container exists
        const signInContainer = document.getElementById('google-signin-button');
        if (signInContainer) {
            google.accounts.id.renderButton(signInContainer, {
                type: 'standard',
                shape: 'rectangular',
                theme: 'filled_blue',
                text: 'signin_with',
                size: 'large',
                logo_alignment: 'left'
            });
        }
    }
}

// Utility functions for UI feedback
function showLoadingState(message) {
    // Disable form elements
    const form = document.getElementById('signup-form-element') || document.getElementById('login-form');
    if (form) {
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => input.disabled = true);
    }
    
    // Show loading message
    const loadingEl = document.getElementById('loading-message');
    if (loadingEl) {
        loadingEl.textContent = message;
        loadingEl.style.display = 'block';
    }
    
    // Hide Google button temporarily
    const googleButton = document.querySelector('.g_id_signin');
    if (googleButton) {
        googleButton.style.opacity = '0.5';
        googleButton.style.pointerEvents = 'none';
    }
}

function hideLoadingState() {
    // Re-enable form elements
    const form = document.getElementById('signup-form-element') || document.getElementById('login-form');
    if (form) {
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => input.disabled = false);
    }
    
    // Hide loading message
    const loadingEl = document.getElementById('loading-message');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
    
    // Restore Google button
    const googleButton = document.querySelector('.g_id_signin');
    if (googleButton) {
        googleButton.style.opacity = '1';
        googleButton.style.pointerEvents = 'auto';
    }
}

function showSuccessMessage(message) {
    const successEl = document.getElementById('success-message');
    if (successEl) {
        successEl.textContent = message;
        successEl.style.display = 'block';
    }
    
    // Hide error message if visible
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

function showErrorMessage(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
    
    // Hide success message if visible
    const successEl = document.getElementById('success-message');
    if (successEl) {
        successEl.style.display = 'none';
    }
}

// Make functions globally available
window.handleGoogleSignUp = handleGoogleSignUp;
window.handleGoogleSignIn = handleGoogleSignIn;
window.initializeGoogleSignIn = initializeGoogleSignIn;