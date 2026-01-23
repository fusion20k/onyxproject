# Spec and build

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:

- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Technical Specification

**Complexity: HARD** - Complete architectural transformation

✅ **Completed**: Comprehensive technical specification created at `spec.md`

**Key Findings**:
- Complete product transformation from structured decision framework to async conversation model
- Database schema overhaul (new tables: `conversations`, `messages`)
- Full API redesign (user + admin endpoints)
- Complete frontend rebuild (3-tab interface, messaging UI)
- Estimated 23-33 hours of development work

**Open Questions** (need user input before proceeding):
1. Real-time updates: WebSocket now or start with polling?
2. Should users be able to edit/delete messages?
3. Support file/image attachments in v1?
4. Email notifications when admin responds?
5. Mobile app transformation planned?
6. Admin notes: strictly internal or ever visible to users?
7. Multiple admins or single coach model?

---

## Implementation Phases

### [ ] Phase 1: Database & Backend API (6-8 hours)

**Tasks**:
1. [ ] Create database migration script for new tables:
   - [ ] `conversations` table (with email_notifications_enabled)
   - [ ] `messages` table (with editing, soft delete, attachments)
2. [ ] Set up file storage for attachments (Supabase Storage bucket)
3. [ ] Implement user API endpoints:
   - [ ] `GET /api/workspace/active-conversation`
   - [ ] `POST /api/workspace/start-conversation`
   - [ ] `POST /api/workspace/send-message/:id` (with file upload)
   - [ ] `PATCH /api/workspace/edit-message/:id` (10-min window check)
   - [ ] `DELETE /api/workspace/delete-message/:id` (soft delete, 10-min window)
   - [ ] `POST /api/workspace/commit/:id`
   - [ ] `GET /api/workspace/library`
   - [ ] `GET /api/workspace/library/:id`
4. [ ] Implement admin API endpoints:
   - [ ] `GET /api/admin/conversations`
   - [ ] `GET /api/admin/conversations/:id`
   - [ ] `POST /api/admin/conversations/:id/respond` (with file upload + email trigger)
   - [ ] `PATCH /api/admin/conversations/:id/summary`
   - [ ] `PATCH /api/admin/conversations/:id`
5. [ ] Implement email notification system (when admin responds)
6. [ ] Add RLS policies for new tables + storage bucket
7. [ ] Test all API endpoints with Postman/curl

**Verification**:
- All endpoints return correct responses
- Database constraints prevent multiple active conversations per user
- RLS policies work correctly (users can only see own conversations, admins see all)

---

### [ ] Phase 2: Frontend - Core Experience (8-10 hours)

**Tasks**:
1. [ ] Rebuild `app/index.html` structure (3-tab layout)
2. [ ] Implement first-time experience (initial message input + file upload)
3. [ ] Build Active tab:
   - [ ] Summary card component (read-only for users)
   - [ ] Message thread rendering (with "edited" labels, hide deleted)
   - [ ] Message input with file upload (drag-and-drop support)
   - [ ] Edit/delete buttons (show only within 10-min window)
   - [ ] Attachment display ("View file" links)
   - [ ] Message polling (every 5-10s, only fetch new messages)
   - [ ] Commit button logic
4. [ ] Implement tab navigation system
5. [ ] Update `js/workspace.js` with new core functions

**Verification**:
- First-time user can send initial message
- Active tab displays conversation thread correctly
- Messages appear in chronological order
- Tab switching works smoothly
- Summary card displays admin updates

---

### [ ] Phase 3: Frontend - Library & Settings (3-4 hours)

**Tasks**:
1. [ ] Build Library tab:
   - [ ] List of resolved conversations (with message count, attachments indicator)
   - [ ] Conversation detail view (read-only, with attachments)
   - [ ] Empty state when no resolved conversations
2. [ ] Update Settings tab:
   - [ ] Add email notifications toggle
   - [ ] Keep existing display name/email fields
3. [ ] Connect all tabs to new API endpoints

**Verification**:
- Library displays all resolved conversations
- Clicking conversation opens full read-only view
- Settings tab works for updating user profile

---

### [ ] Phase 4: Admin Panel Rebuild (6-8 hours)

**Tasks**:
1. [ ] Update `admin.html` for new conversation model
2. [ ] Implement admin conversation list view:
   - [ ] Display all active conversations
   - [ ] Show priority, last message, user info, attachment indicators
   - [ ] Filtering by status/priority
   - [ ] Show which admin last responded (multi-admin support)
3. [ ] Build admin conversation detail view:
   - [ ] Full message thread (including deleted messages, marked as "[deleted]")
   - [ ] Summary card editor (inline editing)
   - [ ] Message composer with tag selector + file upload
   - [ ] Priority and admin notes controls (visually distinct)
   - [ ] Display admin author names on each admin message
4. [ ] Update `js/admin.js` for new API integration

**Verification**:
- Admin can view all user conversations
- Admin can respond with tagged messages
- Admin can update summary cards
- Admin can set priority and internal notes

---

### [ ] Phase 5: Styling & Polish (4-6 hours)

**Tasks**:
1. [ ] Implement new CSS for conversation UI in `css/workspace.css`:
   - [ ] Message thread styles (with edited label, attachment links)
   - [ ] Summary card design
   - [ ] First-time experience
   - [ ] Library list
   - [ ] File upload UI (drag-and-drop zone)
   - [ ] Edit/delete button states (fade after 10 min)
2. [ ] Ensure mobile responsiveness (especially file uploads)
3. [ ] Add subtle animations (message send/receive, edit indicator)
4. [ ] Polish "calm, deliberate" aesthetic (slower transitions)
5. [ ] Remove all old decision framework styles

**Verification**:
- UI matches design vision from spec
- Responsive on mobile devices
- Animations feel smooth and subtle
- Overall feel is "serious, not chatty"

---

### [ ] Phase 6: Testing & Deployment (3-4 hours)

**Tasks**:
1. [ ] End-to-end testing:
   - [ ] User flow: first-time → send message with attachment → receive admin response → edit message → commit
   - [ ] Admin flow: view conversation → respond with attachment → update summary → user commits
   - [ ] Multiple users don't interfere with each other
   - [ ] Email notifications sent when admin responds
2. [ ] Test edge cases:
   - [ ] Attempting to create second active conversation (should fail)
   - [ ] Committing without final recommendation (should fail)
   - [ ] Editing message after 10-min window (should fail)
   - [ ] Deleting message after 10-min window (should fail)
   - [ ] File upload validation (type, size limits)
   - [ ] Long messages and special characters
   - [ ] Multiple admins responding to same conversation
3. [ ] Configure Supabase Storage bucket (public read for attachments)
4. [ ] Deploy backend API changes
5. [ ] Deploy frontend changes to Netlify
6. [ ] Monitor production for errors
7. [ ] Write completion report to `report.md`

**Verification**:
- Complete user journey works end-to-end
- File uploads work and are accessible
- Email notifications are delivered
- Edit/delete windows enforced correctly
- Multi-admin attribution works
- No console errors or API failures
- Data persists correctly
- Old decision framework completely removed
