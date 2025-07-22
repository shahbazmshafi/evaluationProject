# Database Changes - July 18, 2025

## Overview

This document describes the database changes implemented on July 18, 2025, to modify the `evaluations` table structure by removing the old `submitted_by` column and adding new `drafted_by` and `submitted_by` columns with proper constraints and indices.

## Changes Made

1. Created a new migration script `backend\scripts\migrate_evaluations_columns.py` that:
   - Backs up existing evaluation data to a temporary table
   - Removes the old `submitted_by` column and its constraints
   - Adds new `drafted_by` and `submitted_by` columns with proper constraints
   - Migrates data from the backup table
   - Adds indices for better performance

2. Updated the `submit_evaluation` endpoint in `backend\main.py` to set the `submitted_by` field to the current user's ID and clear the `drafted_by` field when submitting an evaluation.

## Technical Details

### Database Schema Changes

The following changes were made to the `evaluations` table:

1. Removed the old `submitted_by` column and its foreign key constraint
2. Added new columns:
   - `drafted_by INTEGER DEFAULT NULL`
   - `submitted_by INTEGER DEFAULT NULL`
3. Added foreign key constraints (enforced at the application level due to SQLite limitations)
4. Added indices for better performance:
   - `idx_evaluations_drafted_by` on `drafted_by` column
   - `idx_evaluations_submitted_by` on `submitted_by` column

### Code Changes

1. Updated the `submit_evaluation` endpoint in `backend\main.py` to set the `submitted_by` field to the current user's ID and clear the `drafted_by` field when submitting an evaluation:

```python
# Update evaluation
db_evaluation.raw_score = raw_score
db_evaluation.normalized_score = normalized_score
db_evaluation.performance_label = performance_label
db_evaluation.increment_percentage = increment_percentage
db_evaluation.status = "submitted"
db_evaluation.submitted_at = datetime.utcnow()
db_evaluation.submitted_by = current_user.id
db_evaluation.drafted_by = None  # Clear drafted_by when submitting
```

## Testing

The changes were tested by:
1. Running the migration script to update the database schema
2. Verifying that the `drafted_by` and `submitted_by` columns and their indices exist in the evaluations table

## Notes

- The `evaluation.py` service already properly handled both `submitted_by` and `drafted_by` fields, so no changes were needed there.
- Foreign key constraints are enforced at the application level due to SQLite limitations in adding constraints to existing tables.