const API_BASE_URL = '/api';

let stripe = null;
let currentUser = null;

function showState(stateId) {
    document.querySelectorAll('.payment__state').forEach(state => {
        state.style.display = 'none';
    });
    const targetState = document.getElementById(stateId);
    if (targetState) {
        targetState.style.display = 'block';
    }
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

async function checkAuthStatus() {
    try {
        const sessionData = localStorage.getItem('session');
        const userData = localStorage.getItem('user');
        
        console.log('Checking auth status at:', `${API_BASE_URL}/auth/status`);
        console.log('Session data:', sessionData ? 'found' : 'not found');
        console.log('User data:', userData ? 'found' : 'not found');
        
        if (!sessionData) {
            console.warn('No session found in localStorage');
            return { authenticated: false };
        }
        
        const session = JSON.parse(sessionData);
        const accessToken = session.access_token;
        
        if (!accessToken) {
            console.warn('No access token in session');
            return { authenticated: false };
        }
        
        console.log('Sending request with access token');
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include'
        });

        console.log('Auth status response:', response.status, response.statusText);

        if (!response.ok) {
            console.warn('Auth check failed');
            return { authenticated: false };
        }

        const data = await response.json();
        console.log('Auth status data:', JSON.stringify(data, null, 2));
        console.log('data.authenticated:', data.authenticated);
        console.log('data.user:', data.user);
        
        if (!data.user) {
            console.error('Backend returned 200 but missing user data');
            return { authenticated: false };
        }
        
        return { 
            authenticated: true, 
            user: data.user 
        };
    } catch (error) {
        console.error('Auth check error:', error);
        return { authenticated: false };
    }
}

async function createCheckoutSession() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/payment/create-checkout`, {
            method: 'POST',
            headers,
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Failed to create checkout session' };
        }

        const data = await response.json();
        return { success: true, sessionId: data.sessionId };
    } catch (error) {
        console.error('Create checkout error:', error);
        return { success: false, error: 'Failed to create checkout session' };
    }
}

async function verifyPayment() {
    try {
        const sessionData = localStorage.getItem('session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const accessToken = session?.access_token;
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/payment/verify`, {
            method: 'POST',
            headers,
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        return { success: true, paid: data.paid };
    } catch (error) {
        console.error('Verify payment error:', error);
        return { success: false };
    }
}

async function initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
        showState('processing-state');
        const result = await verifyPayment();
        
        if (result.success && result.paid) {
            showState('success-state');
            setTimeout(() => {
                window.location.href = '/app';
            }, 2000);
        } else {
            showState('payment-state');
            showError('payment-error', 'Payment verification failed. Please contact support.');
        }
        return;
    }

    const authStatus = await checkAuthStatus();

    if (!authStatus.authenticated || !authStatus.user) {
        const localUser = localStorage.getItem('user');
        if (localUser) {
            console.log('Using cached user data from localStorage');
            currentUser = JSON.parse(localUser);
        } else {
            showState('unauthorized-state');
            return;
        }
    } else {
        currentUser = authStatus.user;
    }

    if (currentUser && currentUser.paid) {
        window.location.href = '/app';
        return;
    }

    const userEmail = currentUser?.email || currentUser?.user_metadata?.email || 'Account';
    console.log('Displaying email:', userEmail);
    document.getElementById('user-email').textContent = userEmail;
    showState('payment-state');

    try {
        const stripeKey = await getStripePublishableKey();
        stripe = Stripe(stripeKey);
    } catch (error) {
        console.error('Stripe initialization error:', error);
        showError('payment-error', 'Payment system unavailable. Please try again later.');
    }
}

async function getStripePublishableKey() {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/config`);
        const data = await response.json();
        return data.publishableKey;
    } catch (error) {
        console.error('Failed to get Stripe key:', error);
        throw error;
    }
}

async function handleCheckout() {
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (!stripe) {
        showError('payment-error', 'Payment system not ready. Please refresh the page.');
        return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Creating checkout session...';

    const result = await createCheckoutSession();

    if (result.success) {
        const { error } = await stripe.redirectToCheckout({
            sessionId: result.sessionId
        });

        if (error) {
            console.error('Stripe redirect error:', error);
            showError('payment-error', error.message);
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Proceed to Payment';
        }
    } else {
        showError('payment-error', result.error);
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Payment';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const checkoutBtn = document.getElementById('checkout-btn');

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }

    initialize();
});
