# Onyx Workspace - Backend Specification

## Database Schema

### Table: `decisions`

Stores decision threads for each user.

```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated from first 50 chars of situation
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, under_review, responded, resolved
  priority INTEGER DEFAULT 0, -- Admin-set priority
  
  -- Decision sections
  situation TEXT NOT NULL,
  context TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  risks TEXT,
  unknowns TEXT,
  
  -- Resolution
  final_direction TEXT,
  reasoning TEXT,
  next_steps TEXT[],
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_decisions_user_id ON decisions(user_id);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_created_at ON decisions(created_at DESC);
```

### Table: `decision_feedback`

Stores feedback responses in decision threads.

```sql
CREATE TABLE decision_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_type TEXT NOT NULL, -- 'user' or 'admin'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_decision_id ON decision_feedback(decision_id);
CREATE INDEX idx_feedback_created_at ON decision_feedback(created_at);
```

---

## API Endpoints

### User Workspace Endpoints

#### **GET /api/workspace/active-decision**

Get the user's active decision thread (if any).

**Auth**: Required (Bearer token)

**Response** (200):
```json
{
  "decision": {
    "id": "uuid",
    "title": "string",
    "status": "in_progress|under_review|responded|resolved",
    "situation": "string",
    "context": "string|null",
    "option_a": "string|null",
    "option_b": "string|null",
    "option_c": "string|null",
    "risks": "string|null",
    "unknowns": "string|null",
    "final_direction": "string|null",
    "reasoning": "string|null",
    "next_steps": ["string"],
    "created_at": "timestamp",
    "updated_at": "timestamp"
  },
  "feedback": [
    {
      "id": "uuid",
      "author_type": "admin|user",
      "content": "string",
      "created_at": "timestamp"
    }
  ]
}
```

**Response** (404): No active decision


#### **POST /api/workspace/create-decision**

Create a new decision thread (first-time or after resolution).

**Auth**: Required

**Body**:
```json
{
  "situation": "string (required, min 20 chars)"
}
```

**Response** (201):
```json
{
  "decision_id": "uuid",
  "status": "in_progress"
}
```

**Error** (409): User already has an active decision


#### **PATCH /api/workspace/update-decision/:id**

Update decision sections.

**Auth**: Required (must own decision)

**Body**:
```json
{
  "context": "string",
  "option_a": "string",
  "option_b": "string",
  "option_c": "string",
  "risks": "string",
  "unknowns": "string"
}
```

**Logic**:
- If all required fields filled (context, option_a, option_b, risks, unknowns), auto-change status to `under_review`

**Response** (200):
```json
{
  "success": true,
  "status": "in_progress|under_review"
}
```


#### **POST /api/workspace/add-feedback/:decision_id**

Add user feedback/response to decision thread.

**Auth**: Required

**Body**:
```json
{
  "content": "string (required)"
}
```

**Response** (201):
```json
{
  "feedback_id": "uuid"
}
```


#### **POST /api/workspace/resolve-decision/:id**

Mark decision as resolved with summary.

**Auth**: Required (must own decision)

**Body**:
```json
{
  "final_direction": "string (required)",
  "reasoning": "string (required)",
  "next_steps": ["string", "string", "string"]
}
```

**Response** (200):
```json
{
  "success": true,
  "resolved_at": "timestamp"
}
```


#### **GET /api/workspace/archive**

Get list of user's resolved decisions.

**Auth**: Required

**Response** (200):
```json
{
  "decisions": [
    {
      "id": "uuid",
      "title": "string",
      "status": "resolved",
      "resolved_at": "timestamp",
      "created_at": "timestamp"
    }
  ]
}
```


#### **GET /api/workspace/archive/:id**

Get full read-only view of archived decision.

**Auth**: Required (must own decision)

**Response** (200):
```json
{
  "decision": { /* full decision object */ },
  "feedback": [ /* all feedback */ ]
}
```

---

### Admin Dashboard Endpoints

#### **GET /api/admin/decisions**

Get all decision threads with filtering.

**Auth**: Required (admin only)

**Query params**:
- `status` (optional): filter by status
- `user_id` (optional): filter by user

**Response** (200):
```json
{
  "decisions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_email": "string",
      "user_name": "string",
      "title": "string",
      "status": "string",
      "priority": 0,
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "feedback_count": 3
    }
  ]
}
```


#### **GET /api/admin/decisions/:id**

Get full decision thread (admin view).

**Auth**: Required (admin only)

**Response** (200):
```json
{
  "decision": { /* full decision object */ },
  "user": {
    "id": "uuid",
    "email": "string",
    "display_name": "string"
  },
  "feedback": [ /* all feedback with full details */ ]
}
```


#### **POST /api/admin/decisions/:id/respond**

Admin responds to decision thread.

**Auth**: Required (admin only)

**Body**:
```json
{
  "content": "string (required)"
}
```

**Logic**:
- Automatically changes status to `responded` if currently `under_review`

**Response** (201):
```json
{
  "feedback_id": "uuid"
}
```


#### **PATCH /api/admin/decisions/:id**

Update decision status/priority (admin only).

**Auth**: Required (admin only)

**Body**:
```json
{
  "status": "in_progress|under_review|responded|resolved",
  "priority": 0
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

## RLS Policies

### `decisions` table

```sql
-- Users can view their own decisions
CREATE POLICY "Users can view own decisions"
ON decisions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own decisions
CREATE POLICY "Users can create decisions"
ON decisions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own decisions (except resolved ones)
CREATE POLICY "Users can update own decisions"
ON decisions FOR UPDATE
USING (auth.uid() = user_id AND status != 'resolved');

-- Admins can view all decisions
CREATE POLICY "Admins view all decisions"
ON decisions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can update all decisions
CREATE POLICY "Admins update all decisions"
ON decisions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);
```

### `decision_feedback` table

```sql
-- Users can view feedback on their own decisions
CREATE POLICY "Users view own decision feedback"
ON decision_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM decisions
    WHERE id = decision_id
    AND user_id = auth.uid()
  )
);

-- Users can insert feedback on their own decisions
CREATE POLICY "Users add own decision feedback"
ON decision_feedback FOR INSERT
WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM decisions
    WHERE id = decision_id
    AND user_id = auth.uid()
  )
);

-- Admins can view all feedback
CREATE POLICY "Admins view all feedback"
ON decision_feedback FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can add feedback to any decision
CREATE POLICY "Admins add feedback to any decision"
ON decision_feedback FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid() AND
  author_type = 'admin' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);
```
