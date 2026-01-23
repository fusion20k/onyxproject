# Technical Specification: Onyx Decision Mastermind Transformation

## Task Complexity: HARD

This is a complete architectural transformation from an "async coaching chat" model to a "decision simulation engine" model.

---

## 1. Technical Context

### Current Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (no framework)
- **Backend**: Express.js (Node.js) hosted on Render.com
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Hosting**: Netlify (static frontend)
- **API Pattern**: RESTful, token-based auth (Bearer tokens)

### Current Model (To Be Replaced)
- Async conversation threads (like support chat)
- One active conversation per user
- Messages with admin responses
- Summary cards maintained by admins
- Resolved conversations in library

### New Model (Decision Mastermind)
- Single decision analysis per user at a time
- Structured decision extraction from free-form text
- Automated stress testing of options
- AI-generated recommendations with reasoning
- Decision portfolio/library

---

## 2. Implementation Approach

### Phase 1: Database Schema Changes
Transform the data model from conversations → decisions with structured analysis.

#### New Table: `decisions`
Replace `conversations` table with structured decision model:
```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core decision data
  title TEXT NOT NULL,
  raw_input TEXT NOT NULL, -- User's original description
  status TEXT NOT NULL DEFAULT 'analyzing', -- 'analyzing', 'ready', 'committed'
  
  -- Extracted understanding
  goal TEXT,
  primary_metric TEXT,
  time_horizon TEXT,
  constraints TEXT[],
  risk_tolerance TEXT, -- 'conservative', 'balanced', 'aggressive'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  committed_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin override fields
  admin_notes TEXT,
  manually_reviewed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_decisions_user_id ON decisions(user_id);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_user_active ON decisions(user_id, status) 
  WHERE status IN ('analyzing', 'ready');

-- Enforce one active decision per user
CREATE UNIQUE INDEX idx_one_active_decision_per_user 
ON decisions(user_id) 
WHERE status IN ('analyzing', 'ready');
```

#### New Table: `decision_options`
Store options and their analysis:
```sql
CREATE TABLE decision_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  
  -- Option details
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0, -- For ordering (A, B, C...)
  
  -- Stress test results
  upside TEXT,
  downside TEXT,
  key_assumptions TEXT[],
  fragility_score TEXT, -- 'fragile', 'balanced', 'robust'
  
  -- Simulation metrics
  success_probability DECIMAL(5,2), -- 0.00 to 100.00
  constraint_violation_risk DECIMAL(5,2),
  assumption_sensitivity DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_options_decision ON decision_options(decision_id, position);
```

#### New Table: `decision_recommendations`
Store Onyx's recommendations:
```sql
CREATE TABLE decision_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  recommended_option_id UUID REFERENCES decision_options(id),
  
  -- Recommendation content
  reasoning TEXT NOT NULL,
  why_not_alternatives TEXT, -- Comparison to other options
  
  -- User response
  user_committed BOOLEAN DEFAULT FALSE,
  user_note TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_one_recommendation_per_decision 
ON decision_recommendations(decision_id);
```

#### New Table: `decision_followups`
Optional conversation thread for clarifications:
```sql
CREATE TABLE decision_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL, -- 'user' or 'system'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_followups_decision ON decision_followups(decision_id, created_at);
```

### Phase 2: Backend API Changes

#### New Endpoints for Decision Flow

**POST /api/decisions/create**
- Accept raw decision text (2-5 paragraphs)
- Extract structured decision components using AI
- Create decision + options + initial analysis
- Return decision ID

**GET /api/decisions/active**
- Return current active decision with all analysis
- Include: understanding, options, stress tests, recommendation

**POST /api/decisions/:id/confirm-understanding**
- User confirms or edits extracted understanding
- Update decision fields
- Trigger recommendation generation

**POST /api/decisions/:id/ask-followup**
- Add user question to followup thread
- Return AI response (optional in v1)

**POST /api/decisions/:id/commit**
- Mark decision as committed
- Store user's final note
- Move to library

**GET /api/decisions/library**
- Return all committed decisions
- Include: title, date, outcome status

**GET /api/decisions/library/:id**
- Return full read-only decision detail

#### AI Integration Layer

New backend service: `services/decisionAnalyzer.js`
- **extractUnderstanding()** - Parse raw text → structured fields
- **generateOptions()** - Identify decision options from input
- **runStressTests()** - Simulate scenarios for each option
- **generateRecommendation()** - Analyze best robust option
- **answerFollowup()** - Handle user questions

AI Provider Options:
1. **OpenAI GPT-4** (recommended) - Best reasoning
2. **Anthropic Claude** (alternative) - Good for long context
3. **Local fallback** - Template-based for development

### Phase 3: Frontend UI Transformation

#### Screen 1: New Decision (`/app/new-decision.html`)
New file. Full-width capture screen.

**Components:**
- Large textarea with inline guidance
- Helper text (2-5 paragraphs suggestion)
- "Analyze this decision" button
- Loading state during analysis

**Flow:**
1. User pastes decision context
2. Submit → POST /api/decisions/create
3. Redirect to workspace with decision ID

#### Screen 2: Decision Workspace (`/app/workspace.html`)
Completely redesign existing workspace.

**Layout:**
- Left column (2/3 width): Main content
- Right sidebar (1/3 width): Summary card

**Left Column - 3 Stacked Cards:**

1. **Understanding Card**
   - Title: "Onyx's understanding of your situation"
   - Bullet list: Goal, time horizon, constraints, options
   - Actions: "This looks right" / "Edit details"
   - Edit mode: Inline form fields

2. **Stress Tests Card**
   - Title: "How your options behave under stress"
   - For each option:
     - Option name (A, B, C...)
     - Upside (1 sentence)
     - Downside (1 sentence)
     - Key assumptions (2-3 bullets)
     - Fragility tag badge
   - Info text: "Onyx perturbed assumptions ±30-50%"

3. **Recommendation Card**
   - Title: "Onyx's recommendation"
   - Highlighted option name
   - 2-3 sentence reasoning
   - "Commit to this plan" button
   - "Show me why not X" link (expands comparison)

**Right Sidebar:**
- Compact summary
- Fields: Goal, time horizon, primary metric, risk tolerance
- Outcome tracker area (empty until committed)

**Bottom Section (Optional v1):**
- Simple followup thread
- Input: "Ask Onyx a follow-up"

#### Screen 3: Library (`/app/library.html`)
Simplified list view.

**Layout:**
- Title: "Decision library"
- Subtitle: "Your past decisions, with reasoning and outcomes"
- List of decisions:
  - Decision title
  - Meta: Committed date, outcome status
  - "Open" link → detail modal

**Detail Modal:**
- Read-only view of full decision
- All cards from workspace
- Committed recommendation
- Outcome note (if added)

### Phase 4: Landing Page Updates

Update messaging on `/index.html`:
- Change "private workspace" → "decision stress-test engine"
- Update problem section to focus on decision confidence
- Update "How It Works" to reflect new flow
- Update value prop: "For people who cannot afford to guess wrong"

### Phase 5: Data Migration & Cleanup

**Migration Strategy:**
1. Deploy new schema alongside old tables
2. No data migration (clean break)
3. Keep old `conversations`/`messages` tables for 30 days
4. Drop old tables after verification

**Cleanup:**
- Remove unused conversation-related endpoints
- Remove admin messaging features
- Keep auth, payment, invite flows unchanged

---

## 3. Files to Create

### Backend
- `/services/decisionAnalyzer.js` - AI analysis service
- `/routes/decisions.js` - New decision endpoints
- `/models/Decision.js` - Decision model
- `/models/DecisionOption.js` - Option model
- `/models/DecisionRecommendation.js` - Recommendation model
- `/migrations/010_decision_tables.sql` - New schema

### Frontend
- `/app/new-decision.html` - New decision capture screen
- `/css/new-decision.css` - Styles for new decision screen
- `/js/new-decision.js` - New decision logic
- `/css/decision-workspace.css` - New workspace styles (replaces workspace.css)
- `/js/decision-workspace.js` - New workspace logic (replaces workspace.js)
- `/app/library.html` - New library screen
- `/css/library.css` - Library styles
- `/js/library.js` - Library logic

---

## 4. Files to Modify

### Frontend
- `/app/index.html` - Completely redesign workspace layout
- `/index.html` - Update landing page messaging
- `/css/style.css` - Add new component styles
- `/_redirects` - Add new routes

### Backend
- `/server.js` - Add decision routes
- `/package.json` - Add AI SDK dependencies
- `/config.js` - Add AI API keys

---

## 5. Dependencies to Add

### Backend
```json
{
  "openai": "^4.20.0",  // or "@anthropic-ai/sdk" for Claude
  "zod": "^3.22.0"       // For input validation
}
```

### Frontend
No new dependencies (vanilla JS approach maintained)

---

## 6. Verification Approach

### Backend Tests
1. Decision creation endpoint validation
2. AI extraction service unit tests
3. Stress test simulation accuracy
4. Recommendation generation logic

### Frontend Tests
1. Manual testing of each screen
2. Decision flow end-to-end
3. Edit/commit interactions
4. Library view

### Integration Tests
1. Full decision journey: create → analyze → commit → library
2. Multiple decisions over time
3. Edge cases: empty options, unclear input

### Manual Verification
1. Create test decision with real scenarios
2. Verify AI extraction quality
3. Check recommendation reasoning
4. Test library persistence

---

## 7. Risk Factors & Mitigations

### High Risk: AI Quality
**Risk:** AI extracts wrong understanding or poor recommendations
**Mitigation:** 
- Allow user to edit all extracted fields
- Show AI confidence scores
- Admin review flag for manual override

### Medium Risk: User Confusion
**Risk:** Users expect old conversation model
**Mitigation:**
- Clear onboarding copy
- Example decision on first load
- Help text throughout

### Medium Risk: Performance
**Risk:** AI analysis takes too long (10-30s)
**Mitigation:**
- Clear loading states
- Background job processing
- Webhook for completion notification

### Low Risk: Data Loss
**Risk:** Old conversations inaccessible
**Mitigation:**
- Export old data before migration
- Keep old tables for 30 days
- Provide data export endpoint

---

## 8. Success Criteria

### Functional
- [ ] User can create decision from free-form text
- [ ] AI extracts structured understanding
- [ ] Stress tests show for each option
- [ ] Recommendation displays with reasoning
- [ ] User can commit decision
- [ ] Library shows past decisions

### Non-Functional
- [ ] Decision analysis completes in <30 seconds
- [ ] UI feels premium and focused
- [ ] No conversation artifacts remain
- [ ] All old endpoints return 404 or redirect

### Business
- [ ] Messaging aligns with $100/month value prop
- [ ] Premium feel maintained
- [ ] Clear differentiation from chat/journaling apps
