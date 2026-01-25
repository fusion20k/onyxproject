const API_BASE_URL = '/api';

const loginModal = document.getElementById('login-modal');
const loginBtn = document.getElementById('login-btn');
const closeLoginModal = document.getElementById('close-login-modal');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

function openLoginModal() {
    loginModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    loginModal.classList.remove('show');
    document.body.style.overflow = '';
    loginForm.reset();
    loginError.style.display = 'none';
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

loginBtn?.addEventListener('click', openLoginModal);

closeLoginModal?.addEventListener('click', closeModal);

loginModal?.addEventListener('click', function(e) {
    if (e.target === loginModal) {
        closeModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && loginModal.classList.contains('show')) {
        closeModal();
    }
});

loginForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showLoginError('Please enter both email and password');
        return;
    }
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    loginError.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showLoginError(data.message || 'Login failed. Please check your credentials.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
            return;
        }
        
        if (data.token) {
            localStorage.setItem('onyx-token', data.token);
        }
        
        if (data.user) {
            localStorage.setItem('onyx-user-data', JSON.stringify(data.user));
        }
        
        const onboardingComplete = localStorage.getItem('onyx-onboarding-complete');
        
        if (onboardingComplete === 'true') {
            window.location.href = '/app';
        } else {
            window.location.href = '/onboarding';
        }
        
    } catch (error) {
        console.error('Login error:', error);
        let errorMsg = 'Network error. Please try again.';
        if (error.message.includes('fetch')) {
            errorMsg = 'Unable to connect to server. Please check your internet connection.';
        }
        showLoginError(errorMsg);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});
