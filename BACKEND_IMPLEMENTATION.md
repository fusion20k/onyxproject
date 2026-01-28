# Onyx Backend Implementation Guide

**Last Updated**: January 25, 2026  
**Frontend Transformation**: Complete (Phases 1-6)  
**Repository**: https://github.com/fusion20k/onyxbackend

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication System](#2-authentication-system)
3. [Trial & Subscription Management](#3-trial--subscription-management)
4. [Payment Integration (Stripe)](#4-payment-integration-stripe)
5. [Workspace Backend - Autonomous Outreach](#5-workspace-backend---autonomous-outreach)
6. [Admin Panel Backend](#6-admin-panel-backend)
7. [Database Schema](#7-database-schema)
8. [Environment Variables](#8-environment-variables)
9. [Implementation Checklist](#9-implementation-checklist)
10. [Legacy Documentation (Reference)](#10-legacy-documentation-reference)

---

## 1. Overview

### Product Transformation

Onyx has been completely transformed from a **Decision Stress-Test Engine** to an **Autonomous Outreach Co-Founder SaaS Platform**. The frontend is production-ready and awaiting backend integration.

### New Business Model

- **14-day free trial** (no credit card required)
- **3 pricing tiers**: Solo ($97/mo), Team ($297/mo), Agency ($797/mo)
- **Trial-based onboarding** with 5-step setup flow
- **Workspace dashboard** with 5 views: Command Center, Pipeline, Campaign, Analytics, Conversations

### Architecture Flow

```
Landing Page (/)
    ↓
Signup Form → POST /auth/signup
    ↓
5-Step Onboarding (/onboarding)
    ↓
Workspace Dashboard (/app)
    ↓
Payment Selection (/payment) [optional during trial]
```

**Admin Panel**: Separate access at `/admin.html`

---

## 2. Authentication System

### Token System

All auth flows use a **unified token system** with localStorage keys:
- `onyx-token`: JWT bearer token
- `onyx-user-data`: JSON object with user profile
- `onyx-onboarding-complete`: Boolean flag (`"true"` or `"false"`)
- `onyx-onboarding-data`: Cached onboarding form data

### Required Endpoints

#### **POST /auth/signup**

Create new user account with 14-day trial.

**Request Body**:
```json
{
  "name": "string (required)",
  "display_name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "company": "string (optional)"
}
```

**Response (201)**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "display_name": "John D",
    "company": "Acme Inc",
    "trial_start": null,
    "trial_end": null,
    "trial_days_remaining": null,
    "subscription_status": "trial",
    "onboarding_complete": false
  }
}
```

**Logic**:
1. Validate email format and password strength
2. Check if email already exists (return 409 if duplicate)
3. Create user in database with `trial_start = NULL`, `trial_end = NULL`, `subscription_status = 'trial'`
4. Store `display_name` in users table (used for workspace display, account menu, and user identification)
5. Generate JWT token
6. Return token + user object

**Note**: Trial does NOT start on signup. It starts when user selects a plan on the payment page.

---

#### **POST /auth/login**

Authenticate user and return token.

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200)**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "display_name": "John D",
    "company": "Acme Inc",
    "trial_start": "2026-01-25T00:00:00Z",
    "trial_end": "2026-02-08T23:59:59Z",
    "trial_days_remaining": 10,
    "subscription_status": "trial|active|expired",
    "subscription_plan": "solo|team|agency|null",
    "onboarding_complete": true
  }
}
```

**Frontend Routing Logic**:
- If `onboarding_complete === false` → redirect to `/onboarding`
- If `onboarding_complete === true` → redirect to `/app`

**Error Responses**:
- **401**: Invalid credentials
- **403**: Account suspended/deactivated

---

#### **GET /auth/status**

Check authentication status (used by workspace on load).

**Auth**: Bearer token required

**Response (200)**:
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "display_name": "John D",
    "trial_days_remaining": 10,
    "subscription_status": "trial|active|expired",
    "subscription_plan": "solo|team|agency|null",
    "onboarding_complete": true
  }
}
```

**Error Response**:
- **401**: Invalid/expired token

---

#### **POST /auth/create-account**

Create account from invite link (invite.html page).

**Request Body**:
```json
{
  "invite_code": "string (optional, from token flow)",
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "display_name": "string (optional)"
}
```

**Response (201)**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": { /* same as signup */ }
}
```

**Logic**:
1. Validate invite code (if provided from token flow) or email (if from email verification flow)
2. Extract name from email (part before @) if not provided
3. Use display_name if provided, otherwise default to name
4. Create user account with 14-day trial
5. Mark invite code as used (if token flow)
6. Return token + user object
7. **Frontend redirects to `/onboarding`**

---

## 3. Trial & Subscription Management

### Trial System

**Trial Duration**: 14 days from plan selection (NOT from signup)  
**Trial Start**: When user selects a plan on the payment page (`/payment`)  
**Trial Status Indicators** (frontend):
- **Normal** (14-8 days): Gray badge
- **Caution** (7-4 days): Yellow badge
- **Warning** (3-0 days): Orange badge with pulse animation

### Database Fields (users table)

```sql
trial_start TIMESTAMP WITH TIME ZONE
trial_end TIMESTAMP WITH TIME ZONE
subscription_status TEXT -- 'trial', 'active', 'expired', 'cancelled'
subscription_plan TEXT -- 'solo', 'team', 'agency', NULL
stripe_customer_id TEXT
stripe_subscription_id TEXT
onboarding_complete BOOLEAN DEFAULT false
```

### Computed Field: trial_days_remaining

```sql
-- Calculate in query or as virtual field
GREATEST(0, EXTRACT(DAYS FROM (trial_end - NOW())))
```

### Subscription Status Logic

- **trial**: User has NOT started trial yet (trial_start is NULL) OR is within 14-day trial period
- **active**: User has paid subscription
- **expired**: Trial ended without payment (trial_end < NOW() and no subscription)
- **cancelled**: User explicitly cancelled subscription

---

## 4. Payment Integration (Stripe)

### Payment Page Flow

Users can access `/payment` at any time during or after trial. The page shows:
- **3 pricing tiers** (Solo/Team/Agency)
- **Skip for now** option (continue with trial)
- **Stripe Checkout** integration

### Required Endpoints

#### **GET /payment/config**

Get Stripe publishable key for frontend.

**Auth**: Not required (public endpoint)

**Response (200)**:
```json
{
  "publishableKey": "pk_test_..."
}
```

**Logic**:
1. Return Stripe publishable key from environment variable
2. This key is safe to expose publicly

---

#### **POST /payment/create-checkout**

Create Stripe Checkout session for plan selection and START TRIAL.

**Auth**: Bearer token required

**Request Body**:
```json
{
  "plan": "solo|team|agency",
  "price": 97|297|797
}
```

**Response (200)**:
```json
{
  "success": true,
  "sessionId": "cs_test_..."
}
```

**Logic**:
1. Get user from token
2. **START TRIAL**: Set `trial_start = NOW()`, `trial_end = NOW() + 14 days` if trial_start is NULL
3. Set `subscription_plan` to selected plan (solo/team/agency)
4. Create or retrieve Stripe customer ID
5. Create Stripe Checkout session with:
   - `mode: 'subscription'`
   - `line_items`: Selected plan
   - `trial_period_days: 14`
   - `success_url`: `https://yourapp.com/app?payment=success`
   - `cancel_url`: `https://yourapp.com/payment?payment=cancelled`
6. Return session ID for frontend redirect

**IMPORTANT**: This endpoint STARTS the trial. Trial does not start on signup.

---

#### **POST /payment/verify**

Verify payment status (called after Stripe redirect).

**Auth**: Bearer token required

**Response (200)**:
```json
{
  "success": true,
  "paid": true,
  "plan": "solo|team|agency",
  "subscription_id": "sub_..."
}
```

**Logic**:
1. Get user from token
2. Check if user has active Stripe subscription
3. Update user record: `subscription_status = 'active'`, `subscription_plan = <plan>`
4. Return payment status

---

#### **Webhook: POST /webhooks/stripe**

Handle Stripe webhook events.

**Required Events**:
- `checkout.session.completed`: Activate subscription
- `customer.subscription.updated`: Update subscription details
- `customer.subscription.deleted`: Handle cancellation
- `invoice.payment_failed`: Handle payment failure

**Logic**:
```javascript
switch (event.type) {
  case 'checkout.session.completed':
    // Update user: subscription_status = 'active'
    break;
  case 'customer.subscription.deleted':
    // Update user: subscription_status = 'cancelled'
    break;
  // ... handle other events
}
```

---

## 5. Workspace Backend - Autonomous Outreach

### Overview

The workspace is a **dashboard for managing autonomous outreach campaigns**. Frontend displays 5 views with **mock data**. Backend needs to provide real data via API endpoints.

### Frontend Views (all using mock data)

1. **Command Center**: Metrics overview (leads contacted, reply rate, meetings booked)
2. **Pipeline**: Kanban board (New → Engaged → Qualified → Won)
3. **Campaign**: ICP configuration interface
4. **Analytics**: Performance charts
5. **Conversations**: AI co-founder chat interface

### Required Endpoints

#### **GET /workspace/metrics**

Get dashboard metrics for Command Center view.

**Auth**: Bearer token required

**Response (200)**:
```json
{
  "leads_contacted": 247,
  "reply_rate": 18.5,
  "meetings_booked": 12,
  "active_campaigns": 3,
  "last_updated": "2026-01-25T12:00:00Z"
}
```

---

#### **GET /workspace/pipeline**

Get pipeline data for Kanban board.

**Auth**: Bearer token required

**Response (200)**:
```json
{
  "new": [
    {
      "id": "uuid",
      "name": "John Smith",
      "company": "Acme Corp",
      "title": "VP of Sales",
      "last_contact": "2026-01-24T10:30:00Z",
      "status": "new"
    }
  ],
  "engaged": [ /* same structure */ ],
  "qualified": [ /* same structure */ ],
  "won": [ /* same structure */ ]
}
```

---

#### **PATCH /workspace/pipeline/move**

Move lead between pipeline stages.

**Auth**: Bearer token required

**Request Body**:
```json
{
  "lead_id": "uuid",
  "from_status": "new|engaged|qualified|won",
  "to_status": "new|engaged|qualified|won"
}
```

**Response (200)**:
```json
{
  "success": true
}
```

---

#### **GET /workspace/campaign**

Get current ICP configuration.

**Auth**: Bearer token required

**Response (200)**:
```json
{
  "target_industries": ["SaaS", "Fintech"],
  "company_size": "50-200",
  "titles": ["VP of Sales", "Head of Marketing"],
  "geography": "United States",
  "messaging_tone": "professional"
}
```

---

#### **PATCH /workspace/campaign**

Update ICP configuration.

**Auth**: Bearer token required

**Request Body**:
```json
{
  "target_industries": ["string"],
  "company_size": "string",
  "titles": ["string"],
  "geography": "string",
  "messaging_tone": "string"
}
```

**Response (200)**:
```json
{
  "success": true,
  "updated_at": "timestamp"
}
```

---

#### **GET /workspace/analytics**

Get performance analytics data.

**Auth**: Bearer token required

**Query Params**:
- `period`: `7d|30d|90d` (default: `30d`)

**Response (200)**:
```json
{
  "outreach_volume": [
    {"date": "2026-01-01", "count": 15},
    {"date": "2026-01-02", "count": 22}
  ],
  "reply_rate": [
    {"date": "2026-01-01", "rate": 16.5},
    {"date": "2026-01-02", "rate": 18.2}
  ],
  "conversion_funnel": {
    "contacted": 247,
    "replied": 45,
    "qualified": 18,
    "meetings": 12
  }
}
```

---

#### **GET /workspace/conversations**

Get AI co-founder conversation history.

**Auth**: Bearer token required

**Response (200)**:
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user|assistant",
      "content": "Message text",
      "created_at": "timestamp"
    }
  ]
}
```

---

#### **POST /workspace/conversations/send**

Send message to AI co-founder.

**Auth**: Bearer token required

**Request Body**:
```json
{
  "content": "string (required)"
}
```

**Response (201)**:
```json
{
  "message_id": "uuid",
  "response": {
    "id": "uuid",
    "role": "assistant",
    "content": "AI response text",
    "created_at": "timestamp"
  }
}
```

**Logic**:
1. Save user message
2. Call OpenAI API with conversation context
3. Save assistant response
4. Return both message IDs

---

## 6. Admin Panel Backend

### Overview

Admin panel provides **SaaS management dashboard** with user management, trial tracking, subscription management, revenue analytics, and system monitoring.

### Frontend Sections (all using mock data)

1. **Overview**: Key metrics (147 users, 42 trials, $28,794 MRR)
2. **Users**: User management table with search/filter
3. **Trials**: Active trials with expiration tracking
4. **Subscriptions**: Paid subscribers management
5. **Revenue**: MRR tracking and charts
6. **System**: API health, worker status monitoring

### Required Endpoints

#### **POST /admin/auth/login**

Admin login (separate from user login).

**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200)**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "admin": {
    "id": "uuid",
    "email": "admin@onyx.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Logic**:
- Check user has `role = 'admin'` in database
- Generate admin JWT token
- Return token + admin profile

---

#### **GET /admin/overview**

Get admin dashboard overview metrics calculated from real database and Stripe data.

**Auth**: Admin token required

**Response (200)**:
```json
{
  "total_users": 147,
  "active_trials": 42,
  "paid_subscribers": 105,
  "mrr": 28794,
  "churn_rate": 3.2,
  "trial_conversion_rate": 42.5
}
```

**Logic**:
1. Query database for `total_users` (COUNT from users table)
2. Query database for `active_trials` (COUNT WHERE subscription_status = 'trial' AND trial_end > NOW())
3. Query Stripe API for `paid_subscribers` (COUNT active subscriptions) OR query database WHERE subscription_status = 'active'
4. Calculate `mrr` from Stripe subscription data or sum from database
5. Calculate `churn_rate` from subscription cancellations over time
6. Calculate `trial_conversion_rate` from (paid_subscribers / total_signups) * 100

---

#### **GET /admin/users**

Get user list with pagination and filters.

**Auth**: Admin token required

**Query Params**:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50)
- `status`: Filter by `trial|active|expired|cancelled`
- `search`: Search by name or email

**Response (200)**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "company": "Acme Inc",
      "subscription_status": "trial|active|expired|cancelled",
      "subscription_plan": "solo|team|agency|null",
      "trial_days_remaining": 10,
      "created_at": "timestamp",
      "last_login": "timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 147,
    "pages": 3
  }
}
```

---

#### **GET /admin/users/:user_id**

Get detailed user profile.

**Auth**: Admin token required

**Response (200)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "company": "Acme Inc",
    "subscription_status": "trial",
    "subscription_plan": null,
    "trial_start": "timestamp",
    "trial_end": "timestamp",
    "trial_days_remaining": 10,
    "stripe_customer_id": "cus_...",
    "stripe_subscription_id": null,
    "created_at": "timestamp",
    "last_login": "timestamp",
    "onboarding_complete": true,
    "onboarding_data": {
      "business_name": "Acme Inc",
      "industry": "SaaS",
      "team_size": "10-50",
      "icp_industries": ["Fintech", "Healthcare"],
      "icp_company_size": "50-200",
      "icp_titles": ["VP of Sales", "Head of Marketing"]
    }
  },
  "activity": {
    "total_leads": 247,
    "meetings_booked": 12,
    "last_campaign_update": "timestamp"
  }
}
```

---

#### **PATCH /admin/users/:user_id**

Update user account (extend trial, change status, etc).

**Auth**: Admin token required

**Request Body**:
```json
{
  "subscription_status": "trial|active|expired|cancelled",
  "trial_end": "timestamp (optional)",
  "subscription_plan": "solo|team|agency|null"
}
```

**Response (200)**:
```json
{
  "success": true,
  "user": { /* updated user object */ }
}
```

---

#### **GET /admin/trials**

Get list of active trials.

**Auth**: Admin token required

**Query Params**:
- `sort`: `expiring_soon|newest` (default: `expiring_soon`)

**Response (200)**:
```json
{
  "trials": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "trial_start": "timestamp",
      "trial_end": "timestamp",
      "trial_days_remaining": 3,
      "onboarding_complete": true,
      "engagement_score": 8.5
    }
  ]
}
```

---

#### **GET /admin/subscriptions**

Get list of paid subscribers from Stripe and database.

**Auth**: Admin token required

**Query Params**:
- `plan`: Filter by `solo|team|agency`

**Response (200)**:
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "team",
      "mrr": 297,
      "subscription_start": "timestamp",
      "stripe_subscription_id": "sub_...",
      "stripe_customer_id": "cus_...",
      "status": "active|past_due|cancelled"
    }
  ],
  "summary": {
    "total_subscribers": 105,
    "total_mrr": 28794,
    "by_plan": {
      "solo": 67,
      "team": 31,
      "agency": 7
    }
  }
}
```

**Logic**:
1. Query users table WHERE subscription_status = 'active' AND stripe_subscription_id IS NOT NULL
2. For each user, fetch Stripe subscription details using stripe_subscription_id
3. Get subscription status, plan, amount, and start date from Stripe
4. Calculate MRR from Stripe subscription amounts
5. Apply plan filter if provided
6. Return aggregated summary statistics

---

#### **GET /admin/revenue**

Get revenue analytics data from Stripe API and database calculations.

**Auth**: Admin token required

**Query Params**:
- `period`: `30d|90d|12m` (default: `30d`)

**Response (200)**:
```json
{
  "mrr": 28794,
  "mrr_growth": 12.5,
  "arr": 345528,
  "ltv": 4280,
  "churn_rate": 3.2,
  "mrr_chart": [
    {"month": "2025-12", "mrr": 25420},
    {"month": "2026-01", "mrr": 28794}
  ],
  "plan_breakdown": {
    "solo": 6529,
    "team": 9207,
    "agency": 5579
  }
}
```

**Logic**:
1. Use Stripe API to fetch all active subscriptions
2. Calculate current MRR by summing all subscription amounts
3. Calculate ARR as MRR * 12
4. Query historical subscription data from database for MRR growth trend
5. Calculate churn rate from cancelled subscriptions in the period
6. Calculate LTV from (Average Subscription Value) / (Churn Rate)
7. Group subscriptions by plan for breakdown
8. Use Stripe's reporting API or database queries for time series data

---

#### **GET /admin/monitoring**

Get system health and monitoring data for the System Monitoring dashboard.

**Auth**: Admin token required

**Response (200)**:
```json
{
  "system_health": {
    "api": "operational",
    "database": "connected",
    "email": "active",
    "payment": "connected"
  },
  "metrics": {
    "api_requests_24h": 12487,
    "avg_response_time": 142,
    "error_rate": 0.02,
    "database_queries": 45231
  },
  "recent_activity": [
    {
      "timestamp": "2026-01-26T10:30:00Z",
      "message": "User signup: john@example.com"
    },
    {
      "timestamp": "2026-01-26T10:15:00Z",
      "message": "Subscription created: Team plan"
    },
    {
      "timestamp": "2026-01-26T09:30:00Z",
      "message": "Trial expired: sarah@example.com"
    }
  ]
}
```

**Logic**:
1. Check API health by testing backend response time
2. Check database connection status with a simple query
3. Check email service status (e.g., SendGrid API health check)
4. Check payment gateway status (Stripe API health check)
5. Query application logs or metrics table for 24h API request count
6. Calculate average response time from request logs
7. Calculate error rate from error logs (errors / total requests)
8. Query database query count from monitoring table or database stats
9. Fetch recent system events from activity log table (last 10 entries)

**Status Values**:
- `"operational"`, `"active"`, `"connected"` = Green indicator
- `"degraded"`, `"warning"` = Yellow indicator
- `"down"`, `"error"` = Red indicator
- `"unknown"` = Gray indicator

---

#### **POST /admin/impersonate/:user_id**

Generate impersonation token to view workspace as user.

**Auth**: Admin token required

**Response (200)**:
```json
{
  "success": true,
  "impersonation_token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Logic**:
1. Verify admin permissions
2. Generate special JWT with `impersonating_user_id` claim
3. Frontend uses this token to access workspace as the user
4. Log impersonation event for audit

---

## 7. Database Schema

### Table: `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  company TEXT,
  
  -- Trial & Subscription
  trial_start TIMESTAMP WITH TIME ZONE, -- Set when user selects plan on /payment
  trial_end TIMESTAMP WITH TIME ZONE, -- Set to trial_start + 14 days when plan selected
  subscription_status TEXT DEFAULT 'trial', -- 'trial', 'active', 'expired', 'cancelled'
  subscription_plan TEXT, -- 'solo', 'team', 'agency', NULL
  subscription_start TIMESTAMP WITH TIME ZONE,
  
  -- Stripe Integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Onboarding
  onboarding_complete BOOLEAN DEFAULT false,
  onboarding_data JSONB, -- Stores ICP config, business profile, etc.
  
  -- Activity
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Admin fields
  role TEXT DEFAULT 'user', -- 'user' or 'admin'
  
  CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  CONSTRAINT valid_subscription_plan CHECK (subscription_plan IN ('solo', 'team', 'agency') OR subscription_plan IS NULL)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_trial_end ON users(trial_end);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
```

---

### Table: `workspace_leads`

```sql
CREATE TABLE workspace_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Lead information
  name TEXT NOT NULL,
  company TEXT,
  title TEXT,
  email TEXT,
  linkedin_url TEXT,
  
  -- Pipeline status
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'engaged', 'qualified', 'won'
  
  -- Activity
  first_contact TIMESTAMP WITH TIME ZONE,
  last_contact TIMESTAMP WITH TIME ZONE,
  reply_received BOOLEAN DEFAULT false,
  meeting_booked BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('new', 'engaged', 'qualified', 'won'))
);

CREATE INDEX idx_leads_user_id ON workspace_leads(user_id);
CREATE INDEX idx_leads_status ON workspace_leads(status);
CREATE INDEX idx_leads_updated ON workspace_leads(updated_at DESC);
```

---

### Table: `campaigns`

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- ICP Configuration
  target_industries TEXT[],
  company_size TEXT,
  titles TEXT[],
  geography TEXT,
  messaging_tone TEXT,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
```

---

### Table: `conversations` (AI co-founder chat)

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_created ON ai_conversations(created_at);
```

---

### Table: `invite_codes`

```sql
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  created_by_user_id UUID REFERENCES users(id),
  used_by_user_id UUID REFERENCES users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_used ON invite_codes(used_at);
```

---

## 8. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/onyx

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product/Price IDs
STRIPE_PRICE_SOLO=price_...
STRIPE_PRICE_TEAM=price_...
STRIPE_PRICE_AGENCY=price_...

# OpenAI (for AI co-founder)
OPENAI_API_KEY=sk-...

# App URLs
APP_URL=https://yourapp.com
FRONTEND_URL=https://yourapp.com

# Email Service (optional)
RESEND_API_KEY=re_...
SENDGRID_API_KEY=SG...

# Environment
NODE_ENV=production
PORT=3000
```

---

## 9. Implementation Checklist

### Phase 1: Authentication & User Management
- [ ] Set up database with `users` table
- [ ] Implement JWT authentication middleware
- [ ] Create `/auth/signup` endpoint
- [ ] Create `/auth/login` endpoint
- [ ] Create `/auth/status` endpoint
- [ ] Create `/auth/create-account` endpoint (invite flow)
- [ ] Implement password hashing (bcrypt)
- [ ] Add email validation
- [ ] Test trial calculation logic

### Phase 2: Payment Integration
- [ ] Set up Stripe account and get API keys
- [ ] Create Stripe products/prices for 3 tiers
- [ ] Implement `/payment/create-checkout-session`
- [ ] Implement `/payment/verify`
- [ ] Set up Stripe webhook endpoint `/webhooks/stripe`
- [ ] Handle webhook events (subscription created, updated, deleted)
- [ ] Test full payment flow (trial → paid)
- [ ] Test subscription cancellation

### Phase 3: Workspace Backend
- [ ] Create `workspace_leads` table
- [ ] Create `campaigns` table
- [ ] Create `ai_conversations` table
- [ ] Implement `/workspace/metrics` endpoint
- [ ] Implement `/workspace/pipeline` endpoints (GET + PATCH)
- [ ] Implement `/workspace/campaign` endpoints (GET + PATCH)
- [ ] Implement `/workspace/analytics` endpoint
- [ ] Implement `/workspace/conversations` endpoints (GET + POST)
- [ ] Integrate OpenAI API for AI co-founder chat
- [ ] Test all workspace endpoints with frontend

### Phase 4: Admin Panel Backend
- [ ] Implement admin authentication check
- [ ] Create `/admin/auth/login` endpoint
- [ ] Create `/admin/overview` endpoint
- [ ] Create `/admin/users` endpoints (list + detail + update)
- [ ] Create `/admin/trials` endpoint
- [ ] Create `/admin/subscriptions` endpoint
- [ ] Create `/admin/revenue` endpoint
- [ ] Create `/admin/system` endpoint
- [ ] Implement `/admin/impersonate/:user_id` endpoint
- [ ] Test admin panel with frontend

### Phase 5: Onboarding System
- [ ] Create endpoint to save onboarding data to `users.onboarding_data`
- [ ] Update `/auth/status` to include `onboarding_complete` flag
- [ ] Implement onboarding completion logic (sets flag to true)
- [ ] Test onboarding flow end-to-end

### Phase 6: Deployment & Testing
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Deploy backend API
- [ ] Test all authentication flows
- [ ] Test payment integration (Stripe test mode)
- [ ] Test trial expiration logic
- [ ] Test admin panel functionality
- [ ] Monitor error logs and API performance
- [ ] Set up database backups
- [ ] Configure CORS for frontend domain

---

## 10. Legacy Documentation (Reference)

The following documentation relates to the **old decision stress-test application** and is kept for reference only. This functionality has been removed from the frontend.

### Old System Overview

The previous version of Onyx was a **decision stress-testing engine** where users submitted structured decisions for AI analysis. This has been completely replaced by the autonomous outreach platform.

### Old Database Tables (Deprecated)

These tables can be kept for historical data or removed:
- `decisions`: Structured decision threads
- `decision_feedback`: Feedback messages
- `decision_recommendations`: AI recommendations with execution plans

### Old Endpoints (No Longer Needed)

- ~~`POST /decisions/create`~~
- ~~`GET /decisions/:id`~~
- ~~`POST /decisions/:id/confirm-understanding`~~
- ~~`POST /decisions/:id/commit`~~
- ~~`GET /workspace/active-decision`~~
- ~~`POST /workspace/create-decision`~~

### Migration Notes

If you have existing users with decision data:
1. Keep old tables for data retention
2. No need to migrate old data to new system
3. Users will start fresh with autonomous outreach workspace
4. Old data can be archived or exported if needed

---

## Questions & Support

**Frontend Repository**: https://github.com/fusion20k/onyxproject  
**Frontend Commit**: 3276eb7 - "Complete Onyx transformation..."

For clarification on expected API behavior or frontend integration details, refer to:
- Frontend JavaScript files in `/js` directory
- Mock data patterns in `workspace.js`, `admin.js`
- localStorage key usage throughout frontend

**Contact**: Refer to project team for backend implementation questions.

---

**Last Updated**: January 25, 2026  
**Document Version**: 1.0  
**Status**: Ready for backend implementation
