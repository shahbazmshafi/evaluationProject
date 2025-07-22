import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os
import json

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, Base, get_db, User, Role, KPI, Evaluation, KPIEvaluation

# Create an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create a test client
client = TestClient(app)

class TestEvaluationStart(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create the database tables
        Base.metadata.create_all(bind=engine)
        
        # Create test data
        db = TestingSessionLocal()
        
        # Create roles
        admin_role = Role(id=1, name="Admin")
        manager_role = Role(id=2, name="Manager")
        employee_role = Role(id=3, name="Employee")
        db.add_all([admin_role, manager_role, employee_role])
        db.commit()
        
        # Create users
        admin_user = User(
            id=1, 
            username="admin", 
            email="admin@example.com", 
            hashed_password="hashed_password", 
            role_id=1,
            manager_id=None
        )
        manager1 = User(
            id=2, 
            username="manager1", 
            email="manager1@example.com", 
            hashed_password="hashed_password", 
            role_id=2,
            manager_id=1
        )
        manager2 = User(
            id=3, 
            username="manager2", 
            email="manager2@example.com", 
            hashed_password="hashed_password", 
            role_id=2,
            manager_id=1
        )
        employee1 = User(
            id=4, 
            username="employee1", 
            email="employee1@example.com", 
            hashed_password="hashed_password", 
            role_id=3,
            manager_id=2  # Managed by manager1
        )
        employee2 = User(
            id=5, 
            username="employee2", 
            email="employee2@example.com", 
            hashed_password="hashed_password", 
            role_id=3,
            manager_id=3  # Managed by manager2
        )
        employee_no_kpis = User(
            id=6, 
            username="employee_no_kpis", 
            email="employee_no_kpis@example.com", 
            hashed_password="hashed_password", 
            role_id=3,
            manager_id=2  # Managed by manager1
        )
        db.add_all([admin_user, manager1, manager2, employee1, employee2, employee_no_kpis])
        db.commit()
        
        # Create KPIs
        # Global KPI created by admin
        global_kpi = KPI(
            id=1,
            title="Global KPI",
            description="A global KPI for all employees",
            weightage=10.0,
            type="global",
            status="active",
            created_by=1,
            manager_id=0
        )
        
        # Role-based KPI for employees created by manager1
        role_based_kpi = KPI(
            id=2,
            title="Employee Role KPI",
            description="A KPI for the employee role",
            weightage=20.0,
            type="role-based",
            target_role_id=3,
            status="active",
            created_by=2,
            manager_id=2
        )
        
        # Employee-specific KPI for employee1 created by manager1
        employee_specific_kpi = KPI(
            id=3,
            title="Employee1 Specific KPI",
            description="A KPI specifically for employee1",
            weightage=30.0,
            type="employee-specific",
            target_employee_id=4,
            status="active",
            created_by=2,
            manager_id=2
        )
        
        # Role-based KPI for employees created by manager2
        role_based_kpi2 = KPI(
            id=4,
            title="Manager2 Role KPI",
            description="A KPI for the employee role created by manager2",
            weightage=15.0,
            type="role-based",
            target_role_id=3,
            status="active",
            created_by=3,
            manager_id=3
        )
        
        # Inactive KPI (should not be included in evaluations)
        inactive_kpi = KPI(
            id=5,
            title="Inactive KPI",
            description="An inactive KPI",
            weightage=10.0,
            type="global",
            status="draft",
            created_by=1,
            manager_id=0
        )
        
        db.add_all([global_kpi, role_based_kpi, employee_specific_kpi, role_based_kpi2, inactive_kpi])
        db.commit()
        
        db.close()
    
    def get_token(self, user_id):
        """Helper method to generate a token for a user"""
        # In a real test, you would use the actual token generation logic
        # For simplicity, we'll just return a mock token
        return f"mock_token_for_user_{user_id}"
    
    def test_start_evaluation_as_manager(self):
        """Test that a manager can start an evaluation for their employee"""
        token = self.get_token(2)  # Manager1
        response = client.post(
            "/api/evaluations/start",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "employee_id": 4,  # Employee1
                "period": "Q1 2023",
                "comments": "Initial evaluation"
            }
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify the evaluation was created
        evaluation = response.json()
        self.assertEqual(evaluation["employee_id"], 4)
        self.assertEqual(evaluation["manager_id"], 2)
        self.assertEqual(evaluation["period"], "Q1 2023")
        self.assertEqual(evaluation["status"], "draft")
        self.assertEqual(evaluation["comments"], "Initial evaluation")
        
        # Verify KPIs were associated
        kpi_evaluations = evaluation["kpi_evaluations"]
        self.assertEqual(len(kpi_evaluations), 3)  # Should include global, role-based, and employee-specific KPIs
        
        # Verify KPI titles
        kpi_titles = [kpi_eval["title"] for kpi_eval in kpi_evaluations]
        self.assertIn("Global KPI", kpi_titles)
        self.assertIn("Employee Role KPI", kpi_titles)
        self.assertIn("Employee1 Specific KPI", kpi_titles)
        
        # Verify initial ratings are 0
        for kpi_eval in kpi_evaluations:
            self.assertEqual(kpi_eval["rating"], 0)
    
    def test_start_evaluation_as_admin(self):
        """Test that an admin can start an evaluation for any employee"""
        token = self.get_token(1)  # Admin
        response = client.post(
            "/api/evaluations/start",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "employee_id": 5,  # Employee2
                "period": "Q1 2023",
                "comments": "Admin evaluation"
            }
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify the evaluation was created
        evaluation = response.json()
        self.assertEqual(evaluation["employee_id"], 5)
        self.assertEqual(evaluation["manager_id"], 3)  # Employee2's manager is manager2
        self.assertEqual(evaluation["period"], "Q1 2023")
        self.assertEqual(evaluation["status"], "draft")
        
        # Verify KPIs were associated
        kpi_evaluations = evaluation["kpi_evaluations"]
        self.assertEqual(len(kpi_evaluations), 2)  # Should include global and role-based KPIs
    
    def test_start_evaluation_as_employee(self):
        """Test that an employee cannot start an evaluation"""
        token = self.get_token(4)  # Employee1
        response = client.post(
            "/api/evaluations/start",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "employee_id": 4,  # Self
                "period": "Q1 2023",
                "comments": "Self evaluation"
            }
        )
        self.assertEqual(response.status_code, 403)  # Forbidden
    
    def test_start_evaluation_for_nonexistent_employee(self):
        """Test that starting an evaluation for a non-existent employee returns 404"""
        token = self.get_token(2)  # Manager1
        response = client.post(
            "/api/evaluations/start",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "employee_id": 999,  # Non-existent employee
                "period": "Q1 2023",
                "comments": "Evaluation for non-existent employee"
            }
        )
        self.assertEqual(response.status_code, 404)  # Not Found
    
    def test_start_evaluation_for_employee_without_kpis(self):
        """Test that starting an evaluation for an employee without KPIs returns 400"""
        token = self.get_token(2)  # Manager1
        response = client.post(
            "/api/evaluations/start",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "employee_id": 6,  # Employee with no KPIs
                "period": "Q1 2023",
                "comments": "Evaluation for employee without KPIs"
            }
        )
        self.assertEqual(response.status_code, 400)  # Bad Request
        self.assertIn("No applicable KPIs found", response.json()["detail"])
    
    def test_start_evaluation_for_employee_of_another_manager(self):
        """Test that a manager cannot start an evaluation for an employee they don't manage"""
        token = self.get_token(2)  # Manager1
        response = client.post(
            "/api/evaluations/start",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "employee_id": 5,  # Employee2 (managed by manager2)
                "period": "Q1 2023",
                "comments": "Evaluation for employee of another manager"
            }
        )
        self.assertEqual(response.status_code, 403)  # Forbidden
        self.assertIn("Not authorized to start evaluations for this employee", response.json()["detail"])

if __name__ == "__main__":
    unittest.main()