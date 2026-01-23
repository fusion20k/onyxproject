# Spec and build

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:

- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### ✅ Step: Technical Specification

**Complexity Assessment: HARD**

This is a complete architectural transformation from an "async coaching chat" to a "decision simulation engine".

Technical specification created in `spec.md` covering:
- Current vs new architecture
- Database schema changes (4 new tables)
- Backend API changes (7 new endpoints)
- Frontend UI transformation (3 redesigned screens)
- AI integration layer
- Data migration strategy
- Risk factors and mitigations

---

---

## Implementation Phases

### [ ] Phase 1: Database Schema & Backend Foundation

#### [ ] Task 1.1: Create New Database Schema
- Create migration file with new tables: `decisions`, `decision_options`, `decision_recommendations`, `decision_followups`
- Add indexes and constraints
- Test constraint enforcement (one active decision per user)
- **Verify:** Schema successfully created in Supabase

#### [ ] Task 1.2: Build Decision Analyzer Service
- Create `services/decisionAnalyzer.js` with AI integration (OpenAI/Claude)
- Implement `extractUnderstanding()` - parse raw text to structured fields
- Implement `generateOptions()` - identify options from input
- Implement `runStressTests()` - simulate scenarios for each option
- Implement `generateRecommendation()` - select most robust option
- **Verify:** Unit tests for each analyzer function

#### [ ] Task 1.3: Create Decision API Endpoints
- POST `/api/decisions/create` - Create new decision from raw text
- GET `/api/decisions/active` - Get current active decision with full analysis
- POST `/api/decisions/:id/confirm-understanding` - Update extracted fields
- POST `/api/decisions/:id/commit` - Mark decision as committed
- GET `/api/decisions/library` - Get all committed decisions
- GET `/api/decisions/library/:id` - Get single decision detail
- **Verify:** API tests for all endpoints

---

### [ ] Phase 2: Frontend - New Decision Screen

#### [ ] Task 2.1: Create New Decision Capture Screen
- Create `/app/new-decision.html` with large textarea input
- Create `/css/new-decision.css` with centered, premium styling
- Create `/js/new-decision.js` with form submission logic
- Add inline guidance text (what to include)
- Add loading state during analysis
- **Verify:** Can submit decision text and redirect to workspace

#### [ ] Task 2.2: Add Navigation to New Decision Screen
- Update workspace header to show "New Decision" button when no active decision
- Add route in `_redirects` for `/app/new-decision`
- **Verify:** Can navigate to new decision screen from workspace

---

### [ ] Phase 3: Frontend - Decision Workspace Redesign

#### [ ] Task 3.1: Create Understanding Card Component
- Build "Onyx's understanding" card in workspace
- Display: Goal, time horizon, constraints, options (as bullets)
- Add "This looks right" button
- Add "Edit details" button → inline edit mode
- **Verify:** Card displays extracted understanding correctly

#### [ ] Task 3.2: Create Stress Tests Card Component
- Build "How options behave under stress" card
- For each option show: upside, downside, assumptions, fragility badge
- Add info text about perturbation method
- Style fragility tags (fragile=red, balanced=yellow, robust=green)
- **Verify:** All options display with stress test results

#### [ ] Task 3.3: Create Recommendation Card Component
- Build "Onyx's recommendation" card
- Highlight recommended option
- Display 2-3 sentence reasoning
- Add "Commit to this plan" button
- Add "Show me why not X" expandable section
- **Verify:** Recommendation displays with clear reasoning

#### [ ] Task 3.4: Create Right Sidebar Summary
- Build compact decision summary card
- Display: Goal, time horizon, primary metric, risk tolerance
- Add outcome tracker section (empty until committed)
- **Verify:** Summary updates when understanding changes

#### [ ] Task 3.5: Add Optional Followup Thread
- Add simple conversation thread at bottom
- Input: "Ask Onyx a follow-up"
- Display previous followups
- **Verify:** Can ask questions and receive responses

#### [ ] Task 3.6: Implement Workspace JavaScript Logic
- Create `/js/decision-workspace.js` replacing old workspace.js
- Load active decision on page load
- Handle understanding confirmation/editing
- Handle commit action
- Handle followup questions
- **Verify:** Full workspace flow works end-to-end

#### [ ] Task 3.7: Style Decision Workspace
- Create `/css/decision-workspace.css`
- Implement 2/3 + 1/3 layout
- Style all cards with premium feel
- Add responsive breakpoints
- **Verify:** Workspace looks premium and focused

---

### [ ] Phase 4: Frontend - Library Screen

#### [ ] Task 4.1: Create Library List View
- Create `/app/library.html` or redesign library tab
- Display list of committed decisions
- Show: Title, committed date, outcome status
- Add "Open" link for each decision
- **Verify:** Library shows all past decisions

#### [ ] Task 4.2: Create Library Detail Modal
- Build read-only decision detail modal
- Display full decision with all cards
- Show committed recommendation
- Show outcome note if exists
- **Verify:** Can view past decision details

#### [ ] Task 4.3: Style Library Screen
- Create `/css/library.css`
- Clean, minimal list styling
- Modal overlay for detail view
- **Verify:** Library feels like a "decision portfolio"

---

### [ ] Phase 5: Landing Page & Messaging Updates

#### [ ] Task 5.1: Update Landing Page Copy
- Change hero headline to "decision stress-test engine"
- Update problem section: focus on decision confidence
- Update "How It Works" to reflect new flow
- Update value prop messaging
- **Verify:** Landing page aligns with new positioning

#### [ ] Task 5.2: Update Meta Tags & SEO
- Update page title and description
- Update OG tags for social sharing
- **Verify:** Metadata reflects new purpose

---

### [ ] Phase 6: Testing & Cleanup

#### [ ] Task 6.1: End-to-End Testing
- Test full decision flow: create → analyze → edit → commit → library
- Test multiple decisions over time
- Test edge cases: unclear input, empty fields
- **Verify:** All flows work smoothly

#### [ ] Task 6.2: Remove Old Conversation Features
- Comment out old conversation endpoints (keep for rollback)
- Remove admin messaging UI
- Clean up unused CSS/JS
- **Verify:** No conversation artifacts visible to users

#### [ ] Task 6.3: Migration & Deployment Prep
- Document database migration steps
- Create backup of old conversation data
- Prepare deployment checklist
- **Verify:** Safe rollback plan exists

---

### [ ] Phase 7: Final Report

After completion, document in `report.md`:
- What was implemented
- AI quality assessment
- User experience testing results
- Known issues or limitations
- Recommendations for v1.1
