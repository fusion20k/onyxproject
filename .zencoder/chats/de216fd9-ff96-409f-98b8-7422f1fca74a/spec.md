# Technical Specification: Onyx Landing Page

## Difficulty Level
**Medium** - New project with multiple sections, strict design requirements, and form integration.

## Technical Context

### Technology Stack
- **HTML5** for structure
- **CSS3** for styling (custom CSS, no frameworks to maintain clean, minimal aesthetic)
- **Vanilla JavaScript** for minimal interactions (form validation)
- **Static hosting** ready (no backend required initially)

### Dependencies
- None (pure HTML/CSS/JS for maximum control and minimal bloat)
- Form submission can use:
  - Option 1: Formspree/Netlify Forms (recommended for MVP)
  - Option 2: Custom backend endpoint (future consideration)

## Implementation Approach

### Project Structure
```
onyx/
├── index.html          # Main landing page
├── css/
│   └── style.css      # All styles
├── js/
│   └── main.js        # Form validation and minimal interactions
└── assets/
    └── (future images/icons if needed)
```

### Design Implementation Strategy

**Typography:**
- Primary: System monospace fonts (Consolas, Monaco, 'Courier New')
- Fallback: Use web-safe monospace fonts
- Consider: JetBrains Mono or IBM Plex Mono via Google Fonts for better consistency

**Color Scheme:**
- Background: `#000000` (pure black)
- Text: `#FFFFFF` (pure white)
- Accents: `#333333` for subtle borders/dividers
- CTA hover: Subtle white highlight (`#1a1a1a` background)

**Layout:**
- Max width: 800px centered
- Generous vertical spacing (80-120px between sections)
- Horizontal padding: 40px on desktop, 20px on mobile
- Mobile-first responsive design

### Component Breakdown

#### 1. Above-the-Fold Section
- Centered layout
- Large headline (32-40px)
- Subheadline (16-18px, reduced opacity)
- Single CTA button (minimal, bordered style)

#### 2. Problem Framing Section
- Section title
- Bullet list with custom styling
- Transition sentence

#### 3. What Onyx Is/Is Not Section
- Two-column grid (desktop)
- Stacked layout (mobile)
- Lists with clear visual separation

#### 4. How It Works Section
- Numbered list (1-5)
- Custom counter styling
- End statement

#### 5. Value Justification Section
- Bullet points
- Anchor statement (emphasized)

#### 6. Access & Curation Section
- Text block with emphasis
- No lists

#### 7. Pricing Section
- Large pricing display
- Supporting text
- Filter statement

#### 8. Final CTA Section
- Centered CTA button
- Subtext below

### Form Implementation

**Application Form (Modal or Separate Page):**
- Fields:
  - Name (text, required)
  - Email (email, required)
  - Current role (text, required)
  - Why applying (textarea, required)
  - Project/company (text, optional)
- Validation: Client-side + server-side
- Submission: POST to form service endpoint
- Success: Simple confirmation message
- No fancy animations

## Source Code Structure

### Files to Create

1. **index.html**
   - Semantic HTML5 structure
   - Meta tags for SEO (minimal, no fluff)
   - Structured sections matching spec order
   - Application form (modal or inline)

2. **css/style.css**
   - CSS reset/normalize
   - Typography definitions
   - Layout grid system
   - Component styles
   - Responsive breakpoints
   - Subtle transitions only

3. **js/main.js**
   - Form validation
   - Modal controls (if modal approach)
   - Scroll behavior (minimal)
   - No tracking/analytics initially

### Data Model / API / Interface Changes

**Form Data Structure:**
```json
{
  "name": "string",
  "email": "string (validated)",
  "role": "string",
  "reason": "string (textarea)",
  "project": "string (optional)"
}
```

**Form Endpoint:**
- Method: POST
- Content-Type: application/json or application/x-www-form-urlencoded
- Response: 200 OK or error message

## Verification Approach

### Testing Checklist

1. **Visual Testing:**
   - [ ] Check all sections render correctly
   - [ ] Verify typography hierarchy
   - [ ] Test responsive breakpoints (mobile, tablet, desktop)
   - [ ] Ensure proper spacing and alignment
   - [ ] Verify color contrast

2. **Functional Testing:**
   - [ ] Form validation works (required fields)
   - [ ] Email validation works
   - [ ] Form submission success/error handling
   - [ ] CTA buttons are clickable
   - [ ] Modal opens/closes correctly (if applicable)

3. **Content Testing:**
   - [ ] All copy matches specification exactly
   - [ ] Section order is correct
   - [ ] No typos or formatting issues

4. **Performance Testing:**
   - [ ] Page loads quickly (<1s)
   - [ ] No unnecessary JavaScript
   - [ ] Minimal CSS bloat
   - [ ] Images optimized (if any added)

5. **Browser Testing:**
   - [ ] Chrome/Edge
   - [ ] Firefox
   - [ ] Safari (if available)
   - [ ] Mobile browsers

6. **Accessibility:**
   - [ ] Proper heading hierarchy (h1, h2, etc.)
   - [ ] Form labels associated
   - [ ] Keyboard navigation works
   - [ ] Focus states visible

### Manual Verification Steps

1. Open index.html in browser
2. Scroll through entire page
3. Test form submission
4. Resize browser window to test responsive design
5. Test with browser dev tools for console errors

## Success Criteria

- Page matches specification exactly
- No design frameworks detected
- Clean, minimal code
- Form works and validates
- Fully responsive
- Passes all verification tests
- Reads like "infrastructure, not marketing"
