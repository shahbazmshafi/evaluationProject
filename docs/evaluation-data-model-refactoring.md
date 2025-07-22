# Evaluation Data Model Refactoring

## Overview
This document describes the refactoring of the evaluation data model to address the following requirements:
- Proper KPI weight tracking and role-based field separation
- Transparent score calculation with individual KPI contributions
- Clear separation between manager and admin views
- Historical tracking of KPI data at evaluation time

## Database Schema Changes

### New Tables
1. **KPIEvaluation**
   - Stores KPI snapshot data at evaluation time
   - Includes fields for KPI title, description, category, and weightage
   - Tracks rating and comment for each KPI
   - Includes audit fields for tracking creation and updates

### Modified Tables
1. **Evaluation**
   - Added technical_score and admin_score fields for score breakdown
   - Added role-specific comment fields (manager_comments, admin_comments)
   - Added audit fields for tracking the evaluation lifecycle (submitted_at, approved_at, rejected_at, created_by)

## API Changes

### Updated Endpoints
1. **POST /evaluations**
   - Now calculates technical and administrative scores separately
   - Creates KPIEvaluation records with KPI snapshot data
   - Supports role-specific fields

### Updated Score Calculation
1. **Technical Score**
   - Calculated from KPIs with category = 'technical'
   - Weighted average based on KPI weightage
   
2. **Administrative Score**
   - Calculated from KPIs with category = 'admin'
   - Weighted average based on KPI weightage
   
3. **Overall Score**
   - 70% technical score + 30% administrative score
   
4. **Normalized Score**
   - Scales the overall score to a 3-5 range
   
5. **Increment Percentage**
   - Determined from the normalized score

## Frontend Changes

### Updated TypeScript Interfaces
1. **KPIEvaluation**
   - Represents a KPI evaluation with snapshot data
   - Includes fields for KPI title, description, category, and weightage
   
2. **Evaluation**
   - Now includes technical_score and admin_score
   - Includes role-specific comment fields
   - Includes audit fields for tracking the evaluation lifecycle
   - References KPIEvaluation objects instead of KPIRating objects

### Role-Based Field Visibility
1. **Manager-Only Fields**
   - Manager comments are only visible to users with the 'manage_evaluations' permission
   
2. **Admin-Only Fields**
   - Admin comments are only visible to users with the 'admin_evaluations' permission

### Score Breakdown Display
1. **Technical Score**
   - Displayed separately with 70% weighting indicator
   
2. **Administrative Score**
   - Displayed separately with 30% weighting indicator
   
3. **Overall Score**
   - Displayed as a combination of technical and administrative scores
   
4. **Normalized Score and Increment Percentage**
   - Displayed for transparency in the evaluation process

## Migration Strategy
The old KPIRating model is kept for backward compatibility, but new evaluations will use the KPIEvaluation model. The frontend and backend have been updated to handle both models, with a preference for the new model.

## Benefits
1. **Transparency**: Score calculation is now more transparent with clear breakdown of technical and administrative components.
2. **Historical Data**: KPI snapshot data is preserved at evaluation time, allowing for accurate historical reporting.
3. **Role-Based Access**: Different user roles have access to different fields, improving security and user experience.
4. **Audit Trail**: The evaluation lifecycle is now tracked with timestamps for submission, approval, and rejection.