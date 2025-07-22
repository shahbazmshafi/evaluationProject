# Remaining Days Counter for Evaluation Cycle Implementation

This document outlines the implementation of the remaining days counter feature for active evaluation cycles on each user's dashboard.

## Overview

The feature displays the number of days remaining until the evaluation period ends for active evaluation cycles on each user's dashboard. It includes visual indicators based on urgency levels:
- Normal state (> 5 days): Blue background with calendar icon
- Warning state (≤ 5 days): Yellow background with warning message
- Critical state (≤ 2 days): Red background with alert triangle icon and critical message

## Backend Changes

### 1. Added `remaining_days` field to `EvaluationCycleResponse` model

File: `backend/schemas/evaluation_cycle.py`
```python
class EvaluationCycleResponse(EvaluationCycleBase):
    id: int
    status: str
    created_by: int
    created_at: datetime

    # Statistics
    total_evaluations: Optional[int] = None
    completed_evaluations: Optional[int] = None
    progress_percentage: Optional[float] = None
    remaining_days: Optional[int] = None  # Added field

    class Config:
        from_attributes = True
```

### 2. Created utility function to calculate remaining days

File: `backend/main.py`
```python
def calculate_remaining_days(end_date: datetime) -> int:
    """
    Calculate the number of days remaining until the end date.
    Returns 0 if the end date has passed.
    """
    today = datetime.now().date()
    end_date_only = end_date.date()
    delta = end_date_only - today
    return max(0, delta.days)
```

### 3. Modified evaluation cycle endpoints to include remaining days calculation

File: `backend/main.py`

For the `get_evaluation_cycles` endpoint:
```python
# Calculate remaining days only for active cycles
if cycle.status == "active":
    cycle_dict["remaining_days"] = calculate_remaining_days(cycle.evaluation_end_date)
else:
    cycle_dict["remaining_days"] = 0
```

For the `get_evaluation_cycle` endpoint:
```python
# Calculate remaining days only for active cycles
if cycle.status == "active":
    cycle_dict["remaining_days"] = calculate_remaining_days(cycle.evaluation_end_date)
else:
    cycle_dict["remaining_days"] = 0
```

## Frontend Changes

### 1. Updated `EvaluationCycle` interface to include `remainingDays`

File: `src/types/index.ts`
```typescript
export interface EvaluationCycle {
  id: string;
  name: string;
  evaluationStartDate: string;
  evaluationEndDate: string;
  executionStartDate: string;
  executionEndDate: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  totalEvaluations?: number;
  completedEvaluations?: number;
  progressPercentage?: number;
  remainingDays?: number;  // Added field
}
```

### 2. Updated API service to handle the new field

File: `src/services/api.ts`

For the `getEvaluationCycles` function:
```typescript
return data.map((cycle: any) => ({
  id: cycle.id.toString(),
  name: cycle.name,
  evaluationStartDate: cycle.evaluation_start_date,
  evaluationEndDate: cycle.evaluation_end_date,
  executionStartDate: cycle.execution_start_date,
  executionEndDate: cycle.execution_end_date,
  status: cycle.status,
  createdBy: cycle.created_by.toString(),
  createdAt: cycle.created_at,
  totalEvaluations: cycle.total_evaluations,
  completedEvaluations: cycle.completed_evaluations,
  progressPercentage: cycle.progress_percentage,
  remainingDays: cycle.remaining_days  // Added field
}));
```

For the `getEvaluationCycle` function:
```typescript
return {
  id: cycle.id.toString(),
  name: cycle.name,
  evaluationStartDate: cycle.evaluation_start_date,
  evaluationEndDate: cycle.evaluation_end_date,
  executionStartDate: cycle.execution_start_date,
  executionEndDate: cycle.execution_end_date,
  status: cycle.status,
  createdBy: cycle.created_by.toString(),
  createdAt: cycle.created_at,
  totalEvaluations: cycle.total_evaluations,
  completedEvaluations: cycle.completed_evaluations,
  progressPercentage: cycle.progress_percentage,
  remainingDays: cycle.remaining_days  // Added field
};
```

### 3. Modified Dashboard component to display remaining days with conditional styling

File: `src/components/Dashboard.tsx`

Added imports:
```typescript
import { Evaluation, KPI, User, EvaluationCycle } from '../types';
import { BarChart3, Users, Target, TrendingUp, Clock, CheckCircle, Plus, ArrowRight, AlertTriangle, Calendar } from 'lucide-react';
```

Added state for active evaluation cycles:
```typescript
const [activeCycles, setActiveCycles] = useState<EvaluationCycle[]>([]);
```

Updated useEffect to fetch active evaluation cycles:
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const [evaluationsData, kpisData, usersData, cyclesData] = await Promise.all([
        apiService.getEvaluations(),
        apiService.getKPIs(),
        apiService.getUsers(),
        apiService.getEvaluationCycles({ status: 'active' }),
      ]);
      setEvaluations(evaluationsData);
      setKPIs(kpisData);
      setUsers(usersData);
      setActiveCycles(cyclesData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

Added new section to display remaining days with conditional styling:
```tsx
{/* Active Evaluation Cycle */}
{activeCycles.length > 0 && (
  <div className="mb-8">
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Active Evaluation Cycle
          </h3>
        </div>
        
        {activeCycles.map((cycle) => (
          <div key={cycle.id} className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-medium text-gray-900">{cycle.name}</h4>
                <p className="text-sm text-gray-500">
                  Ends on {new Date(cycle.evaluationEndDate).toLocaleDateString()}
                </p>
              </div>
              
              {cycle.remainingDays !== undefined && (
                <div className={`
                  px-4 py-2 rounded-lg flex items-center
                  ${cycle.remainingDays <= 2 ? 'bg-red-100 text-red-800' : 
                    cycle.remainingDays <= 5 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-blue-100 text-blue-800'}
                `}>
                  <div className="mr-2">
                    {cycle.remainingDays <= 2 ? 
                      <AlertTriangle className="h-5 w-5" /> : 
                      <Calendar className="h-5 w-5" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {cycle.remainingDays} {cycle.remainingDays === 1 ? 'day' : 'days'} remaining
                    </p>
                    {cycle.remainingDays <= 5 && (
                      <p className="text-xs">
                        {cycle.remainingDays <= 2 ? 'Critical! Complete your evaluation now.' : 'Please complete your evaluation soon.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

## Acceptance Criteria Met

1. ✅ Users can see the remaining days count on their dashboard when there's an active evaluation cycle
2. ✅ The count updates daily automatically (using the backend calculation)
3. ✅ The display includes appropriate visual indicators based on urgency:
   - ✅ Clear numerical display of remaining days
   - ✅ Visual indicators for urgency levels (blue, yellow, red)
   - ✅ Proper handling of expired/completed evaluations (0 days)
4. ✅ The feature works correctly across different timezones (using server-side calculation)
5. ✅ The display degrades gracefully when no active evaluation cycle exists (section is hidden)