`# Evaluation Cycle Management

## Overview

The Evaluation Cycle Management system allows administrators to create, monitor, and manage evaluation cycles across the organization. This document outlines the implementation details, including database schema, API endpoints, frontend components, and the notification system.

The system provides a comprehensive solution for managing the entire evaluation lifecycle, from creating evaluation cycles to tracking their progress and generating reports. It is designed to be user-friendly, efficient, and scalable to accommodate organizations of various sizes.

## Database Schema

### Evaluation Cycles Table

```sql
CREATE TABLE evaluation_cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    evaluation_start_date DATE NOT NULL,
    evaluation_end_date DATE NOT NULL,
    execution_start_date DATE NOT NULL,
    execution_end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Evaluations Table (Modified)

```sql
ALTER TABLE evaluations 
ADD COLUMN cycle_id INTEGER REFERENCES evaluation_cycles(id);
```

## API Endpoints

### Evaluation Cycles

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/evaluation-cycles` | GET | Get all evaluation cycles with optional filtering by status |
| `/evaluation-cycles/{cycle_id}` | GET | Get a specific evaluation cycle by ID |
| `/evaluation-cycles` | POST | Create a new evaluation cycle |
| `/evaluation-cycles/{cycle_id}` | PUT | Update an existing evaluation cycle |
| `/evaluation-cycles/{cycle_id}` | DELETE | Delete an evaluation cycle |
| `/evaluation-cycles/{cycle_id}/activate` | POST | Activate an evaluation cycle and generate evaluations for all eligible employees |

### Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications` | GET | Get all notifications for the current user |
| `/notifications/{notification_id}/read` | PUT | Mark a notification as read |
| `/notifications` | POST | Create a new notification |

## Frontend Components

### EvaluationCycleForm

The `EvaluationCycleForm` component allows administrators to create new evaluation cycles. It includes:

- Form fields for cycle name, evaluation period dates, and execution period dates
- Validation for required fields and date ranges
- Integration with the notification system to notify managers when a new cycle is created
- A "Fill Sample Data" button (admin-only) that automatically populates the form with sensible default values
  - Generates a cycle name based on the evaluation period
  - Sets evaluation period for the next six months
  - Sets execution period for two weeks after the evaluation period ends

### EvaluationCycleOverview

The `EvaluationCycleOverview` component displays a list of evaluation cycles with their status and progress. It includes:

- A table view of all cycles with columns for name, status, evaluation period, and progress
- Progress bars showing completion percentage for each cycle
- Action buttons for activating, exporting, and deleting cycles
- Integration with the notification system to notify managers when a cycle is activated

## Notification System

The notification system is implemented using the `NotificationService` class, which provides methods for:

- Notifying managers when a new evaluation cycle is created
- Notifying managers when an evaluation cycle is activated
- Sending deadline reminders to managers about upcoming evaluation deadlines
- Notifying employees when their evaluation is submitted or approved

### Notification Types

- `evaluation_window`: Notifications about evaluation cycle creation, activation, and deadlines
- `kpi_submission`: Notifications about KPI submissions
- `evaluation_submitted`: Notifications about evaluation submissions
- `results_available`: Notifications about evaluation approvals
- `hr_approval`: Notifications about HR approvals

## User Flow

1. **Admin Creates New Cycle**
   - Admin clicks "Create Cycle" button
   - Admin fills in cycle details (name, evaluation period, execution period)
   - System validates input and creates cycle record
   - System sends notifications to managers about the new cycle

2. **Admin Activates Cycle**
   - Admin clicks "Activate" button on a draft cycle
   - System generates evaluation records for all eligible employees
   - System sends notifications to managers about the activated cycle
   - System schedules reminders for upcoming deadlines

3. **Managers Complete Evaluations**
   - Managers receive notifications about active cycles
   - Managers complete evaluations for their team members
   - System tracks progress and updates the dashboard

4. **Admin Monitors Progress**
   - Admin views the evaluation cycle dashboard
   - Admin can filter cycles by status
   - Admin can export cycle data for reporting
   - Admin can see completion statistics for each cycle

## Testing

The evaluation cycle functionality is tested using Jest and React Testing Library. Tests include:

- Unit tests for form validation and date range logic
- Integration tests for the complete evaluation cycle flow
- UI tests for form rendering and dashboard visualization

## Implementation Details

### Frontend Implementation

The frontend is built using React with TypeScript, providing type safety and improved developer experience. Key implementation details include:

1. **Component Structure**:
   - `EvaluationsPage`: The main container component that manages state and renders the evaluation cycles section
   - `EvaluationCycleForm`: Modal form for creating new evaluation cycles
   - `EvaluationCycleOverview`: Table view of all cycles with progress tracking

2. **State Management**:
   - React hooks (`useState`, `useEffect`) for local component state
   - Context API (`useAuth`) for user authentication and role-based access control

3. **API Integration**:
   - The `apiService` provides methods for interacting with the backend API
   - Requests are made using the Fetch API with proper error handling
   - Date formatting is handled to ensure compatibility with the backend

4. **Admin Features**:
   - The "Fill Sample Data" button uses JavaScript's Date API to generate sensible default values
   - The button is conditionally rendered based on the user's role
   - Sample data is calculated based on the current date to ensure relevance

### Backend Implementation

The backend is built using FastAPI (Python), providing a robust and performant API. Key implementation details include:

1. **Database Models**:
   - SQLAlchemy ORM for database interactions
   - Proper relationships between models (e.g., EvaluationCycle to Evaluation)
   - Date fields use SQLAlchemy's DateTime type for precise timestamp handling

2. **API Endpoints**:
   - RESTful design principles
   - Proper validation using Pydantic schemas
   - Role-based access control for all endpoints

3. **Business Logic**:
   - Evaluation cycle activation generates evaluations for all eligible employees
   - Progress tracking is calculated in real-time based on evaluation statuses
   - Notifications are sent to relevant users at appropriate times

## Future Enhancements

- Email notifications in addition to in-app notifications
- Customizable notification preferences for users
- Advanced filtering and sorting options for the dashboard
- Bulk operations for managing multiple cycles
- Historical data analysis and reporting
- Enhanced data visualization for evaluation cycle progress
