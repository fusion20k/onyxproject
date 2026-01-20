# Application Submission Endpoint

## Frontend → Backend Integration

The landing page application form now submits directly to the backend API, which inserts into Supabase.

---

## Required Backend Endpoint

**Route**: `POST /api/applications/submit`

**Purpose**: Receive application form submissions from landing page and store in Supabase

**Authentication**: None required (public endpoint)

**Request Body**:
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "role": "string (required)",
  "reason": "string (required, min 50 chars)",
  "project": "string (optional, nullable)"
}
```

**Backend Logic**:
1. Validate request body
2. Check if email already exists in `applications` table
   - If exists and status is 'pending', return error: "Application already submitted"
   - If exists and status is 'approved' or 'denied', allow reapplication (update existing record)
3. Insert into Supabase `applications` table:
   ```javascript
   await supabase
     .from('applications')
     .insert({
       name: req.body.name,
       email: req.body.email,
       role: req.body.role,
       reason: req.body.reason,
       project: req.body.project,
       status: 'pending'
     });
   ```
4. Return success response

**Success Response** (200):
```json
{
  "success": true,
  "message": "Application submitted successfully"
}
```

**Error Responses**:

400 - Validation Error:
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

409 - Duplicate Application:
```json
{
  "success": false,
  "error": "Application already submitted"
}
```

500 - Server Error:
```json
{
  "success": false,
  "error": "Failed to submit application"
}
```

---

## Implementation Example

**src/routes/applications.js**:
```javascript
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

router.post('/submit', async (req, res) => {
  try {
    const { name, email, role, reason, project } = req.body;

    // Validate required fields
    if (!name || !email || !role || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate reason length
    if (reason.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Reason must be at least 50 characters'
      });
    }

    // Check for existing application
    const { data: existing } = await supabase
      .from('applications')
      .select('status')
      .eq('email', email)
      .single();

    if (existing && existing.status === 'pending') {
      return res.status(409).json({
        success: false,
        error: 'Application already submitted'
      });
    }

    // Insert application
    const { error: insertError } = await supabase
      .from('applications')
      .insert({
        name,
        email,
        role,
        reason,
        project: project || null,
        status: 'pending'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit application'
      });
    }

    res.json({
      success: true,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
```

**src/index.js** (add route):
```javascript
const applicationRoutes = require('./routes/applications');
app.use('/api/applications', applicationRoutes);
```

---

## Testing

1. Submit form on landing page: https://onyx-project.com
2. Check Supabase `applications` table for new row
3. Check admin panel at https://onyx-project.com/admin for the application
4. Test duplicate submission (should return 409 error)

---

## Current Status

- ✅ Frontend updated to POST to `/api/applications/submit`
- ⏳ Backend endpoint needs to be implemented
- ⏳ Test end-to-end flow after backend deployment
