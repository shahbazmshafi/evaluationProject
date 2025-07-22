# Save Draft Functionality and UI State Management Fix

## Bug Description
1. When clicking "Save Draft" on the evaluation popup, the system creates a new record instead of updating the existing one
2. After saving draft, the UI doesn't properly reflect the draft state:
   - "Start" button still shows instead of changing to "Draft"
   - Status column doesn't update to show "Draft"
   - Saved data isn't loaded when resuming the evaluation

## Changes Made

### Backend Changes

1. **Modified the `create_evaluation` endpoint in `main.py`**
   - Added logic to check if an evaluation already exists for the employee/period combination when saving a draft
   - If an existing evaluation is found, update it instead of creating a new one
   - Delete existing KPI evaluations and create new ones
   - Update the drafted_by field

2. **Added a new `update_evaluation` endpoint in `main.py`**
   - Implemented a PUT endpoint at `/evaluations/{evaluation_id}`
   - Validates that the evaluation exists and the user is authorized to update it
   - Updates all evaluation fields, including status, comments, and scores
   - Deletes existing KPI evaluations and creates new ones
   - Updates the drafted_by or submitted_by field based on the status

### Frontend Changes

1. **Modified the `EvaluationForm.tsx` component**
   - Updated the `handleSave` function to pass the evaluation ID when saving a draft for an existing evaluation
   - Used the existing evaluation period if available
   - Improved the loading of evaluation data by using a direct API call to get a specific evaluation by ID

2. **Modified the `EvaluationsPage.tsx` component**
   - Updated the component to pass the evaluationId when opening an existing draft
   - Added code to refresh the evaluations list after closing the form
   - This ensures the UI properly reflects the draft state after saving

3. **Modified the `api.ts` service**
   - Added a new `getEvaluation` function to fetch a specific evaluation by ID
   - Updated the `createEvaluation` function to handle the evaluation ID parameter
   - Added logic to use a PUT request to update an existing evaluation instead of creating a new one

## Testing

The changes have been tested to verify:
1. Save draft updates existing record instead of creating a new one
2. "Start" button changes to "Draft" after saving
3. Status column shows "Draft" after saving
4. Clicking "Draft" button loads previously saved data

## Benefits

1. **Data Consistency**: No more duplicate evaluation records
2. **Improved User Experience**: Clear feedback on evaluation status
3. **Workflow Efficiency**: Seamless draft/resume workflow
4. **Data Integrity**: All saved data is properly loaded when resuming

## Future Improvements

1. Add more comprehensive error handling
2. Implement optimistic UI updates for better responsiveness
3. Add unit and integration tests for the draft saving functionality