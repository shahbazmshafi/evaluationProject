import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os
import json
from datetime import datetime

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

class TestEvaluationHistory(unittest.TestCase):
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
        db.add_all([admin_user, manager1, manager2, employee1, employee2])
        db.commit()
        
        # Create evaluations for employee1
        # Draft evaluation
        draft_evaluation = Evaluation(
            id=1,
            employee_id=4,
            manager_id=2,
            period="Q1 2023",
            raw_score=0,
            normalized_score=0,
            performance_label="",
            increment_percentage=0,
            status="draft",
            comments="Draft evaluation",
            created_by=2,
            created_at=datetime.utcnow()
        )
        
        # Submitted evaluation
        submitted_evaluation = Evaluation(
            id=2,
            employee_id=4,
            manager_id=2,
            period="Q4 2022",
            raw_score=85,
            normalized_score=4.25,
            performance_label="Exceeds Expectations",
            increment_percentage=17.5,
            status="submitted",
            comments="Submitted evaluation",
            created_by=2,
            created_at=datetime.utcnow(),
            submitted_at=datetime.utcnow()
        )
        
        # Approved evaluation
        approved_evaluation = Evaluation(
            id=3,
            employee_id=4,
            manager_id=2,
            period="Q3 2022",
            raw_score=90,
            normalized_score=4.5,
            performance_label="Outstanding",
            increment_percentage=22.5,
            status="approved",
            comments="Approved evaluation",
            created_by=2,
            created_at=datetime.utcnow(),
            submitted_at=datetime.utcnow(),
            approved_at=datetime.utcnow()
        )
        
        # Create evaluations for employee2
        employee2_evaluation = Evaluation(
            id=4,
            employee_id=5,
            manager_id=3,
            period="Q1 2023",
            raw_score=80,
            normalized_score=4.0,
            performance_label="Exceeds Expectations",
            increment_percentage=17.5,
            status="submitted",
            comments="Employee2 evaluation",
            created_by=3,
            created_at=datetime.utcnow(),
            submitted_at=datetime.utcnow()
        )
        
        db.add_all([draft_evaluation, submitted_evaluation, approved_evaluation, employee2_evaluation])
        db.commit()
        
        db.close()
    
    def get_token(self, user_id):
        """Helper method to generate a token for a user"""
        # In a real test, you would use the actual token generation logic
        # For simplicity, we'll just return a mock token
        return f"mock_token_for_user_{user_id}"
    
    def test_get_employee_evaluations_as_admin(self):
        """Test that an admin can access any employee's evaluations"""
        token = self.get_token(1)  # Admin user
        response = client.get(
            "/api/evaluations/employee/4",  # Employee1
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify response structure
        data = response.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertIn("page_size", data)
        self.assertIn("total_pages", data)
        
        # Verify total count
        self.assertEqual(data["total"], 3)  # Employee1 has 3 evaluations
        
        # Verify items are returned
        self.assertEqual(len(data["items"]), 3)
    
    def test_get_employee_evaluations_as_manager(self):
        """Test that a manager can access their employee's evaluations"""
        token = self.get_token(2)  # Manager1
        response = client.get(
            "/api/evaluations/employee/4",  # Employee1
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify total count
        data = response.json()
        self.assertEqual(data["total"], 3)  # Employee1 has 3 evaluations
    
    def test_get_employee_evaluations_as_self(self):
        """Test that an employee can access their own evaluations"""
        token = self.get_token(4)  # Employee1
        response = client.get(
            "/api/evaluations/employee/4",  # Employee1
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify total count
        data = response.json()
        self.assertEqual(data["total"], 3)  # Employee1 has 3 evaluations
    
    def test_get_employee_evaluations_unauthorized(self):
        """Test that an employee cannot access another employee's evaluations"""
        token = self.get_token(4)  # Employee1
        response = client.get(
            "/api/evaluations/employee/5",  # Employee2
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 403)  # Forbidden
    
    def test_get_employee_evaluations_not_found(self):
        """Test that requesting evaluations for a non-existent employee returns 404"""
        token = self.get_token(1)  # Admin user
        response = client.get(
            "/api/evaluations/employee/999",  # Non-existent employee
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 404)  # Not Found
    
    def test_get_employee_evaluations_pagination(self):
        """Test pagination of employee evaluations"""
        token = self.get_token(1)  # Admin user
        
        # Test with page_size=2
        response = client.get(
            "/api/evaluations/employee/4?page=1&page_size=2",  # Employee1, first page with 2 items
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["page_size"], 2)
        self.assertEqual(data["total"], 3)
        self.assertEqual(data["total_pages"], 2)
        self.assertEqual(len(data["items"]), 2)
        
        # Test second page
        response = client.get(
            "/api/evaluations/employee/4?page=2&page_size=2",  # Employee1, second page with 1 item
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["page"], 2)
        self.assertEqual(len(data["items"]), 1)
    
    def test_get_employee_evaluations_filtering(self):
        """Test filtering of employee evaluations"""
        token = self.get_token(1)  # Admin user
        
        # Test filtering by status
        response = client.get(
            "/api/evaluations/employee/4?status=submitted",  # Employee1, only submitted evaluations
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["total"], 1)  # Only 1 evaluation with status "submitted"
        self.assertEqual(data["items"][0]["status"], "submitted")
        
        # Test filtering by period
        response = client.get(
            "/api/evaluations/employee/4?period=Q1 2023",  # Employee1, only Q1 2023 evaluations
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["total"], 1)  # Only 1 evaluation for Q1 2023
        self.assertEqual(data["items"][0]["period"], "Q1 2023")
        
        # Test combined filtering
        response = client.get(
            "/api/evaluations/employee/4?status=draft&period=Q1 2023",  # Employee1, draft evaluations for Q1 2023
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["total"], 1)  # Only 1 draft evaluation for Q1 2023
        self.assertEqual(data["items"][0]["status"], "draft")
        self.assertEqual(data["items"][0]["period"], "Q1 2023")

if __name__ == "__main__":
    unittest.main()