# Backend Updates Required

## 1. Update AI Decision Analyzer

**File**: Your backend AI analyzer service (where OpenAI GPT-4 calls are made)

### Required Model:
- **Use GPT-4 Turbo** or the most advanced model available
- This ensures highest quality analysis and reasoning

### Changes:
- Replace the system prompt with the content from `AI_PROMPT.md`
- Update extraction logic to **extract 3 options** instead of 2
  - If user only mentions 1-2 options, the AI should infer a third (variation, hybrid, or "do nothing" baseline)
- Add extraction for the new **Execution Plan** section from AI response
- **CRITICAL**: The execution plan MUST be returned as a **JSON array** (not plain text)

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
    "execution_plan": JSON.stringify([  // NEW FIELD - MUST BE JSON STRING
      {
        "step": "Identify Relevant Platforms",
        "action": "Research and list online communities and forums where the target audience is active.",
        "timeline": "Week 1",
        "dependencies": "Access to market research tools",
        "validation_point": "List of at least 5 active communities",
        "metrics": "Number of active users in each community",
        "success_criteria": "5+ platforms identified with 10k+ active users each"
      },
      {
        "step": "Develop Engagement Strategy",
        "action": "Create content and engagement plans tailored to each platform",
        "timeline": "Week 2",
        "dependencies": "Completed platform research",
        "validation_point": "Draft engagement plan for each platform",
        "metrics": "Engagement rate projections",
        "success_criteria": "Strategy approved by team with clear KPIs"
      }
      // ... more steps
    ])
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

### `/decisions/:id/commit` (POST)
- Commits the decision with Onyx's recommended option
- User cannot override the recommendation

Request body:
```json
{
  "note": "optional commit note"
}
```

## 4. Frontend Updates (COMPLETED)

The frontend now includes:

### ✅ Enhanced Analysis Section
- Shows all 3 options as selectable cards
- Displays detailed breakdown: upside, downside, key assumptions for each option
- Marks recommended option with "RECOMMENDED" badge
- Allows user to select which option they want (not just recommended)

### ✅ Execution Plan Card
- Shows execution plan for selected option
- For recommended option: displays full execution_plan from backend
- For other options: shows basic guidance until backend provides execution plans for all options

### ✅ Commit Flow
- Updated to include user's selected option
- Sends `selected_option_id` to backend when committing
- Shows confirmation dialog with selected option name

## Testing

After implementing these changes:

1. Create a new decision with complex input
2. Verify the AI extracts exactly 3 options (even if user only mentioned 2)
3. Confirm the execution plan appears in the recommendation
4. Test the "This looks right" button triggers stress test
5. Verify committed decisions can be viewed, edited, and deleted

## 5. Future Enhancement: Execution Plans for All Options (Optional)

Currently, the AI only generates an execution plan for the **recommended option**. 

To provide execution plans for all options:
- Modify AI prompt to generate execution plan for each of the 3 options
- Store execution_plan_json as JSON in recommendation table with structure:
  ```json
  {
    "option_a_id": "step-by-step plan...",
    "option_b_id": "step-by-step plan...",
    "option_c_id": "step-by-step plan..."
  }
  ```
- Frontend will automatically display the appropriate plan when user selects an option

## Implementation Priority

1. **CRITICAL**: Use GPT-4 Turbo or most advanced model available
2. **CRITICAL**: Update AI prompt to return execution_plan as JSON array (not plain text)
3. **High**: Update extraction logic for 3 options
4. **High**: Add `execution_plan` column to `decision_recommendations` table (store as TEXT, containing JSON string)
5. **Medium**: Allow AI to add custom sections when helpful (parse and store)
6. **Low**: Generate execution plans for all options (not just recommended - currently only recommended option gets full plan)

## Frontend Features (COMPLETED)

The frontend now includes:
- ✅ **Workspace Action Directives**: Always-visible action plan on main workspace page
- ✅ **Decision Switcher**: Dropdown to switch between multiple committed decisions' action plans
- ✅ **Progress Tracking**: Visual progress bar with localStorage persistence per decision
- ✅ **Interactive Checklist**: Click-to-complete tasks with strikethrough styling
- ✅ **Analysis Display**: Shows Onyx's recommended option with detailed reasoning
- ✅ **Stress Test View**: All 3 options displayed with upside/downside/assumptions
- ✅ **Structured Execution Steps**: Timeline, dependencies, validation points, metrics, success criteria
