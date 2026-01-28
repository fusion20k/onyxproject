# Technical Specification: Onyx UX Overhaul & Real Data Integration

## Complexity Assessment
**Difficulty**: Hard
- Complete UX redesign across multiple pages
- Real data integration requiring backend/database changes
- OAuth integration (Google Sign-In)
- Pipeline visualization with real-time data
- Complex state management for workspace

---

## Technical Context

**Language**: JavaScript (ES6+)
**Frontend**: Vanilla JS, HTML5, CSS3
**Backend**: Express.js at https://onyxbackend-55af.onrender.com
**Database**: Supabase (PostgreSQL)
**Authentication**: JWT tokens stored in localStorage
**New Requirements**: Google OAuth for signup

---

## Implementation Approach

### Phase 1: Simplify Onboarding (3 Steps)
Current onboarding has 5 steps with complex forms. New flow:

**Step 1: Tell Onyx about your business**
- Single-page form with 3 sections:
  - Section A: "I help [____] with [____]" (sentence builder)
  - Section B: Ideal Client selector (Industry, Company Size, Job Title, Location)
  - Section C: How you help (One-time, Ongoing, Both)
- Progress indicator: Simple dots (● ○ ○)

**Step 2: Email Setup** (Skip LinkedIn for now)
- Two options:
  - Option 1: Use Onyx Email (yourname@onyx-outreach.com)
  - Option 2: Forward to my email
- Progress: (● ● ○)

**Step 3: Launch**
- Shows "Onyx is now working" transition
- Immediately redirects to workspace

### Phase 2: Workspace Dashboard Redesign
Current: Sidebar navigation with 5 views (Command Center, Pipeline, Campaign, Analytics, Conversations)
New: Single-column, always-on dashboard

**New Layout:**
1. **Top Bar (Fixed)**
   - Onyx logo (left)
   - Status indicator: "🟢 Active" or "⏸️ Paused"
   - User name & avatar (right)

2. **Daily Summary Card**
   - Today's date
   - Conversations started
   - People replied
   - New qualified leads

3. **Pipeline (4 columns)**
   - Found → Contacted → Talking → Ready
   - Visual flow, left to right
   - Names + company abbreviations
   - Urgency dots (🔴 High, 🟡 Medium, ⚪ Normal)

4. **Activity Stream**
   - Timeline of recent activities
   - Time-stamped events

5. **Action Button (Floating)**
   - Bottom-right circular button
   - Three options: Add person, Pause Onyx, Settings

### Phase 3: Real Data Integration

#### Backend Endpoints Required

**Authentication:**
- `POST /auth/signup` - Create account with trial
- `POST /auth/google` - Google OAuth signup
- `POST /auth/login` - Email/password login
- `GET /auth/status` - Check auth status

**Onboarding:**
- `POST /api/onboarding/complete` - Save onboarding data

**Workspace:**
- `GET /api/workspace/dashboard` - Get daily summary + metrics
- `GET /api/workspace/pipeline` - Get prospects by stage (Found/Contacted/Talking/Ready)
- `GET /api/workspace/activity` - Get recent activity stream
- `GET /api/workspace/settings` - Get user settings
- `PATCH /api/workspace/settings` - Update settings (pause/resume, targeting)

**Prospects:**
- `GET /api/prospects` - Get all prospects for user
- `POST /api/prospects` - Add specific person manually
- `PATCH /api/prospects/:id` - Update prospect status/stage
- `DELETE /api/prospects/:id` - Remove prospect

#### Supabase Schema Required

**users table:**
```sql
- id (uuid)
- email (text)
- name (text)
- display_name (text)
- company (text)
- trial_start (timestamp)
- trial_end (timestamp)
- subscription_status (text)
- onboarding_complete (boolean)
- created_at (timestamp)
```

**onboarding_data table:**
```sql
- id (uuid)
- user_id (uuid, foreign key)
- business_help_who (text) - "I help X"
- business_help_with (text) - "with Y"
- target_industries (text[])
- target_company_size (text)
- target_job_titles (text[])
- target_location (text)
- service_type (text) - "one-time", "ongoing", "both"
- email_option (text) - "onyx-email", "forward"
- forward_email (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

**prospects table:**
```sql
- id (uuid)
- user_id (uuid, foreign key)
- first_name (text)
- last_name (text)
- company (text)
- job_title (text)
- email (text)
- linkedin_url (text, nullable)
- stage (text) - "found", "contacted", "talking", "ready"
- priority (text) - "high", "medium", "normal"
- last_activity (timestamp)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)
```

**activities table:**
```sql
- id (uuid)
- user_id (uuid, foreign key)
- prospect_id (uuid, foreign key, nullable)
- activity_type (text) - "prospect_found", "message_sent", "reply_received", "lead_qualified"
- description (text)
- created_at (timestamp)
```

**conversations table:**
```sql
- id (uuid)
- user_id (uuid, foreign key)
- prospect_id (uuid, foreign key)
- messages (jsonb) - Array of message objects
- status (text) - "active", "archived"
- created_at (timestamp)
- updated_at (timestamp)
```

**settings table:**
```sql
- id (uuid)
- user_id (uuid, foreign key)
- is_paused (boolean, default false)
- email_notifications (boolean, default true)
- outreach_speed (text) - "careful", "moderate", "aggressive"
- updated_at (timestamp)
```

### Phase 4: Google OAuth Integration

**Landing Page Changes:**
- Add "Sign in with Google" button below/above signup form
- Button triggers OAuth flow
- On success: Creates user account → Starts trial → Redirects to onboarding

**Implementation:**
- Use Google Identity Services (Sign In With Google)
- Frontend receives OAuth token
- Send to backend: `POST /auth/google { token }`
- Backend verifies token, creates user, returns JWT

### Phase 5: Design System Update

**Color Palette:**
- Primary: Soft blue (#4A90E2 → #5B9FEF)
- Background: Dark (#0a0a0a, #111)
- Text: White with opacity variations
- Accents: Green (#10B981) for active/positive
- Warning: Orange (#F59E0B) for attention
- High priority: Red (#EF4444)

**Typography:**
- Headers: Clean, readable sans-serif
- Body: 0.9375rem base, line-height 1.6
- Natural language throughout (no jargon)

**Animations:**
- Gentle transitions (300ms ease)
- Subtle pulsing for active work
- No jarring movements

**White Space:**
- Generous padding and margins
- Single-column layout (max-width: 1200px)
- Card-based UI with subtle borders

---

## Source Code Changes

### Files to Modify

**HTML:**
- `/onboarding/index.html` - Complete restructure to 3 steps
- `/app/index.html` - Complete redesign to single-column layout
- `/index.html` - Add Google Sign-In button

**JavaScript:**
- `/js/onboarding.js` - New 3-step flow logic + API calls
- `/js/workspace.js` - Remove mock data, add real API calls
- `/js/main.js` - Add Google OAuth handler
- `/js/login.js` - Keep existing, ensure Google login works

**CSS:**
- `/css/onboarding.css` - Simplify for 3-step flow
- `/css/workspace.css` - Complete rewrite for single-column layout
- `/css/style.css` - Update color palette, add new components

### New Files to Create
- `/js/api.js` - Centralized API client for all backend calls
- `/js/google-auth.js` - Google OAuth initialization and handling

---

## Data Model Changes

### LocalStorage Keys
- `onyx-token` - JWT bearer token
- `onyx-user-data` - User profile object (includes display_name, email, trial info)
- `onyx-onboarding-complete` - Boolean flag
- `onyx-settings` - User settings (cache)

### API Response Formats

**Dashboard Response:**
```json
{
  "summary": {
    "date": "2026-01-27",
    "conversations_started": 8,
    "replies": 3,
    "qualified_leads": 2
  },
  "metrics": {
    "active_conversations": 24,
    "reply_rate": "32%",
    "qualified_leads": 12,
    "ready_for_you": 5
  },
  "status": {
    "is_active": true,
    "is_paused": false,
    "last_activity": "2026-01-27T14:23:00Z"
  }
}
```

**Pipeline Response:**
```json
{
  "pipeline": {
    "found": [
      {
        "id": "uuid",
        "first_name": "Sarah",
        "company": "TechCorp",
        "priority": "normal"
      }
    ],
    "contacted": [...],
    "talking": [...],
    "ready": [...]
  }
}
```

**Activity Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "time": "10:14 AM",
      "description": "Started conversation with Sarah (TechCorp)",
      "type": "conversation_started",
      "created_at": "2026-01-27T10:14:00Z"
    }
  ]
}
```

---

## Verification Approach

### Testing Steps

1. **Authentication Flow**
   - Test Google Sign-In → Creates account → Redirects to onboarding
   - Test email signup → Redirects to onboarding
   - Test login → Redirects to workspace (if onboarding complete)

2. **Onboarding Flow**
   - Complete 3-step form
   - Verify data saves to Supabase onboarding_data table
   - Verify redirect to workspace
   - Check "Onyx is now working" transition

3. **Workspace Dashboard**
   - Verify real data loads from API
   - Check pipeline columns populate correctly
   - Test activity stream shows recent activities
   - Verify status indicator shows correct state

4. **Real-time Updates**
   - Test pause/resume functionality
   - Verify settings update
   - Check if manual prospect addition works

5. **Error Handling**
   - Test with no internet connection
   - Test with expired token
   - Test with empty data states

### Manual Verification
- Open workspace in browser
- Check browser console for errors
- Verify no placeholder/mock data visible
- Test all interactive elements
- Verify responsive design

### Backend Verification Needed
After frontend implementation, backend team needs to:
1. Create Supabase tables with RLS policies
2. Implement API endpoints listed above
3. Set up Google OAuth credentials
4. Configure CORS for frontend domain
5. Test end-to-end data flow

---

## Dependencies

**Existing:**
- No external JS libraries (vanilla JS)
- Native Fetch API for HTTP requests

**New:**
- Google Identity Services (loaded via CDN)
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

---

## Rollout Plan

1. **Phase 1**: Onboarding redesign (can test immediately)
2. **Phase 2**: Workspace layout redesign (can test with mock data)
3. **Phase 3**: Real data integration (requires backend endpoints)
4. **Phase 4**: Google OAuth (requires Google Cloud setup)
5. **Phase 5**: Design polish and animations

---

## Post-Implementation Backend Setup

### Google OAuth Setup Instructions

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Add authorized JavaScript origins:
   - `http://localhost` (dev)
   - `https://yourdomain.com` (prod)
6. Add authorized redirect URIs:
   - `http://localhost/` (dev)
   - `https://yourdomain.com/` (prod)
7. Copy Client ID
8. Add to backend `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   ```
9. Add to frontend (index.html):
   ```html
   <meta name="google-signin-client_id" content="YOUR_CLIENT_ID.apps.googleusercontent.com">
   ```

### Supabase Setup Instructions

1. Create new Supabase project
2. Run SQL migrations to create tables (schema provided above)
3. Set up Row Level Security (RLS) policies:
   ```sql
   -- Example: Users can only see their own prospects
   CREATE POLICY "Users can view own prospects"
   ON prospects FOR SELECT
   USING (auth.uid() = user_id);
   ```
4. Create API service in backend to connect to Supabase
5. Add Supabase credentials to backend `.env`:
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_KEY=your_service_role_key
   ```

---

## Risk Assessment

**High Risk:**
- Backend endpoints don't exist yet → Frontend will fail without them
- Google OAuth requires proper setup → Can't test until configured
- Real data migration → No existing data to show initially

**Mitigation:**
- Implement graceful fallbacks for missing data
- Show helpful "Getting started" messages for empty states
- Add comprehensive error handling
- Create seed data script for demo purposes

**Medium Risk:**
- UX changes are dramatic → User confusion possible
- Design changes may not match expectations → Iterative refinement needed

**Low Risk:**
- CSS changes are reversible
- No breaking changes to authentication flow
- localStorage keys remain compatible
