# Evaluation Creation Fix

## Issue Description

When trying to create/save an evaluation, the application was returning a 500 Internal Server Error. This was happening because of a mismatch between what the frontend was sending and what the backend expected.

### Frontend Payload (What was being sent)

```typescript
{ 
  employee_id: number, 
  manager_id: number, 
  period: string, 
  cycle_id?: number, 
  kpi_evaluations: [{ 
    kpi_id: number, 
    title: string, 
    description: string, 
    category: 'technical' | 'admin', 
    weightage: number, 
    rating: number, 
    comment?: string 
  }], 
  status: 'draft' | 'submitted', 
  comments?: string, 
  manager_comments?: string, 
  admin_comments?: string, 
  submitted_by: number 
}
```

### Backend Expectations (What was needed)

Required fields that must be in the response:
- id: number
- employee_id: number
- manager_id: number
- status: string
- created_at: datetime
- updated_at: datetime
- permissions: EvaluationPermissions object

## Changes Made

### Backend Changes

1. Updated the `EvaluationCreate` schema in `backend/schemas/evaluation.py` to include all the fields that the frontend was sending:
   - Added `manager_id` as an optional field with a default value of `None`
   - Added `status` as an optional field with a default value of `"draft"`
   - Added `submitted_by` as an optional field with a default value of `None`

2. Updated the `create_evaluation` function in `backend/main.py` to:
   - Set current timestamp for created_at and updated_at using `datetime.utcnow()`
   - Use provided manager_id if available, otherwise use current user's id
   - Use provided status if available, otherwise use default "draft"
   - Use provided submitted_by if available, otherwise use current user's id
   - Set submitted_by to None if status is not "submitted"
   - Add created_at and updated_at to KPI evaluations
   - Add proper error handling with try-except block and detailed error messages

### Frontend Changes

1. Updated the `createEvaluation` function in `src/services/api.ts` to:
   - Add validation for required fields (employeeId, managerId, submittedBy, period, kpiEvaluations)
   - Ensure all IDs are properly converted to numbers
   - Prepare a clean payload with snake_case field names for the backend
   - Add better error handling and logging
   - Include permissions in the returned evaluation object

2. Updated the `handleSave` function in `src/components/EvaluationForm.tsx` to:
   - Add validation for form data (check if there are KPIs to evaluate)
   - Check if all KPIs have been rated (with a confirmation dialog if submitting with unrated KPIs)
   - Ensure all required fields are present
   - Add better error handling and user feedback

## Testing

A test script `test_evaluation_creation.py` was created to verify that the evaluation creation process works as expected. The script includes tests for:

1. Creating an evaluation as draft
2. Creating an evaluation with all fields populated
3. Creating an evaluation with missing optional fields
4. Verifying the response includes all required fields
5. Verifying proper error handling
6. Verifying permissions are correctly set

## Success Criteria

1. User can successfully save an evaluation draft
2. No 500 errors when creating evaluations
3. Backend validation errors are properly shown to users
4. Response includes all required fields
5. Proper error handling is in place

## Notes

- The backend now handles both new evaluations and updates
- Permissions are calculated based on user role
- All timestamps are in UTC
- IDs are properly converted between string (frontend) and integer (backend)