# Onyx Backend Specification
## Supabase + Render Implementation Guide

---

## Overview

You will build a Node.js/Express backend deployed on **Render** that connects to **Supabase** (PostgreSQL + Auth).

**Tech Stack:**
- **Database**: Supabase (PostgreSQL)
- **Backend**: Node.js + Express (deployed on Render)
- **Auth**: Supabase Auth + custom session management
- **Email**: Supabase or SendGrid/Resend

---

## I. SUPABASE SETUP

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create new project
3. Save credentials:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY` (for admin operations)

### 2. Database Schema

Run these SQL commands in Supabase SQL Editor:

```sql
-- Applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    reason TEXT NOT NULL,
    project TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invite tokens table
CREATE TABLE invite_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    application_id UUID REFERENCES applications(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'My Workspace',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX idx_invite_tokens_email ON invite_tokens(email);
CREATE INDEX idx_users_email ON users(email);
```

### 3. Row Level Security (RLS)

Enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Applications: Only admins can read/write
CREATE POLICY "Admins can manage applications"
ON applications FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');

-- Invite tokens: No direct access (managed via API)
CREATE POLICY "No direct access to invite tokens"
ON invite_tokens FOR ALL
USING (false);

-- Users: Users can read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- Workspaces: Users can read their own workspaces
CREATE POLICY "Users can read own workspaces"
ON workspaces FOR SELECT
USING (auth.uid() = user_id);
```

---

## II. BACKEND API (Node.js + Express on Render)

### 1. Project Structure

```
backend/
├── src/
│   ├── routes/
│   │   ├── invite.js
│   │   └── auth.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   ├── supabase.js
│   │   └── email.js
│   └── index.js
├── package.json
└── .env
```

### 2. Environment Variables

Create `.env` file:

```env
PORT=3000
NODE_ENV=production

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# JWT Secret (for sessions)
JWT_SECRET=your_strong_random_secret

# Frontend URL (for CORS)
FRONTEND_URL=https://onyx-project.com

# Email (Resend or SendGrid)
RESEND_API_KEY=your_resend_key
FROM_EMAIL=noreply@onyx-project.com
```

### 3. Install Dependencies

```bash
npm init -y
npm install express @supabase/supabase-js dotenv cors jsonwebtoken bcrypt nanoid resend
```

### 4. Core Files

**src/utils/supabase.js**
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use service key for admin operations
);

module.exports = supabase;
```

**src/index.js**
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const inviteRoutes = require('./routes/invite');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/invite', inviteRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

---

## III. API ENDPOINTS

### 1. Validate Token

**Route**: `GET /api/invite/validate-token?token=XYZ`

**src/routes/invite.js**
```javascript
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

router.get('/validate-token', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // Check token exists, not expired, not used
        const { data, error } = await supabase
            .from('invite_tokens')
            .select('email, expires_at, used')
            .eq('token', token)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Invalid token' });
        }

        if (data.used) {
            return res.status(400).json({ error: 'Token already used' });
        }

        if (new Date(data.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Token expired' });
        }

        res.json({ email: data.email });
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
```

### 2. Validate Email

**Route**: `POST /api/invite/validate-email`

**Add to src/routes/invite.js**
```javascript
router.post('/validate-email', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        // Check if email is approved
        const { data, error } = await supabase
            .from('applications')
            .select('status')
            .eq('email', email)
            .single();

        if (error || !data) {
            return res.status(404).json({ approved: false });
        }

        if (data.status !== 'approved') {
            return res.status(403).json({ approved: false });
        }

        res.json({ approved: true });
    } catch (error) {
        console.error('Email validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

### 3. Create Account

**Route**: `POST /api/auth/create-account`

**src/routes/auth.js**
```javascript
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

router.post('/create-account', async (req, res) => {
    try {
        const { token, email, password, displayName } = req.body;

        let userEmail = email;

        // If token provided, validate and mark as used
        if (token) {
            const { data: tokenData, error: tokenError } = await supabase
                .from('invite_tokens')
                .select('email, used, expires_at')
                .eq('token', token)
                .single();

            if (tokenError || !tokenData) {
                return res.status(400).json({ error: 'Invalid token' });
            }

            if (tokenData.used) {
                return res.status(400).json({ error: 'Token already used' });
            }

            if (new Date(tokenData.expires_at) < new Date()) {
                return res.status(400).json({ error: 'Token expired' });
            }

            userEmail = tokenData.email;
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userEmail,
            password: password,
            email_confirm: true // Auto-confirm since they're approved
        });

        if (authError) {
            console.error('Auth error:', authError);
            return res.status(400).json({ error: authError.message });
        }

        // Create user in users table
        const { error: userError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                email: userEmail,
                display_name: displayName,
                role: 'member'
            });

        if (userError) {
            console.error('User creation error:', userError);
            // Rollback: delete auth user
            await supabase.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({ error: 'User creation failed' });
        }

        // Create workspace
        const { error: workspaceError } = await supabase
            .from('workspaces')
            .insert({
                user_id: authData.user.id,
                name: 'My Workspace'
            });

        if (workspaceError) {
            console.error('Workspace creation error:', workspaceError);
        }

        // Mark token as used (if token-based)
        if (token) {
            await supabase
                .from('invite_tokens')
                .update({ used: true })
                .eq('token', token);
        }

        // Create session token
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
            user_id: authData.user.id
        });

        if (sessionError) {
            return res.status(500).json({ error: 'Session creation failed' });
        }

        res.json({
            success: true,
            session: sessionData.session
        });

    } catch (error) {
        console.error('Account creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
```

---

## IV. ADMIN OPERATIONS

### Approve Application & Send Invite

This can be done via:
1. Supabase dashboard (manual)
2. Admin API endpoint (future)
3. Simple Node script

**Example approval script** (run locally or via admin panel):

```javascript
const { nanoid } = require('nanoid');
const supabase = require('./utils/supabase');
const { sendInviteEmail } = require('./utils/email');

async function approveApplication(applicationId) {
    // Get application
    const { data: app } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

    if (!app) {
        console.error('Application not found');
        return;
    }

    // Update status
    await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

    // Generate token
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Insert invite token
    await supabase
        .from('invite_tokens')
        .insert({
            email: app.email,
            token: token,
            expires_at: expiresAt.toISOString(),
            application_id: applicationId
        });

    // Send email
    const inviteUrl = `https://onyx-project.com/invite?token=${token}`;
    await sendInviteEmail(app.email, inviteUrl);

    console.log(`Approved: ${app.email}`);
    console.log(`Invite URL: ${inviteUrl}`);
}
```

**src/utils/email.js** (using Resend)
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendInviteEmail(email, inviteUrl) {
    await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Your Onyx invitation',
        html: `
            <p>You have been approved for Onyx.</p>
            <p>Create your account here (expires in 72 hours):</p>
            <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        `
    });
}

module.exports = { sendInviteEmail };
```

---

## V. RENDER DEPLOYMENT

### 1. Create Web Service

1. Go to https://render.com
2. **New → Web Service**
3. Connect your GitHub repo (backend folder)
4. Settings:
   - **Name**: onyx-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Instance Type**: Free (or paid for production)

### 2. Environment Variables

In Render dashboard, add all environment variables from `.env`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `FRONTEND_URL`
- `RESEND_API_KEY`
- `FROM_EMAIL`

### 3. Deploy

Render will auto-deploy. You'll get a URL like:
```
https://onyx-backend.onrender.com
```

---

## VI. CONNECT FRONTEND TO BACKEND

### 1. Update Netlify _redirects

Replace the placeholder in `_redirects`:

```
/api/*  https://onyx-backend.onrender.com/api/:splat  200
```

### 2. Update Frontend API URL

In `js/invite.js`, change:
```javascript
const API_BASE_URL = '/api'; // Already correct (uses Netlify proxy)
```

---

## VII. TESTING CHECKLIST

- [ ] Create Supabase project and run schema
- [ ] Deploy backend to Render
- [ ] Update Netlify redirects
- [ ] Test token flow: `/invite?token=test`
- [ ] Test email flow: `/invite` (no token)
- [ ] Manually create approved application in Supabase
- [ ] Test account creation
- [ ] Verify user created in `auth.users` and `users` table
- [ ] Verify workspace created
- [ ] Test that used tokens can't be reused

---

## VIII. SECURITY CHECKLIST

- [ ] Service key never exposed to frontend
- [ ] RLS enabled on all tables
- [ ] CORS restricted to frontend URL only
- [ ] Passwords hashed by Supabase Auth
- [ ] Tokens are cryptographically secure (nanoid)
- [ ] Token expiry enforced
- [ ] One-time use enforced

---

## IX. NEXT STEPS (AFTER BACKEND IS WORKING)

1. Build `/app` workspace (separate React/Next.js app)
2. Add admin panel for approving applications
3. Add password reset flow
4. Add email notifications for form submissions
5. Add usage tracking

---

## Summary

**You now have:**
1. Complete database schema for Supabase
2. Full backend API spec with code
3. Deployment instructions for Render
4. Connection instructions for Netlify proxy
5. Security and testing checklists

**Frontend is complete.** Backend implementation is next.
