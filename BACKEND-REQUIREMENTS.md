# Onyx Backend Requirements - Conversation Model

## Overview

The frontend has been transformed from a structured decision framework to an async conversation model. The backend needs to implement new database tables, API endpoints, and features to support this new architecture.

---

## 1. Database Schema Changes

### New Table: `conversations`

Replaces the old `decisions` table.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'resolved'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin-managed summary card
  summary_decision TEXT, -- One sentence decision
  summary_current_leaning TEXT, -- Short current direction
  summary_status TEXT DEFAULT 'draft', -- 'draft', 'in_motion', or 'resolved'
  summary_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  final_recommendation_message_id UUID, -- References messages.id
  outcome_note TEXT,
  committed_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin fields
  priority INTEGER DEFAULT 0,
  admin_notes TEXT, -- Private admin-only notes
  
  -- User preferences
  email_notifications_enabled BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_user_active ON conversations(user_id, status) WHERE status = 'active';

-- Constraint: Only one active conversation per user
CREATE UNIQUE INDEX idx_one_active_per_user 
ON conversations(user_id) 
WHERE status = 'active';
```

### New Table: `messages`

Replaces the old `decision_feedback` table.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_type TEXT NOT NULL, -- 'user' or 'admin'
  author_name TEXT, -- Display name of author (for multi-admin support)
  content TEXT NOT NULL,
  
  -- Message tagging (admin only)
  tag TEXT, -- NULL, 'proposed_direction', 'key_question', 'action_required', 'final_recommendation'
  
  -- Editing & deletion
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete (hide in UI, keep in DB)
  
  -- Attachments (images/PDFs only, max 5MB)
  attachment_url TEXT,
  attachment_type TEXT, -- 'image/png', 'image/jpeg', 'application/pdf'
  attachment_size INTEGER, -- bytes
  attachment_name TEXT -- original filename
);

-- Indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_tag ON messages(tag) WHERE tag IS NOT NULL;
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at) WHERE deleted_at IS NULL;
```

### Migration Notes

- Old tables (`decisions`, `decision_feedback`) can be kept temporarily for rollback capability
- No data migration needed - this is a clean break with the old model
- Drop old tables after successful deployment verification

---

## 2. File Storage Setup

### Supabase Storage Bucket

Create a new storage bucket for message attachments:

- **Bucket name**: `message-attachments`
- **Public access**: Yes (read-only for authenticated users)
- **File size limit**: 5MB per file
- **Allowed MIME types**: 
  - `image/png`
  - `image/jpeg`
  - `application/pdf`

### Storage Policies (RLS)

```sql
-- Users can upload to their own conversation folders
CREATE POLICY "Users can upload to own conversations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM conversations WHERE user_id = auth.uid()
  )
);

-- Anyone can read attachments (public read)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');
```

---

## 3. API Endpoints - User Side

### `GET /api/workspace/active-conversation`

Get the user's active conversation (if any).

**Auth**: Required (Bearer token)

**Response (200)** - Has active conversation:
```json
{
  "conversation": {
    "id": "uuid",
    "status": "active",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "email_notifications_enabled": true,
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
      "author_name": "Display name",
      "content": "Message text",
      "tag": "proposed_direction|key_question|action_required|final_recommendation|null",
      "edited_at": "timestamp|null",
      "deleted_at": "timestamp|null",
      "attachment_url": "https://...|null",
      "attachment_type": "image/png|image/jpeg|application/pdf|null",
      "attachment_name": "filename.png|null",
      "created_at": "timestamp"
    }
  ]
}
```

**Response (404)** - No active conversation

---

### `POST /api/workspace/start-conversation`

Start a new conversation with initial message.

**Auth**: Required

**Body (multipart/form-data)**:
- `content` (required, string, min 20 chars): Initial message
- `attachment` (optional, file, max 5MB): Image or PDF

**Response (201)**:
```json
{
  "conversation_id": "uuid"
}
```

**Error (409)** - User already has active conversation:
```json
{
  "success": false,
  "error": "You already have an active conversation"
}
```

**Logic**:
1. Check if user already has active conversation (enforce one active per user)
2. Create new conversation record with `status = 'active'`
3. If attachment provided, upload to Supabase Storage
4. Create first message with `author_type = 'user'`
5. Return conversation ID

---

### `POST /api/workspace/send-message/:conversation_id`

Add message to conversation.

**Auth**: Required (must own conversation)

**Body (multipart/form-data)**:
- `content` (required, string): Message text
- `attachment` (optional, file, max 5MB): Image or PDF

**Response (201)**:
```json
{
  "message_id": "uuid",
  "attachment_url": "https://..."|null
}
```

**Error (400)** - File too large or invalid type
**Error (403)** - Not your conversation
**Error (404)** - Conversation not found

**Logic**:
1. Verify user owns conversation
2. Verify conversation is still active
3. If attachment provided, validate type/size and upload to storage
4. Create message with `author_type = 'user'`, `author_name = user.display_name`
5. Update conversation `updated_at`

---

### `PATCH /api/workspace/edit-message/:message_id`

Edit user's own message (within 10 minutes of creation).

**Auth**: Required (must own message)

**Body**:
```json
{
  "content": "Updated message text"
}
```

**Response (200)**:
```json
{
  "success": true,
  "edited_at": "timestamp"
}
```

**Error (403)** - Edit window expired (created more than 10 minutes ago)
**Error (404)** - Message not found or not owned by user

**Logic**:
1. Verify user owns message (`author_type = 'user'` AND `author_id = current_user`)
2. Check if `created_at` is within 10 minutes of now
3. Update `content` and set `edited_at = NOW()`

---

### `DELETE /api/workspace/delete-message/:message_id`

Soft-delete user's own message (within 10 minutes of creation).

**Auth**: Required (must own message)

**Response (200)**:
```json
{
  "success": true,
  "deleted_at": "timestamp"
}
```

**Error (403)** - Delete window expired (>10 minutes)
**Error (404)** - Message not found or not owned by user

**Logic**:
1. Verify user owns message
2. Check if `created_at` is within 10 minutes of now
3. Set `deleted_at = NOW()` (soft delete - don't actually remove from DB)

---

### `POST /api/workspace/commit/:conversation_id`

User commits to final recommendation (resolves conversation).

**Auth**: Required (must own conversation)

**Body**:
```json
{
  "final_recommendation_id": "uuid"
}
```

**Response (200)**:
```json
{
  "success": true,
  "resolved_at": "timestamp"
}
```

**Error (400)** - Invalid recommendation message ID
**Error (404)** - Conversation not found

**Logic**:
1. Verify user owns conversation
2. Verify message ID exists and has `tag = 'final_recommendation'`
3. Update conversation: `status = 'resolved'`, `resolved_at = NOW()`, `committed_at = NOW()`, `final_recommendation_message_id = <id>`

---

### `GET /api/workspace/library`

Get list of user's resolved conversations.

**Auth**: Required

**Response (200)**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "summary_decision": "Decision title",
      "summary_status": "resolved",
      "message_count": 15,
      "resolved_at": "timestamp",
      "created_at": "timestamp"
    }
  ]
}
```

**Logic**:
1. Query conversations WHERE `user_id = current_user` AND `status = 'resolved'`
2. Join with messages to get count
3. Order by `resolved_at DESC`

---

### `GET /api/workspace/library/:conversation_id`

Get full read-only view of resolved conversation.

**Auth**: Required (must own conversation)

**Response (200)**:
```json
{
  "conversation": {
    "id": "uuid",
    "status": "resolved",
    "summary": { ... },
    "resolved_at": "timestamp"
  },
  "messages": [ /* same structure as active-conversation */ ]
}
```

**Error (404)** - Conversation not found or not owned by user

---

### `PATCH /api/workspace/update-settings`

Update user settings (display name, email notifications).

**Auth**: Required

**Body**:
```json
{
  "display_name": "string",
  "email_notifications_enabled": true|false
}
```

**Response (200)**:
```json
{
  "success": true
}
```

**Logic**:
1. Update user's `display_name` in auth.users metadata
2. If user has active conversation, update `email_notifications_enabled` on conversation record

---

## 4. API Endpoints - Admin Side

### `GET /api/admin/conversations`

Get all conversations with filtering.

**Auth**: Required (admin only)

**Query params**:
- `status` (optional): Filter by `active` or `resolved`
- `priority` (optional): Filter by priority level

**Response (200)**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_email": "user@example.com",
      "user_name": "Display Name",
      "status": "active|resolved",
      "summary_decision": "Decision title",
      "summary_status": "draft|in_motion|resolved",
      "priority": 0,
      "last_message_at": "timestamp",
      "message_count": 5,
      "created_at": "timestamp"
    }
  ]
}
```

**Logic**:
1. Query all conversations (admins can see all)
2. Join with users table for user info
3. Join with messages to get last message time and count
4. Apply filters if provided
5. Order by priority DESC, then last_message_at DESC

---

### `GET /api/admin/conversations/:conversation_id`

Get full conversation (admin view).

**Auth**: Required (admin only)

**Response (200)**:
```json
{
  "conversation": {
    "id": "uuid",
    "user_id": "uuid",
    "status": "active|resolved",
    "summary": { ... },
    "priority": 0,
    "admin_notes": "Internal notes",
    "email_notifications_enabled": true
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Display Name"
  },
  "messages": [ /* all messages, including deleted ones */ ]
}
```

**Note**: Admin view includes `deleted_at` messages (marked as deleted but visible to admin)

---

### `POST /api/admin/conversations/:conversation_id/respond`

Admin responds to conversation.

**Auth**: Required (admin only)

**Body (multipart/form-data)**:
- `content` (required, string): Message text
- `tag` (optional, string): `proposed_direction`, `key_question`, `action_required`, or `final_recommendation`
- `attachment` (optional, file, max 5MB): Image or PDF

**Response (201)**:
```json
{
  "message_id": "uuid",
  "attachment_url": "https://..."|null
}
```

**Logic**:
1. Create message with `author_type = 'admin'`, `author_name = admin.display_name`
2. If attachment provided, upload to storage
3. If tag provided, validate and set
4. Update conversation `updated_at`
5. **Trigger email notification** to user (if `email_notifications_enabled = true`)

---

### `PATCH /api/admin/conversations/:conversation_id/summary`

Update conversation summary card (admin only).

**Auth**: Required (admin only)

**Body**:
```json
{
  "decision": "One sentence decision",
  "current_leaning": "Short direction",
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

**Logic**:
1. Update `summary_decision`, `summary_current_leaning`, `summary_status`
2. Set `summary_updated_at = NOW()`

---

### `PATCH /api/admin/conversations/:conversation_id`

Update conversation metadata (priority, admin notes).

**Auth**: Required (admin only)

**Body**:
```json
{
  "priority": 0,
  "admin_notes": "Internal notes"
}
```

**Response (200)**:
```json
{
  "success": true
}
```

---

## 5. Email Notifications

### When to Send

Send email to user when:
- Admin posts a new message
- AND `conversation.email_notifications_enabled = true`
- AND user hasn't opened the app in the last 10 minutes (optional rate limiting)

### Email Template

**Subject**: `New response from Onyx`

**Body**:
```
[Admin Name] responded to your conversation:

"[First 150 chars of message]..."

View and reply: https://onyx-project.com/app

---
To disable email notifications, update your settings.
```

### Implementation Options

1. **Supabase Edge Functions**: Trigger on message insert, send via Resend/SendGrid
2. **Backend webhook**: After admin message creation, call email service
3. **Queue-based**: Add to job queue, process async

---

## 6. RLS Policies

### `conversations` table

```sql
-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own active conversations
CREATE POLICY "Users can update own active conversations"
ON conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'active');

-- Admins can view all conversations
CREATE POLICY "Admins view all conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can update all conversations
CREATE POLICY "Admins update all conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);
```

### `messages` table

```sql
-- Users can view messages in their own conversations
CREATE POLICY "Users view own conversation messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND user_id = auth.uid()
  )
);

-- Users can insert messages in their own conversations
CREATE POLICY "Users insert own messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND user_id = auth.uid()
    AND status = 'active'
  )
);

-- Users can update their own messages (for editing)
CREATE POLICY "Users update own messages"
ON messages FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND author_type = 'user'
);

-- Admins can do everything with messages
CREATE POLICY "Admins manage all messages"
ON messages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);
```

---

## 7. Implementation Checklist

### Database
- [ ] Create `conversations` table with indexes
- [ ] Create `messages` table with indexes
- [ ] Add unique constraint for one active conversation per user
- [ ] Create RLS policies for `conversations`
- [ ] Create RLS policies for `messages`
- [ ] Create Supabase Storage bucket `message-attachments`
- [ ] Configure storage RLS policies

### User Endpoints
- [ ] `GET /api/workspace/active-conversation`
- [ ] `POST /api/workspace/start-conversation` (with file upload)
- [ ] `POST /api/workspace/send-message/:id` (with file upload)
- [ ] `PATCH /api/workspace/edit-message/:id` (10-min window check)
- [ ] `DELETE /api/workspace/delete-message/:id` (soft delete, 10-min window)
- [ ] `POST /api/workspace/commit/:id`
- [ ] `GET /api/workspace/library`
- [ ] `GET /api/workspace/library/:id`
- [ ] `PATCH /api/workspace/update-settings`

### Admin Endpoints
- [ ] `GET /api/admin/conversations`
- [ ] `GET /api/admin/conversations/:id`
- [ ] `POST /api/admin/conversations/:id/respond` (with file upload + email trigger)
- [ ] `PATCH /api/admin/conversations/:id/summary`
- [ ] `PATCH /api/admin/conversations/:id`

### Email System
- [ ] Set up email service (Resend/SendGrid/etc)
- [ ] Create email template for admin responses
- [ ] Implement email trigger on admin message creation
- [ ] Add rate limiting to prevent email spam

### Testing
- [ ] Test one active conversation enforcement
- [ ] Test file upload (size, type validation)
- [ ] Test edit/delete 10-minute window
- [ ] Test email notifications
- [ ] Test RLS policies (user isolation, admin access)
- [ ] Test multi-admin attribution (author_name)

---

## 8. Key Differences from Old Model

| Old Model (`decisions`) | New Model (`conversations`) |
|-------------------------|----------------------------|
| Structured fields (situation, context, options, risks) | Freeform messages |
| User-driven updates | Admin-controlled summary cards |
| Statuses: in_progress, under_review, responded, resolved | Statuses: active, resolved |
| No file attachments | Support for images/PDFs |
| No edit/delete functionality | 10-minute edit/delete window |
| No email notifications | Email on admin response |
| Single admin assumed | Multi-admin support with attribution |

---

## 9. Environment Variables Needed

```
# Email service (example: Resend)
RESEND_API_KEY=re_...

# Supabase
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=message-attachments

# App URL (for email links)
APP_URL=https://onyx-project.com
```

---

## 10. Next Steps

1. Review and confirm this spec
2. Create database migration script
3. Implement user API endpoints (start with core: active-conversation, start-conversation, send-message)
4. Implement admin API endpoints
5. Set up file storage and email notifications
6. Test all endpoints with frontend
7. Deploy to production

---

**Questions? Contact the frontend developer for clarification on expected behavior.**
