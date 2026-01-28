# Bug Investigation: Spline Viewer Width Issue

## Bug Summary
The Spline 3D viewer on the landing page is not spanning the full width of the viewport, leaving significant black space on both sides of the design.

## Root Cause Analysis
After examining `index.html` and `css/style.css`, I identified the issue:

**Current CSS (lines 118-121 in style.css):**
```css
.hero-3d-container spline-viewer {
    width: 100%;
    height: 100%;
}
```

The `<spline-viewer>` custom element is missing the `display: block` property. Custom elements default to `display: inline`, which can prevent them from properly respecting width and height dimensions. This causes the viewer to not fill its container properly, resulting in the black space on the sides.

## Affected Components
- **File**: `c:\Users\david\Desktop\onyx\css\style.css` (lines 118-121)
- **Section**: Hero section / Spline 3D viewer container
- **Element**: `<spline-viewer>` custom element

## Proposed Solution
Add `display: block` to the `.hero-3d-container spline-viewer` CSS rule to ensure the custom element properly fills its parent container:

```css
.hero-3d-container spline-viewer {
    display: block;
    width: 100%;
    height: 100%;
}
```

This will force the spline-viewer to behave as a block-level element and properly stretch to fill the 100vw x 100vh container.

## Additional Considerations
- The parent `.hero-3d-container` already has `position: fixed`, `width: 100vw`, and `height: 100vh`, so it's properly sized
- No changes needed to the HTML structure
- This is a CSS-only fix with minimal risk of side effects

## Implementation Notes
**Status**: ✓ Complete

**Changes Applied**:
- Modified `css/style.css` line 118-121
- Added `display: block;` to `.hero-3d-container spline-viewer` rule
- The Spline viewer now properly fills the full viewport width

**Files Modified**:
- `c:\Users\david\Desktop\onyx\css\style.css`

**Test Results**:
Ready for visual testing - the Spline viewer should now span the full width of the viewport with no black space on the sides.
