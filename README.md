# Employee Evaluation Portal

A comprehensive full-stack application for managing employee evaluations, KPIs, and performance assessments.

## Features

- **Role-Based Authentication**: Admin, Manager, and Employee roles with specific permissions
- **Dynamic KPI Management**: Create, edit, and manage KPIs with weightage assignments
- **Comprehensive Evaluation System**: 1-5 rating scale with automated score calculations
- **Score Calculation**: Normalized scoring with increment percentage recommendations
- **User Management**: Complete CRUD operations for users and role assignments
- **Notification System**: Real-time notifications for evaluation processes
- **Responsive Design**: Modern UI that works on all devices

## Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **SQLite**: Lightweight database for development
- **JWT Authentication**: Secure token-based authentication
- **Pydantic**: Data validation and settings management

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **Vite**: Fast build tool and development server

### Deployment
- **Docker**: Containerized application
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Web server and reverse proxy

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Docker and Docker Compose (for containerized deployment)

### Local Development

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend Setup
```bash
npm install
npm run dev
```

### Docker Deployment
```bash
# Build and run all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop services
docker-compose down
```

### Database Tools and Verification

The backend container includes SQLite tools for database inspection and management. You can use these tools to verify the database state and troubleshoot issues.

#### Database Verification Script

A verification script is included to check the database state:

```bash
# Run the database verification script
docker-compose exec backend python scripts/verify_db.py
```

This script provides:
- List of all tables in the database
- Number of records in each table
- Details of the admin user (excluding sensitive data)
- Database file location and permissions
- Colored output for better readability

#### Manual Database Inspection

You can also use SQLite CLI to directly inspect the database:

```bash
# Access SQLite CLI
docker-compose exec backend sqlite3 /app/data/employee_eval.db

# Common SQLite commands
.tables                  # List all tables
.schema users            # Show schema for users table
SELECT * FROM users;     # Query all users
.quit                    # Exit SQLite CLI
```

#### Troubleshooting Database Issues

If you encounter database issues:

1. Verify database initialization:
   ```bash
   docker-compose exec backend python scripts/verify_db.py
   ```

2. Check database file permissions:
   ```bash
   docker-compose exec backend ls -la /app/data
   ```

3. Reinitialize the database (caution: this will reset all data):
   ```bash
   docker-compose exec backend python scripts/init_db.py
   ```

4. Check container logs for database errors:
   ```bash
   docker-compose logs backend
   ```

## API Endpoints

### Authentication
- `POST /auth/login` - User login

### Users
- `GET /users` - List all users
- `POST /users` - Create new user
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

### KPIs
- `GET /kpis` - List all KPIs
- `POST /kpis` - Create new KPI
- `PUT /kpis/{id}` - Update KPI
- `DELETE /kpis/{id}` - Delete KPI

### Evaluations
- `GET /evaluations` - List all evaluations
- `POST /evaluations` - Create new evaluation
- `PUT /evaluations/{id}` - Update evaluation
- `GET /evaluations/{id}` - Get specific evaluation

### Notifications
- `GET /notifications` - Get user notifications
- `PUT /notifications/{id}/read` - Mark notification as read

## Score Calculation

The system uses a normalized scoring algorithm:

```
Normalized Score = 3.00 + ((Raw Score - 1.00) / 4.00) × 2.00
```

Increment percentages are calculated based on score slabs:
- 4.50-5.00: 20-25%
- 4.00-4.49: 15-19.99%
- 3.50-3.99: 10-14.99%
- 3.00-3.49: 5-9.99%
- Below 3.00: 0-4.99%

## Default Users

For testing purposes, the following demo accounts are available:

- **Admin**: admin@company.com / password
- **Manager**: manager@company.com / password
- **Employee**: employee@company.com / password

## Project Structure

```
employee-evaluation-portal/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile          # Backend container
├── src/
│   ├── components/         # React components
│   ├── contexts/          # React contexts
│   ├── data/              # Mock data
│   ├── services/          # API services
│   └── types/             # TypeScript types
├── docker-compose.yml      # Multi-container setup
├── Dockerfile             # Frontend container
├── nginx.conf             # Nginx configuration
└── README.md
```

## Security Features

- JWT token-based authentication
- Role-based access control
- Password hashing with secure algorithms
- Input validation and sanitization
- CORS configuration
- SQL injection prevention through ORM

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
