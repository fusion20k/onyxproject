const BACKEND_URL = 'https://onyxbackend-55af.onrender.com';

document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signup-form-element');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(signupForm);
            const data = {
                name: formData.get('name'),
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
