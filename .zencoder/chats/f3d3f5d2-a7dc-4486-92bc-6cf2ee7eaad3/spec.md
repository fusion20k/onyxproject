# Onyx Transformation - Technical Specification

## Complexity Assessment: HARD

This is a fundamental architectural transformation that:
- Replaces the entire decision framework with a conversation-based model
- Requires significant database schema changes
- Involves complete UI/UX overhaul
- Changes the core product experience from structured forms to async messaging
- Impacts both frontend and backend systems comprehensively

---

## 1. Technical Context

### Current Stack
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Backend**: API at `/api` (implementation details per WORKSPACE-BACKEND-SPEC.md)
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Token-based (Bearer tokens in localStorage)
- **Deployment**: Netlify

### Key Files
- `app/index.html` - Main workspace interface (454 lines)
- `js/workspace.js` - Workspace logic (1266 lines)
- `css/workspace.css` - Workspace styles
- Backend: `/api/workspace/*` endpoints

---

## 2. Product Transformation Summary

### FROM (Current Model)
- Multi-step decision framework with forms
- Sections: situation, context, options, risks, unknowns, final direction
- User-driven structure and updates
- Multiple states: draft, in_progress, under_review, responded, resolved
- Complex UI with multiple decision steps

### TO (New Model)
- Single ongoing conversation thread per user (one active at a time)
- Simple message exchange (user ↔ admin)
- Admin-controlled summary cards
- Minimal states: Draft, In Motion, Resolved
- Clean 3-tab interface: Active, Library, Settings

---

## 3. Database Schema Changes

### New Tables

#### `conversations` (replaces `decisions`)
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  status TEXT NOT NULL DEFAULT 'active', -- active, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin-managed summary card
  summary_decision TEXT, -- One sentence decision
  summary_current_leaning TEXT, -- Short current direction
  summary_status TEXT DEFAULT 'draft', -- draft, in_motion, resolved
  summary_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  final_recommendation_message_id UUID, -- References messages.id
  outcome_note TEXT,
  committed_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin fields
  priority INTEGER DEFAULT 0,
  admin_notes TEXT, -- Private admin notes
  
  -- User preferences
  email_notifications_enabled BOOLEAN DEFAULT true
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_user_active ON conversations(user_id, status) WHERE status = 'active';
```

#### `messages` (replaces `decision_feedback`)
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_type TEXT NOT NULL, -- 'user' or 'admin'
  author_name TEXT, -- Display name of author (for multi-admin support)
  content TEXT NOT NULL,
  
  -- Message tagging (admin only)
  tag TEXT, -- null, 'proposed_direction', 'key_question', 'action_required', 'final_recommendation'
  
  -- Editing & deletion
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
  
  -- Attachments (images/PDFs only, max 5MB)
  attachment_url TEXT,
  attachment_type TEXT, -- 'image/png', 'image/jpeg', 'application/pdf'
  attachment_size INTEGER, -- bytes
  attachment_name TEXT -- original filename
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_tag ON messages(tag) WHERE tag IS NOT NULL;
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at) WHERE deleted_at IS NULL;
```

### Migration Strategy
1. Create new tables alongside existing ones
2. No data migration needed (fresh start with new model)
3. Drop old tables (`decisions`, `decision_feedback`) after successful deployment
4. Keep old tables temporarily for rollback capability

---

## 4. API Changes

### New User Endpoints

#### `GET /api/workspace/active-conversation`
Get the user's active conversation (if any).

**Response (200)**:
```json
{
  "conversation": {
    "id": "uuid",
    "status": "active",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "summary": {
      "decision": "One sentence decision",
      "current_leaning": "Short text",
      "status": "draft|in_motion|resolved",
      "last_update": "timestamp"
    }
  },
  "messages": [
    {
      "id": "uuid",
      "author_type": "user|admin",
      "author_name": "string",
      "content": "string",
      "tag": "proposed_direction|key_question|action_required|final_recommendation|null",
      "edited_at": "timestamp|null",
      "deleted_at": "timestamp|null",
      "attachment_url": "string|null",
      "attachment_type": "string|null",
      "attachment_name": "string|null",
      "created_at": "timestamp"
    }
  ]
}
```

**Response (404)**: No active conversation

#### `POST /api/workspace/start-conversation`
Start a new conversation with initial message.

**Body**:
```json
{
  "content": "string (required, min 20 chars)"
}
```

**Response (201)**:
```json
{
  "conversation_id": "uuid"
}
```

**Error (409)**: User already has active conversation

#### `POST /api/workspace/send-message/:conversation_id`
Add message to conversation.

**Body (multipart/form-data)**:
- `content` (required): Message text
- `attachment` (optional): File upload (images/PDFs, max 5MB)

**Response (201)**:
```json
{
  "message_id": "uuid",
  "attachment_url": "string|null"
}
```

**Error (400)**: File too large or invalid type
**Error (413)**: Attachment exceeds 5MB

#### `PATCH /api/workspace/edit-message/:message_id`
Edit user's own message (within 10 minutes of creation).

**Body**:
```json
{
  "content": "string (required)"
}
```

**Response (200)**:
```json
{
  "success": true,
  "edited_at": "timestamp"
}
```

**Error (403)**: Edit window expired (>10 minutes)
**Error (404)**: Message not found or not owned by user

#### `DELETE /api/workspace/delete-message/:message_id`
Soft-delete user's own message (within 10 minutes of creation).

**Response (200)**:
```json
{
  "success": true,
  "deleted_at": "timestamp"
}
```

**Error (403)**: Delete window expired (>10 minutes)
**Error (404)**: Message not found or not owned by user

#### `POST /api/workspace/commit/:conversation_id`
User commits to final recommendation (resolves conversation).

**Body**:
```json
{
  "final_recommendation_id": "uuid" // Message ID tagged as final_recommendation
}
```

**Response (200)**:
```json
{
  "success": true,
  "resolved_at": "timestamp"
}
```

#### `GET /api/workspace/library`
Get list of resolved conversations.

**Response (200)**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "summary_decision": "string",
      "summary_status": "resolved",
      "message_count": 15,
      "resolved_at": "timestamp",
      "created_at": "timestamp"
    }
  ]
}
```

#### `GET /api/workspace/library/:id`
Get full read-only view of resolved conversation.

**Response (200)**:
```json
{
  "conversation": { /* full conversation */ },
  "messages": [ /* all messages */ ]
}
```

### New Admin Endpoints

#### `GET /api/admin/conversations`
Get all conversations with filtering.

**Query params**:
- `status`: filter by active/resolved
- `priority`: filter by priority

**Response (200)**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_email": "string",
      "user_name": "string",
      "status": "active|resolved",
      "summary_decision": "string",
      "summary_status": "draft|in_motion|resolved",
      "priority": 0,
      "last_message_at": "timestamp",
      "message_count": 5,
      "created_at": "timestamp"
    }
  ]
}
```

#### `GET /api/admin/conversations/:id`
Get full conversation (admin view).

**Response (200)**:
```json
{
  "conversation": { /* full conversation including admin_notes */ },
  "user": {
    "id": "uuid",
    "email": "string",
    "display_name": "string"
  },
  "messages": [ /* all messages */ ]
}
```

#### `POST /api/admin/conversations/:id/respond`
Admin responds to conversation.

**Body (multipart/form-data)**:
- `content` (required): Message text
- `tag` (optional): Message tag
- `attachment` (optional): File upload (images/PDFs, max 5MB)

**Response (201)**:
```json
{
  "message_id": "uuid",
  "attachment_url": "string|null"
}
```

**Logic**:
- Automatically triggers email notification to user (if enabled)
- Stores admin's display name in `author_name` field

#### `PATCH /api/admin/conversations/:id/summary`
Update conversation summary card (admin only).

**Body**:
```json
{
  "decision": "string",
  "current_leaning": "string",
  "status": "draft|in_motion|resolved"
}
```

**Response (200)**:
```json
{
  "success": true,
  "summary_updated_at": "timestamp"
}
```

#### `PATCH /api/admin/conversations/:id`
Update conversation metadata (admin only).

**Body**:
```json
{
  "priority": 0,
  "admin_notes": "string"
}
```

**Response (200)**:
```json
{
  "success": true
}
```

---

## 5. Frontend Architecture Changes

### HTML Structure (app/index.html)

**Complete Replacement** - New structure:

```html
<body class="workspace-page">
  <div class="workspace-container">
    <!-- Auth States (unchanged) -->
    <div id="loading-state"></div>
    <div id="unauthorized-state"></div>
    <div id="unpaid-state"></div>
    
    <!-- First-Time Experience -->
    <div id="first-time-state">
      <header>Tell Onyx what you're deciding.</header>
      <p>Start by pasting any context you already have...</p>
      <textarea id="first-message-input"></textarea>
      <button id="send-first-message">Send to Onyx</button>
    </div>
    
    <!-- Main Workspace (3-tab layout) -->
    <div id="workspace-state">
      <aside class="workspace-sidebar">
        <nav>
          <button data-tab="active">Active</button>
          <button data-tab="library">Library</button>
          <button data-tab="settings">Settings</button>
        </nav>
        <div class="user-menu">
          <!-- Account dropdown -->
        </div>
      </aside>
      
      <main class="workspace-main">
        <!-- Active Tab -->
        <div id="active-tab">
          <!-- Summary Card -->
          <div class="summary-card">
            <div class="summary-field">
              <label>Decision:</label>
              <p id="summary-decision"></p>
            </div>
            <div class="summary-field">
              <label>Current Leaning:</label>
              <p id="summary-leaning"></p>
            </div>
            <div class="summary-meta">
              <span>Last Update: <span id="summary-updated"></span></span>
              <span>Status: <span id="summary-status"></span></span>
            </div>
          </div>
          
          <!-- Message Thread -->
          <div class="message-thread" id="message-thread">
            <!-- Messages populated by JS -->
          </div>
          
          <!-- Message Input -->
          <div class="message-input-container">
            <textarea id="message-input" placeholder="Type your message..."></textarea>
            <button id="send-message">Send</button>
          </div>
          
          <!-- Commit Button (shows when final_recommendation exists) -->
          <div id="commit-section" style="display: none;">
            <button id="commit-button">Commit to this direction</button>
          </div>
        </div>
        
        <!-- Library Tab -->
        <div id="library-tab" style="display: none;">
          <h1>Library</h1>
          <div class="library-list" id="library-list">
            <!-- Past conversations -->
          </div>
        </div>
        
        <!-- Settings Tab -->
        <div id="settings-tab" style="display: none;">
          <h1>Settings</h1>
          <div class="settings-form">
            <!-- Account info, billing, notifications -->
          </div>
        </div>
      </main>
    </div>
  </div>
</body>
```

### JavaScript Changes (js/workspace.js)

**Major Refactor** - New core functions:

```javascript
// State management
let currentConversation = null;
let currentMessages = [];

// API functions
async function getActiveConversation()
async function startConversation(content)
async function sendMessage(conversationId, content)
async function commitToRecommendation(conversationId, messageId)
async function getLibrary()
async function getConversationById(id)

// UI functions
function renderSummaryCard(summary)
function renderMessageThread(messages)
function appendMessage(message)
function showCommitButton(recommendationMessageId)
function switchTab(tabName)

// Real-time polling (every 10s when on Active tab)
function pollForNewMessages()
```

### CSS Changes (css/workspace.css)

**Major Refactor** - New components:

```css
/* Sidebar navigation (3 tabs) */
.workspace-sidebar
.sidebar-nav-item

/* Summary card */
.summary-card
.summary-field
.summary-meta

/* Message thread */
.message-thread
.message
.message--user
.message--admin
.message-content
.message-tag
.message-timestamp

/* Message input */
.message-input-container
#message-input
#send-message

/* Commit section */
#commit-section
#commit-button

/* Library list */
.library-list
.library-item

/* First-time experience */
#first-time-state
#first-message-input
```

---

## 6. Implementation Approach

### Phase 1: Database & Backend API
1. Create new database tables (`conversations`, `messages`)
2. Implement new API endpoints:
   - User endpoints: active-conversation, start-conversation, send-message, commit, library
   - Admin endpoints: conversations list, conversation detail, respond, update-summary
3. Add RLS policies for new tables
4. Test API endpoints independently

### Phase 2: Frontend - Core Experience
1. Strip down `app/index.html` to new 3-tab structure
2. Implement first-time experience (initial message input)
3. Build Active tab:
   - Summary card (read-only for users)
   - Message thread rendering
   - Message input and send functionality
   - Commit button logic
4. Implement tab navigation

### Phase 3: Frontend - Library & Settings
1. Build Library tab (list of resolved conversations)
2. Build conversation detail view (read-only)
3. Update Settings tab (minimal changes needed)
4. Connect all frontend to new API endpoints

### Phase 4: Admin Panel Rebuild
1. Update `admin.html` for new conversation model
2. Implement admin conversation list view
3. Build admin conversation detail view with:
   - Full message thread
   - Summary card editor
   - Message composer with tag selector
   - Priority/notes controls
4. Update `js/admin.js` for new API

### Phase 5: Styling & Polish
1. Apply new CSS for conversation UI
2. Ensure mobile responsiveness
3. Add subtle animations for message send/receive
4. Polish summary card design
5. Implement "slower, deliberate pacing" feel

### Phase 6: Testing & Deployment
1. Test complete user flow (first-time → active → library)
2. Test admin flow (view → respond → update summary → resolve)
3. Test edge cases (multiple users, concurrent messages)
4. Deploy backend changes
5. Deploy frontend changes
6. Monitor for issues

---

## 7. Files to Create or Modify

### Backend (API)
- **Create**: `/api/workspace/conversations.js` - New conversation endpoints
- **Modify**: `/api/admin/*` - Update admin endpoints for new model
- **Create**: Database migration script for new tables

### Frontend
- **Modify**: `app/index.html` - Complete HTML restructure
- **Modify**: `js/workspace.js` - Complete JavaScript rewrite
- **Modify**: `css/workspace.css` - Major CSS updates
- **Modify**: `admin.html` - Admin panel updates
- **Modify**: `js/admin.js` - Admin logic updates

### Documentation
- **Modify**: `WORKSPACE-BACKEND-SPEC.md` - Update to reflect new model

---

## 8. Data Model Differences

### Old Model
```
decision (1) → feedback (many)
- Decision has: situation, context, options, risks, unknowns, final_direction
- User fills in structured fields
- Status: in_progress, under_review, responded, resolved
```

### New Model
```
conversation (1) → messages (many)
- Conversation has: summary card (admin-controlled), status
- Messages are freeform chat
- Summary includes: decision, current_leaning, status
- Status: active, resolved
```

---

## 9. Key UX Principles

1. **No forms** - Everything is messaging
2. **One active conversation** - No multitasking
3. **Admin authority** - Only admin can edit summary cards
4. **Closure** - Clear commit flow for resolution
5. **Calm interface** - No likes, reactions, typing indicators
6. **Serious tone** - Email-quality thinking, not chat dopamine

---

## 10. Verification Steps

### After Backend Implementation
1. Test creating conversation: `POST /api/workspace/start-conversation`
2. Test sending messages: `POST /api/workspace/send-message/:id`
3. Test admin response: `POST /api/admin/conversations/:id/respond`
4. Test summary update: `PATCH /api/admin/conversations/:id/summary`
5. Test commit: `POST /api/workspace/commit/:id`
6. Verify RLS policies prevent unauthorized access

### After Frontend Implementation
1. Test first-time user experience (clean state)
2. Test sending initial message
3. Test conversation thread rendering
4. Test tab switching (Active, Library, Settings)
5. Test commit flow
6. Test library view (resolved conversations)
7. Test responsive design on mobile

### Integration Testing
1. User starts conversation → Admin responds → User replies → Admin provides recommendation → User commits
2. Multiple users with active conversations (no interference)
3. Message ordering and timestamps
4. Summary card updates reflect in real-time

---

## 11. Risks & Mitigations

### Risk 1: Data Loss During Migration
**Mitigation**: Keep old tables intact until new system is proven stable. No automatic data migration.

### Risk 2: Real-time Updates
**Challenge**: Messages need to appear quickly for both user and admin
**Mitigation**: Implement polling (every 10s) on Active tab. Future: WebSocket upgrade.

### Risk 3: Concurrent Edits
**Challenge**: Admin and user messaging simultaneously
**Mitigation**: Message ordering by timestamp, no edit/delete functionality initially.

### Risk 4: "One Active Conversation" Enforcement
**Challenge**: Prevent users from creating multiple active conversations
**Mitigation**: Database constraint + API validation + UI blocking.

---

## 12. Success Criteria

1. ✅ User can start new conversation with one message
2. ✅ User sees conversation thread in Active tab
3. ✅ Admin can view all active conversations
4. ✅ Admin can respond with tagged messages
5. ✅ Admin can update summary card
6. ✅ User sees updated summary in real-time (after refresh/poll)
7. ✅ User can commit to final recommendation
8. ✅ Resolved conversations appear in Library
9. ✅ UI feels calm, authoritative, and serious
10. ✅ No decision framework forms remain

---

## 13. Timeline Estimate

- **Phase 1** (Database & Backend): 4-6 hours
- **Phase 2** (Frontend Core): 6-8 hours
- **Phase 3** (Library & Settings): 3-4 hours
- **Phase 4** (Admin Panel): 5-7 hours
- **Phase 5** (Styling & Polish): 3-5 hours
- **Phase 6** (Testing & Deployment): 2-3 hours

**Total**: 23-33 hours of development work

---

## 14. Design Decisions (Confirmed)

1. **Real-time updates**: ✅ Start with polling every 5-10 seconds; design code to swap in WebSockets later
2. **Message editing**: ✅ Allow edit/delete with constraints:
   - Edit window: 5-10 minutes after sending
   - Show "edited" label on modified messages
   - Deletion = soft delete (hide in UI, keep in DB)
3. **Attachments**: ✅ Support basic file/image uploads in v1:
   - Types: Images (PNG, JPG) and PDFs only
   - Size cap: 5MB per file
   - No inline previews initially (simple "View file" link)
4. **Notifications**: ✅ Send email when admin replies (with opt-out in settings)
5. **Mobile app**: ✅ No native app; responsive web UI optimized for phones
6. **Admin notes**: ✅ Strictly internal, never visible to users, visually distinct in admin view
7. **Multiple admins**: ✅ Design for multiple admins from start; show author name on each admin message

---

## Next Steps

1. **Get user confirmation** on this specification
2. **Clarify open questions** before implementation
3. **Begin Phase 1** (Database & Backend API)
4. **Test incrementally** after each phase
