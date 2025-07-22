# Evaluation Cycle Access & Start Button Logic Fix

## Issues Fixed

1. **Manager Access to Active Evaluation Cycles**
   - Managers can now see active evaluation cycles, just like admins
   - The "No active evaluation cycle found" warning no longer appears for managers when there's an active cycle

2. **Conditional Start Button Rendering**
   - "Start" and "Create" buttons are now only visible when there's an active evaluation cycle
   - This prevents users from attempting to start evaluations when no cycle exists

3. **Page-Level Notifications**
   - Added clear notifications about active cycle status
   - When a cycle exists, shows cycle name and date range
   - When no cycle exists, shows appropriate message based on user role

## Changes Made

### Backend Changes

1. Modified `get_evaluation_cycles` endpoint in `main.py`:
   - Now allows managers to access active evaluation cycles
   - Admins can still access all cycles
   - Other roles remain restricted

2. Modified `get_evaluation_cycle` endpoint in `main.py`:
   - Now allows managers to access specific active evaluation cycles by ID
   - Admins can still access any cycle
   - Other roles remain restricted

### Frontend Changes

1. Updated `EvaluationsPage.tsx`:
   - Added state variables to track active cycle and loading state
   - Added API call to fetch active evaluation cycle
   - Added page-level notification showing active cycle details or warning when no cycle exists
   - Modified "Start" and "Create" buttons to only render when there's an active cycle

## Manual Testing Instructions

To verify the fixes:

1. **As Admin:**
   - Create an active evaluation cycle
   - Verify you can see the active cycle details in the notification
   - Verify "Start" and "Create" buttons are visible

2. **As Manager:**
   - Log in as a manager
   - Verify you can see the active cycle details in the notification (same as admin)
   - Verify "Start" and "Create" buttons are visible

3. **With No Active Cycle:**
   - As admin, deactivate all evaluation cycles
   - Verify appropriate notification appears for both admin and manager
   - Verify "Start" and "Create" buttons are NOT visible for either role

## Automated Testing

A test script `test_evaluation_cycle_fix.py` has been created to verify the backend API changes:

1. It tests that both admin and manager can access the list of active cycles
2. It tests that managers can access specific active cycles by ID

To run the test:
```
python test_evaluation_cycle_fix.py
```

Note: The server must be running for the test to work.

## Acceptance Criteria Met

- [x] Manager can see active cycle details same as admin
- [x] "Start" buttons only appear when there's an active cycle
- [x] Warning message removed from popup when cycle exists
- [x] Page shows appropriate notification when no active cycle exists
- [x] All evaluations started are properly associated with active cycle
- [x] Test cases added to verify this functionality