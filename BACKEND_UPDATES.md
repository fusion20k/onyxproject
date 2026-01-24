# Backend Updates Required

## 1. Update AI Decision Analyzer

**File**: Your backend AI analyzer service (where OpenAI GPT-4 calls are made)

### Changes:
- Replace the system prompt with the content from `AI_PROMPT.md`
- Update extraction logic to **extract 3 options** instead of 2
  - If user only mentions 1-2 options, the AI should infer a third (variation, hybrid, or "do nothing" baseline)
- Add extraction for the new **Execution Plan** section from AI response

### Example structure after AI analysis:
```javascript
{
  "decision": {
    "goal": "...",
    "time_horizon": "...",
    "constraints": [...],
    "risk_tolerance": "...",
    "primary_metric": "..."
  },
  "options": [
    {
      "name": "Option A",
      "description": "...",
      "upside": "...",
      "downside": "...",
      "key_assumptions": [...],
      "fragility_score": "fragile" | "balanced" | "robust"
    },
    {
      "name": "Option B",
      // ... same structure
    },
    {
      "name": "Option C",
      // ... same structure (NEW - third option)
    }
  ],
  "recommendation": {
    "recommended_option_id": "uuid",
    "reasoning": "...",
    "alternatives_reasoning": "why not the other options",
    "execution_plan": "step-by-step guide" // NEW FIELD
  }
}
```

## 2. Database Schema Updates

**Table**: `decision_recommendations`

### Add new column:
```sql
ALTER TABLE decision_recommendations
ADD COLUMN execution_plan TEXT;
```

## 3. API Endpoint Updates

### `/decisions/create` (POST)
- Update AI analyzer to extract 3 options
- Store execution_plan in decision_recommendations table

### `/decisions/:id/confirm-understanding` (POST)
- When user confirms understanding, trigger stress test analysis
- Extract 3 options from analysis
- Store execution_plan

## 4. Frontend Display

The frontend already handles multiple options dynamically, so displaying 3 instead of 2 will work automatically.

### Add Execution Plan Display

You may want to add a new card in the workspace UI to display the execution plan separately, or append it to the recommendation card.

Example placement in `app/index.html` (optional):
```html
<!-- After Analysis Card -->
<section class="decision-card" id="execution-card">
    <h2 class="card-title">Execution plan</h2>
    <div id="execution-plan-content" class="execution-plan-content">
        <!-- Rendered from recommendation.execution_plan -->
    </div>
</section>
```

## Testing

After implementing these changes:

1. Create a new decision with complex input
2. Verify the AI extracts exactly 3 options (even if user only mentioned 2)
3. Confirm the execution plan appears in the recommendation
4. Test the "This looks right" button triggers stress test
5. Verify committed decisions can be viewed, edited, and deleted

## Implementation Priority

1. **High**: Update AI prompt and extraction logic for 3 options
2. **High**: Add execution_plan database column
3. **Medium**: Update API to store/return execution_plan
4. **Low**: Add separate execution plan UI card (can append to recommendation card for now)
