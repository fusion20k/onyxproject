# Testing the Invite Flow

## Prerequisites
- Backend deployed and running at https://onyxbackend-55af.onrender.com
- Supabase database set up with all tables
- Frontend deployed at https://onyx-project.com

---

## Option 1: Manual Token Creation (Fastest)

### Step 1: Generate Token Locally
```bash
cd c:\Users\david\Desktop\onyx
npm install nanoid
node test-invite-generator.js
```

This will output:
- A secure token
- An expiry timestamp
- SQL to insert into Supabase
- A test URL

### Step 2: Insert into Supabase

Go to **Supabase Dashboard → Table Editor → invite_tokens → Insert row**

Fill in:
- `email`: `your-test-email@example.com` (use a real email you control)
- `token`: (paste from script output)
- `expires_at`: (paste timestamp from script)
- `used`: `false`
- `application_id`: `null`

Click **Save**.

### Step 3: Test the Flow

Open the test URL in your browser:
```
https://onyx-project.com/invite?token=YOUR_TOKEN_HERE
```

You should see:
1. "Verifying invitation..." (loading)
2. "Create your account" form with your email displayed
3. Fill in password and optional display name
4. Click "Create account"
5. Should redirect to `/app` (will 404 for now, that's expected)

### Step 4: Verify in Database

Go to **Supabase → Table Editor** and check:
- `invite_tokens`: `used` should now be `true`
- `users`: Should see new user with your email
- `workspaces`: Should see new workspace for that user
- **Authentication → Users**: Should see user in Supabase Auth

---

## Option 2: Email-Based Flow (No Token)

### Step 1: Create Approved Application

Go to **Supabase → Table Editor → applications → Insert row**

Fill in:
- `name`: `Test User`
- `email`: `test@example.com`
- `role`: `Developer`
- `reason`: `Testing the system`
- `project`: `Test Project`
- `status`: `approved` (IMPORTANT)

Click **Save**.

### Step 2: Test the Flow

Go to:
```
https://onyx-project.com/invite
```

(No token parameter)

You should see:
1. "Approved applicants only" message
2. Email input field
3. Enter: `test@example.com`
4. Click "Continue"
5. Should show "Create your account" form
6. Fill in password and display name
7. Click "Create account"
8. Should redirect to `/app`

### Step 3: Verify in Database

Check same tables as Option 1.

---

## Common Issues

### "Invalid token" error
- Check token hasn't expired (expires_at > now)
- Check token not already used (used = false)
- Check token matches exactly (no spaces)

### "Access not granted" error (email flow)
- Check application status is exactly 'approved' (not 'pending')
- Check email matches exactly (case-sensitive)

### "Account creation failed" error
- Check Supabase service key is set in Render environment variables
- Check backend logs in Render dashboard
- Verify RLS policies are set correctly

### 404 on /app redirect
- Expected! /app doesn't exist yet
- Check browser Network tab to confirm account was created before redirect

---

## Backend Health Check

Test backend is running:
```
https://onyxbackend-55af.onrender.com/health
```

Should return:
```json
{"status": "ok"}
```

---

## Next Steps After Successful Test

1. ✅ Invite flow working
2. Build `/app` workspace (the actual application)
3. Add authentication middleware to protect /app routes
4. Build admin panel for approving applications
5. Add email notifications for approvals

---

## Quick Debug Commands

**Check if token exists:**
```sql
SELECT * FROM invite_tokens WHERE token = 'YOUR_TOKEN';
```

**Check if email is approved:**
```sql
SELECT * FROM applications WHERE email = 'test@example.com';
```

**Check user was created:**
```sql
SELECT * FROM users WHERE email = 'test@example.com';
```

**Reset test token:**
```sql
UPDATE invite_tokens SET used = false WHERE token = 'YOUR_TOKEN';
```
