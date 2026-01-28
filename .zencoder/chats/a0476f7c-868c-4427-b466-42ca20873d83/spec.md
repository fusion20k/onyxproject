# Technical Specification: Onyx Complete Transformation

## Complexity Assessment: **HARD**

This is a complete product transformation requiring:
- Full rebrand and messaging overhaul
- Complete workspace functionality replacement
- New authentication flow (from application-based to instant signup)
- New payment integration (trial-based subscriptions)
- Extensive security architecture
- New admin capabilities

## Current State Analysis

**Tech Stack:**
- Frontend: Vanilla HTML/CSS/JS
- Hosting: Netlify (with form handling)
- 3D Graphics: Spline viewer
- Current Flow: Application → Manual Review → Access → Payment → Workspace

**Current Structure:**
- `index.html` - Landing page with application form
- `app/index.html` - Workspace for decision stress-testing
- `admin.html` - Admin panel for application review and decision monitoring
- Backend: Separate system (Firebase/custom backend based on BACKEND-REQUIREMENTS.md)

## Transformation Scope

### Phase 1: Landing Page Transformation
- Replace "Decision Stress-Test Engine" messaging with "Autonomous Outreach Co-Founder"
- Remove application form, add "Start Free Trial" CTA
- Update hero section, value propositions, and all copy
- Add pricing tiers section
- Update meta descriptions and SEO

### Phase 2: Workspace Complete Rebuild
- Remove decision stress-testing functionality
- Build new dashboard with:
  - Command Center (status, metrics, daily summary)
  - Pipeline Management (Kanban-style lead stages)
  - Campaign Configuration (ICP builder, messaging templates)
  - Analytics Hub (performance charts, ROI calculator)
  - Co-Founder Interface (conversation viewer, manual controls)

### Phase 3: Onboarding Flow
- Welcome tour system
- Business profile setup
- ICP configuration wizard
- Channel connection interface
- Launch confirmation

### Phase 4: Admin Panel Updates
- User management dashboard
- Trial status tracking
- System monitoring
- Revenue analytics
- Impersonation mode

### Phase 5: Authentication & Security
- Direct signup (no application)
- Session management
- Role-based access control
- Payment integration updates

## Implementation Approach

Given the size and complexity, this will be broken into **frontend phases** with corresponding backend requirements documented separately.

### Frontend Architecture Decisions

**Keep:**
- Vanilla HTML/CSS/JS (no framework overhead for now)
- Netlify hosting
- Current file structure pattern

**Add:**
- Modular component system for dashboard
- Real-time update simulation (WebSocket placeholder)
- Enhanced routing for workspace sections

**Change:**
- Complete UI/UX redesign
- New CSS architecture (component-based)
- Enhanced JavaScript organization (modules)

## Data Model Changes (Frontend State)

**User State:**
```javascript
{
  id: string,
  email: string,
  name: string,
  trialStatus: 'active' | 'expired',
  trialDaysRemaining: number,
  subscriptionTier: 'solo' | 'team' | 'agency',
  onboardingComplete: boolean
}
```

**Dashboard State:**
```javascript
{
  metrics: {
    activeConversations: number,
    replyRate: number,
    qualifiedLeads: number
  },
  pipeline: {
    new: Lead[],
    engaged: Lead[],
    qualified: Lead[],
    ready: Lead[]
  },
  campaign: {
    icp: ICP,
    templates: Template[],
    sequence: Sequence[]
  }
}
```

## Verification Approach

**Per Phase:**
1. Visual inspection of UI changes
2. Functionality testing (manual interaction)
3. Responsive design verification
4. Cross-browser testing (Chrome, Firefox, Safari)

**Final:**
1. Full user flow walkthrough
2. Performance audit (load times, asset sizes)
3. SEO verification (meta tags, structured data)
4. Accessibility check (WCAG basics)

## Backend Requirements

All backend changes will be documented in a separate file for the backend team, including:
- New authentication endpoints (signup vs. application)
- Trial management system
- Subscription handling (Stripe integration)
- Real-time data endpoints for dashboard
- Campaign configuration storage
- Pipeline/lead management APIs

## Risk Factors

1. **Scope Creep**: This is massive - strict phase adherence required
2. **Backend Dependencies**: Many frontend features need real backend
3. **User Migration**: Existing users need migration plan
4. **Data Loss**: Current decision data preservation strategy needed
5. **SEO Impact**: Major content changes could affect rankings

## Success Criteria

- [ ] Landing page completely rebranded and functional
- [ ] New workspace provides clear value preview
- [ ] Onboarding flow is intuitive and complete
- [ ] Admin panel supports new business model
- [ ] All existing users can access transformed system
- [ ] No broken links or missing assets
- [ ] Page load times < 3 seconds
- [ ] Mobile responsive across all pages
