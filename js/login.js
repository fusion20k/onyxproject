let loginModal;
let loginBtn;
let closeLoginModal;
let loginForm;
let loginError;

function openLoginModal() {
    if (loginModal) {
        loginModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    if (loginModal && loginForm && loginError) {
        loginModal.classList.remove('show');
        document.body.style.overflow = '';
        loginForm.reset();
        loginError.style.display = 'none';
    }
}

function showLoginError(message) {
    if (loginError) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }
}

function initializeLoginModal() {
    loginModal = document.getElementById('login-modal');
    loginBtn = document.getElementById('login-btn');
    closeLoginModal = document.getElementById('close-login-modal');
    loginForm = document.getElementById('login-form');
    loginError = document.getElementById('login-error');

    if (loginBtn) {
        loginBtn.addEventListener('click', openLoginModal);
    }

    if (closeLoginModal) {
        closeLoginModal.addEventListener('click', closeModal);
    }

    if (loginModal) {
        loginModal.addEventListener('click', function(e) {
            if (e.target === loginModal) {
                closeModal();
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && loginModal && loginModal.classList.contains('show')) {
            closeModal();
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
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
                
                closeModal();
                
                if (window.checkAuthStatus) {
                    window.checkAuthStatus();
                }
                
                window.location.hash = 'pricing';
                const pricingSection = document.getElementById('pricing');
                if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: 'smooth' });
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
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLoginModal);
} else {
    initializeLoginModal();
}
