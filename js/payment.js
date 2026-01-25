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
        const token = localStorage.getItem('onyx-token');
        const userData = localStorage.getItem('onyx-user-data');
        
        if (!token) {
            return { authenticated: false };
        }
        
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return { authenticated: false };
        }

        const data = await response.json();
        
        if (!data.user) {
            return { authenticated: false };
        }
        
        return { 
            authenticated: true, 
            user: data.user 
        };
    } catch (error) {
        console.error('Auth check error:', error);
        const userData = localStorage.getItem('onyx-user-data');
        if (userData) {
            return {
                authenticated: true,
                user: JSON.parse(userData)
            };
        }
        return { authenticated: false };
    }
}

async function createCheckoutSession(plan, price) {
    try {
        const token = localStorage.getItem('onyx-token');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/payment/create-checkout`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
                plan: plan,
                price: price
            })
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
        const token = localStorage.getItem('onyx-token');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
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
        showState('unauthorized-state');
        return;
    }

    currentUser = authStatus.user;

    if (currentUser && currentUser.subscriptionStatus === 'active') {
        window.location.href = '/app';
        return;
    }

    const userEmail = currentUser?.email || 'Account';
    document.getElementById('user-email').textContent = userEmail;
    showState('payment-state');

    try {
        const stripeKey = await getStripePublishableKey();
        stripe = Stripe(stripeKey);
    } catch (error) {
        console.error('Stripe initialization error:', error);
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

async function handleCheckout(plan, price) {
    if (!stripe) {
        showError('payment-error', 'Payment system not ready. Please refresh the page.');
        return;
    }

    const result = await createCheckoutSession(plan, price);

    if (result.success) {
        const { error } = await stripe.redirectToCheckout({
            sessionId: result.sessionId
        });

        if (error) {
            console.error('Stripe redirect error:', error);
            showError('payment-error', error.message);
        }
    } else {
        showError('payment-error', result.error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const planButtons = document.querySelectorAll('.cta--plan');

    planButtons.forEach(button => {
        button.addEventListener('click', function() {
            const plan = this.getAttribute('data-plan');
            const price = this.getAttribute('data-price');
            
            this.disabled = true;
            this.textContent = 'Processing...';
            
            handleCheckout(plan, price).finally(() => {
                this.disabled = false;
                this.textContent = `Select ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;
            });
        });
    });

    initialize();
});
