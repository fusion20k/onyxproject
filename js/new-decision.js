const API_BASE_URL = '/api';

const textarea = document.getElementById('decision-input');
const charCount = document.getElementById('char-count');
const submitBtn = document.getElementById('submit-btn');
const form = document.getElementById('new-decision-form');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const retryBtn = document.getElementById('retry-btn');

textarea.addEventListener('input', () => {
    const length = textarea.value.length;
    charCount.textContent = length;
    
    submitBtn.disabled = length < 50;
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const content = textarea.value.trim();
    
    if (content.length < 50) {
        showError('Please provide at least 50 characters describing your decision.');
        return;
    }
    
    await createDecision(content);
});

retryBtn.addEventListener('click', () => {
    errorState.style.display = 'none';
    form.style.display = 'block';
});

async function createDecision(content) {
    try {
        form.style.display = 'none';
        loadingState.style.display = 'block';
        errorState.style.display = 'none';
        
        const sessionData = localStorage.getItem('session');
        if (!sessionData) {
            throw new Error('Not authenticated');
        }
        
        const session = JSON.parse(sessionData);
        const accessToken = session.access_token;
        
        const response = await fetch(`${API_BASE_URL}/decisions/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include',
            body: JSON.stringify({ content })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create decision');
        }
        
        if (data.success && data.decision_id) {
            window.location.href = '/app';
        } else {
            throw new Error('Invalid response from server');
        }
        
    } catch (error) {
        console.error('Decision creation error:', error);
        showError(error.message || 'Failed to create decision. Please try again.');
    }
}

function showError(message) {
    loadingState.style.display = 'none';
    form.style.display = 'none';
    errorState.style.display = 'block';
    errorState.querySelector('.error-text').textContent = message;
}
