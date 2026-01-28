// Centralized API client for Onyx backend
// Handles authentication, real data fetching, and error management

const API_BASE_URL = 'https://onyxbackend-55af.onrender.com';

class OnyxAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Get authorization headers
    getAuthHeaders() {
        const token = localStorage.getItem('onyx-token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Make authenticated API request
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    this.handleAuthError();
                    throw new Error('Authentication failed');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Handle authentication errors
    handleAuthError() {
        localStorage.removeItem('onyx-token');
        localStorage.removeItem('onyx-user-data');
        localStorage.removeItem('onyx-onboarding-complete');
        window.location.href = '/';
    }

    // Authentication endpoints
    async signup(userData) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async checkAuthStatus() {
        return this.request('/auth/status');
    }

    async googleAuth(token) {
        return this.request('/auth/google', {
            method: 'POST',
            body: JSON.stringify({ token })
        });
    }

    // Onboarding endpoints
    async completeOnboarding(onboardingData) {
        return this.request('/api/onboarding/complete', {
            method: 'POST',
            body: JSON.stringify(onboardingData)
        });
    }

    // Workspace dashboard endpoints
    async getDashboardData() {
        return this.request('/api/workspace/dashboard');
    }

    async getPipelineData() {
        return this.request('/api/workspace/pipeline');
    }

    async getActivityStream() {
        return this.request('/api/workspace/activity');
    }

    async getUserSettings() {
        return this.request('/api/workspace/settings');
    }

    async updateSettings(settings) {
        return this.request('/api/workspace/settings', {
            method: 'PATCH',
            body: JSON.stringify(settings)
        });
    }

    // Prospects management
    async getProspects() {
        return this.request('/api/prospects');
    }

    async addProspect(prospectData) {
        return this.request('/api/prospects', {
            method: 'POST',
            body: JSON.stringify(prospectData)
        });
    }

    async updateProspect(prospectId, updates) {
        return this.request(`/api/prospects/${prospectId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    async deleteProspect(prospectId) {
        return this.request(`/api/prospects/${prospectId}`, {
            method: 'DELETE'
        });
    }

    // Payment endpoints
    async getPaymentConfig() {
        return this.request('/payment/config');
    }

    async createCheckoutSession(plan) {
        return this.request('/payment/create-checkout', {
            method: 'POST',
            body: JSON.stringify(plan)
        });
    }

    async verifyPayment() {
        return this.request('/payment/verify', {
            method: 'POST'
        });
    }

    // Fallback methods for graceful degradation when backend is not ready
    async getDashboardDataFallback() {
        // Return mock data structure matching API spec
        return {
            summary: {
                date: new Date().toISOString().split('T')[0],
                conversations_started: 8,
                replies: 3,
                qualified_leads: 2
            },
            metrics: {
                active_conversations: 24,
                reply_rate: "32%",
                qualified_leads: 12,
                ready_for_you: 5
            },
            status: {
                is_active: true,
                is_paused: false,
                last_activity: new Date().toISOString()
            }
        };
    }

    async getPipelineDataFallback() {
        return {
            pipeline: {
                found: [
                    { id: "1", first_name: "Sarah", company: "TechCorp", priority: "normal" },
                    { id: "2", first_name: "Mike", company: "StartupXYZ", priority: "high" }
                ],
                contacted: [
                    { id: "3", first_name: "Emily", company: "GrowthCo", priority: "normal" }
                ],
                talking: [
                    { id: "4", first_name: "David", company: "ScaleUp", priority: "medium" },
                    { id: "5", first_name: "Lisa", company: "Enterprise", priority: "high" }
                ],
                ready: [
                    { id: "6", first_name: "Alex", company: "BigCorp", priority: "high" }
                ]
            }
        };
    }

    async getActivityStreamFallback() {
        return {
            activities: [
                {
                    id: "1",
                    activity_type: "message_sent",
                    description: "Started conversation with Sarah (TechCorp)",
                    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString()
                },
                {
                    id: "2", 
                    activity_type: "reply_received",
                    description: "Mark replied: \"Tell me more\"",
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
                },
                {
                    id: "3",
                    activity_type: "lead_qualified", 
                    description: "Jessica qualified as \"Ready\"",
                    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
                }
            ]
        };
    }

    // Method to try real API first, fallback to mock data
    async safeRequest(endpoint, fallbackMethod) {
        try {
            return await this.request(endpoint);
        } catch (error) {
            console.warn(`API endpoint ${endpoint} not available, using fallback data`);
            return await fallbackMethod.call(this);
        }
    }
}

// Export singleton instance
window.onyxAPI = new OnyxAPI();