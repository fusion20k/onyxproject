# Onyx Workspace Hub - Technical Specification

## Task Complexity: **Hard**

This is a substantial UI/UX redesign that requires:
- Complete visual overhaul of the workspace hub
- New component implementations (Clarity Momentum, Support Modal, Insights Page)
- Careful attention to premium design details
- Maintaining backend API compatibility
- Ensuring all existing functionality continues to work

---

## Technical Context

**Language**: Vanilla JavaScript (ES6+)  
**Dependencies**: None (pure HTML/CSS/JS)  
**Backend API**: Existing REST API endpoints (documented in WORKSPACE-BACKEND-SPEC.md)  
**Database**: Supabase PostgreSQL (no schema changes required)  
**Existing Architecture**:
- State-based UI rendering (`showState()` function)
- LocalStorage for session management
- Fetch API for backend communication

---

## Implementation Approach

### Design Philosophy
The redesign must embody:
- **Calm authority**: Minimal, deliberate UI with no clutter
- **Premium feel**: High-quality typography, spacing, subtle interactions
- **Single-screen priority**: Everything visible without scrolling on desktop
- **Focus discipline**: Only one active decision at a time

### Key Changes

#### 1. Remove Sidebar Navigation
- Current: Left sidebar with nav items (Workspace, Archive) and logout button
- New: Minimal header with product name and user info only
- Archive access moved to Insights page or secondary navigation

#### 2. Redesigned Header
- Product name: "Workspace" (left-aligned)
- User display: Name or initials (small, right-aligned)
- No navigation clutter
- Clean, serious typography

#### 3. Status Overview Cards (Productivity Reinforcement)
Transform existing stats:
- **Active Decisions**: Keep as-is (0 or 1)
- **Decisions Resolved**: Keep as-is (total count)
- **Avg. Resolution Time** → **Clarity Momentum**: New component
  - Simple text indicator: "Consistent", "Building", "Paused"
  - Based on recent activity cadence (algorithm defined below)

#### 4. Active Decision Panel (Primary Focus)
Current implementation is functional but needs visual enhancement:
- Make decision card more prominent (larger, better contrast)
- When active: Show title, status badge, timestamp, "Open Decision" button
- When empty: Clear empty state with "Start New Decision" button
- Improve card hover states and interaction feedback

#### 5. Actions Panel
Current buttons exist but need reorganization:
- **Start New Decision**: Disable when decision is active, show tooltip
- **Request Support**: New modal/flow (structured, not free-form)
- **View Insights**: New page/modal (read-only analytics)

#### 6. New: Support Request Flow
Create a modal or dedicated section:
- Reason dropdown: "Clarification", "Follow-up", "Priority concern"
- Short text field for details
- Routes to admin dashboard via new API endpoint (or existing feedback system)

#### 7. New: Insights Page
Lightweight analytics view:
- Total decisions resolved
- Average time to resolution (existing calculation)
- Decision categories (extract from decision titles/tags if available)
- Last resolved decision date
- Minimal charts, maximum white space

---

## Clarity Momentum Algorithm

**Definition**: A simple indicator of user activity consistency.

**Logic**:
```javascript
function calculateClarityMomentum(allDecisions) {
  const now = new Date();
  const last7Days = allDecisions.resolved.filter(d => {
    const resolved = new Date(d.resolved_at);
    return (now - resolved) < (7 * 24 * 60 * 60 * 1000);
  });
  
  const last30Days = allDecisions.resolved.filter(d => {
    const resolved = new Date(d.resolved_at);
    return (now - resolved) < (30 * 24 * 60 * 60 * 1000);
  });
  
  // Has active decision or resolved something in last 7 days
  if (allDecisions.active || last7Days.length > 0) {
    return "Consistent";
  }
  
  // Resolved something in last 30 days
  if (last30Days.length > 0) {
    return "Building";
  }
  
  // No recent activity
  return "Paused";
}
```

---

## Source Code Structure Changes

### Files to Modify

1. **app/index.html**
   - Remove sidebar structure (`workspace-sidebar`)
   - Simplify header to show "Workspace" + user info only
   - Add Support Request modal structure
   - Add Insights page/modal structure
   - Update hub stats card for Clarity Momentum
   - Enhance Active Decision Panel markup

2. **css/workspace.css**
   - Remove sidebar styles
   - Create new header styles (minimal, premium)
   - Design Clarity Momentum indicator styles
   - Enhance Active Decision Panel card styles (more prominent)
   - Add Support modal styles
   - Add Insights page styles
   - Improve overall spacing and typography for premium feel

3. **js/workspace.js**
   - Remove sidebar-related event listeners
   - Implement `calculateClarityMomentum()` function
   - Update `renderHub()` to show Clarity Momentum
   - Add Support Request modal handlers
   - Add Insights page rendering logic
   - Update header to show user name/initials
   - Add tooltip for disabled "Start New Decision" button

### New Components

#### Support Request Modal
```html
<div id="support-modal" class="support-modal" style="display: none;">
  <div class="support-modal-content">
    <h2>Request Support</h2>
    <form id="support-form">
      <label>Reason</label>
      <select id="support-reason">
        <option value="clarification">Clarification</option>
        <option value="follow-up">Follow-up</option>
        <option value="priority">Priority Concern</option>
      </select>
      <label>Details</label>
      <textarea id="support-details" required></textarea>
      <div class="support-actions">
        <button type="button" id="support-cancel">Cancel</button>
        <button type="submit">Send Request</button>
      </div>
    </form>
  </div>
</div>
```

#### Insights Page State
```html
<div id="insights-state" class="workspace-state" style="display: none;">
  <div class="workspace-header">
    <button id="back-to-hub-insights" class="workspace-back-btn">← Back</button>
    <h1 class="workspace-title">Insights</h1>
  </div>
  <div class="workspace-content">
    <div class="insights-grid">
      <div class="insight-card">
        <div class="insight-value" id="insights-resolved">0</div>
        <div class="insight-label">Decisions Resolved</div>
      </div>
      <div class="insight-card">
        <div class="insight-value" id="insights-avg-time">—</div>
        <div class="insight-label">Average Time to Resolution</div>
      </div>
      <div class="insight-card">
        <div class="insight-value" id="insights-last-resolved">—</div>
        <div class="insight-label">Last Resolved</div>
      </div>
    </div>
    <div class="insights-section">
      <h3>Recent Decisions</h3>
      <div id="insights-recent-list"></div>
    </div>
  </div>
</div>
```

---

## Data Model / API Changes

### No Backend Changes Required
All existing API endpoints remain unchanged:
- `/api/workspace/active-decision`
- `/api/workspace/create-decision`
- `/api/workspace/archive`
- etc.

### Support Request Handling
Two options:
1. **Option A**: Use existing feedback system (`/api/workspace/add-feedback/:decision_id`)
   - Pro: No new endpoint needed
   - Con: Requires active decision
   
2. **Option B**: Create new endpoint `/api/workspace/support-request`
   - Pro: Works without active decision
   - Con: Requires backend changes

**Recommendation**: Option A for MVP, use feedback system when decision is active. For users without active decision, disable the support button or show a message to create a decision first.

---

## Visual Design Specifications

### Typography
- **Product Name**: 2rem, font-weight 600, letter-spacing 0.05em
- **Headers**: 1.5rem, font-weight 400
- **Body**: 0.9375rem, line-height 1.6
- **Stats Values**: 2.5rem, font-weight 300

### Color Palette (Premium Neutral)
- **Background**: #000000
- **Surface**: #0a0a0a
- **Border**: #1a1a1a
- **Text Primary**: #ffffff
- **Text Secondary**: #888888
- **Text Tertiary**: #666666
- **Accent (minimal use)**: #ffffff with 10% opacity

### Spacing
- **Section gaps**: 60px vertical
- **Card padding**: 40px
- **Card gaps**: 24px
- **Button padding**: 14px 32px

### Interactions
- Subtle hover states (no bold color changes)
- Smooth transitions (200ms ease)
- Minimal shadows (use borders instead)
- Focus states for accessibility

---

## Verification Approach

### Manual Testing
1. **Hub View**
   - Verify Status Overview displays correctly
   - Check Clarity Momentum indicator shows correct state
   - Confirm Active Decision Panel shows/hides appropriately
   - Test "Start New Decision" disables when decision is active

2. **Support Request**
   - Modal opens/closes correctly
   - Form validation works
   - Request sends to backend (or shows appropriate message)

3. **Insights Page**
   - Displays correct metrics
   - Shows recent decisions list
   - Back navigation works

4. **Responsive Design**
   - Desktop: Single-screen layout (no scrolling)
   - Tablet: Slight scroll acceptable
   - Mobile: Stacked layout with scroll

### Browser Testing
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Accessibility
- Keyboard navigation works
- Focus indicators visible
- Screen reader compatibility (semantic HTML)
- Sufficient color contrast (WCAG AA)

---

## Implementation Phases

### Phase 1: Core Structure (Foundation)
1. Remove sidebar from HTML/CSS
2. Create new minimal header
3. Update existing hub stats to support Clarity Momentum
4. Enhance Active Decision Panel styling

### Phase 2: New Features
1. Implement Support Request modal (UI + logic)
2. Create Insights page (UI + logic)
3. Add tooltips and disabled states

### Phase 3: Polish & Testing
1. Refine typography and spacing
2. Add transitions and hover states
3. Test all user flows
4. Responsive adjustments
5. Accessibility audit

---

## Success Criteria

- [ ] Hub fits on one screen (desktop, 1920x1080)
- [ ] All existing functionality works (create decision, view archive, etc.)
- [ ] Clarity Momentum displays correct indicator
- [ ] Support Request flow is functional
- [ ] Insights page displays accurate data
- [ ] Design feels premium, calm, and professional
- [ ] No console errors
- [ ] Works across major browsers
- [ ] Keyboard accessible
- [ ] Existing backend integration intact
