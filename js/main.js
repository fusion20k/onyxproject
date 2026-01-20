document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('application-form-element');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                role: formData.get('role'),
                reason: formData.get('reason'),
                project: formData.get('project')
            };
            
            if (!validateEmail(data.email)) {
                showError('Please enter a valid email address.');
                return;
            }
            
            if (data.reason.length < 50) {
                showError('Please provide more detail about why you are applying (minimum 50 characters).');
                return;
            }
            
            submitApplication(data);
        });
    }
    
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function showSuccess() {
        successMessage.classList.add('show');
        errorMessage.classList.remove('show');
        form.reset();
        
        setTimeout(() => {
            successMessage.classList.remove('show');
        }, 5000);
    }
    
    function showError(message) {
        errorMessage.textContent = message || 'Submission failed. Please try again or email directly.';
        errorMessage.classList.add('show');
        successMessage.classList.remove('show');
        
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 5000);
    }
    
    function encode(data) {
        return Object.keys(data)
            .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
            .join("&");
    }
    
    async function submitApplication(data) {
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        try {
            // Submit to backend API (primary - goes to Supabase)
            const apiResponse = await fetch('/api/applications/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    role: data.role,
                    reason: data.reason,
                    project: data.project || null
                })
            });
            
            if (!apiResponse.ok) {
                throw new Error('API submission failed');
            }
            
            // Also submit to Netlify Forms (backup/notification)
            fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: encode({
                    "form-name": "onyx-application",
                    ...data
                })
            }).catch(err => console.log('Netlify Forms backup failed:', err));
            
            showSuccess();
        } catch (error) {
            console.error('Form submission error:', error);
            showError('Submission failed. Please try again or email directly.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit application';
        }
    }
});
