const BACKEND_URL = 'https://onyxbackend-55af.onrender.com';

window.checkAuthStatus = function checkAuthStatus() {
    const token = localStorage.getItem('onyx-token');
    const userData = localStorage.getItem('onyx-user-data');
    
    const loginBtn = document.getElementById('login-btn');
    const accountMenu = document.getElementById('account-menu');
    
    if (token && userData) {
        try {
            const user = JSON.parse(userData);
            
            if (loginBtn) loginBtn.style.display = 'none';
            if (accountMenu) {
                accountMenu.style.display = 'block';
                const accountName = document.getElementById('account-name');
                if (accountName) {
                    accountName.textContent = user.display_name || user.name || 'My Account';
                }
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (accountMenu) accountMenu.style.display = 'none';
    }
}

function initializeAccountMenu() {
    const accountTrigger = document.getElementById('account-trigger');
    const accountDropdown = document.getElementById('account-dropdown');
    const billingLink = document.getElementById('billing-portal-link');
    const logoutLink = document.getElementById('logout-link');
    
    if (accountTrigger && accountDropdown) {
        accountTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = accountDropdown.style.display === 'block';
            accountDropdown.style.display = isVisible ? 'none' : 'block';
        });
        
        document.addEventListener('click', function() {
            accountDropdown.style.display = 'none';
        });
    }
    
    if (billingLink) {
        billingLink.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const token = localStorage.getItem('onyx-token');
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            try {
                const response = await fetch(`${BACKEND_URL}/api/payment/create-portal-session`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert('Unable to access billing portal. Please contact support.');
                }
            } catch (error) {
                console.error('Billing portal error:', error);
                alert('Unable to access billing portal. Please try again.');
            }
        });
    }
    
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('onyx-token');
            localStorage.removeItem('onyx-user-data');
            localStorage.removeItem('onyx-onboarding-complete');
            localStorage.removeItem('onyx-onboarding-data');
            window.location.href = '/';
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    initializeAccountMenu();
    
    const signupForm = document.getElementById('signup-form-element');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(signupForm);
            const data = {
                name: formData.get('name'),
                display_name: formData.get('display_name'),
                email: formData.get('email'),
                password: formData.get('password'),
                company: formData.get('company')
            };
            
            if (!validateEmail(data.email)) {
                showError('Please enter a valid email address.');
                return;
            }
            
            if (data.password.length < 8) {
                showError('Password must be at least 8 characters.');
                return;
            }
            
            submitSignup(data);
        });
    }
    
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function showSuccess() {
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        signupForm.reset();
        
        setTimeout(() => {
            window.location.href = '/onboarding';
        }, 2000);
    }
    
    function showError(message) {
        errorMessage.textContent = message || 'Signup failed. Please try again or contact support.';
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    async function submitSignup(data) {
        const submitButton = signupForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creating account...';
        
        try {
            const apiResponse = await fetch(`${BACKEND_URL}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    display_name: data.display_name,
                    email: data.email,
                    password: data.password,
                    company: data.company || null
                })
            });
            
            const result = await apiResponse.json();
            
            if (!apiResponse.ok) {
                throw new Error(result.error || 'Signup failed');
            }
            
            if (result.token) {
                localStorage.setItem('onyx-token', result.token);
            }
            
            if (result.user) {
                localStorage.setItem('onyx-user-data', JSON.stringify(result.user));
            }
            
            showSuccess();
        } catch (error) {
            console.error('Signup error:', error);
            showError(error.message || 'Signup failed. Please try again or contact support.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Start free trial';
        }
    }
});
