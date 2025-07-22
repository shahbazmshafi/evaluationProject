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

from main import app, Base, get_db, User, Role, KPI

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

class TestEmployeeKPIs(unittest.TestCase):
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
        manager_user = User(
            id=2, 
            username="manager", 
            email="manager@example.com", 
            hashed_password="hashed_password", 
            role_id=2,
            manager_id=1
        )
        employee1 = User(
            id=3, 
            username="employee1", 
            email="employee1@example.com", 
            hashed_password="hashed_password", 
            role_id=3,
            manager_id=2
        )
        employee2 = User(
            id=4, 
            username="employee2", 
            email="employee2@example.com", 
            hashed_password="hashed_password", 
            role_id=3,
            manager_id=2
        )
        db.add_all([admin_user, manager_user, employee1, employee2])
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
        
        # Role-based KPI for employees
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
        
        # Employee-specific KPI for employee1
        employee_specific_kpi = KPI(
            id=3,
            title="Employee1 Specific KPI",
            description="A KPI specifically for employee1",
            weightage=30.0,
            type="employee-specific",
            target_employee_id=3,
            status="active",
            created_by=2,
            manager_id=2
        )
        
        # Inactive KPI (should not be returned)
        inactive_kpi = KPI(
            id=4,
            title="Inactive KPI",
            description="An inactive KPI",
            weightage=10.0,
            type="global",
            status="draft",
            created_by=1,
            manager_id=0
        )
        
        db.add_all([global_kpi, role_based_kpi, employee_specific_kpi, inactive_kpi])
        db.commit()
        
        db.close()
    
    def get_token(self, user_id):
        """Helper method to generate a token for a user"""
        # In a real test, you would use the actual token generation logic
        # For simplicity, we'll just return a mock token
        return f"mock_token_for_user_{user_id}"
    
    def test_get_employee_kpis_as_admin(self):
        """Test that an admin can access any employee's KPIs"""
        token = self.get_token(1)  # Admin user
        response = client.get(
            "/api/kpis/employee/3",  # Employee1
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 3)  # Should return 3 KPIs (global, role-based, employee-specific)
        
        # Verify KPI titles are present
        kpi_titles = [kpi["title"] for kpi in kpis]
        self.assertIn("Global KPI", kpi_titles)
        self.assertIn("Employee Role KPI", kpi_titles)
        self.assertIn("Employee1 Specific KPI", kpi_titles)
    
    def test_get_employee_kpis_as_manager(self):
        """Test that a manager can access their employee's KPIs"""
        token = self.get_token(2)  # Manager user
        response = client.get(
            "/api/kpis/employee/3",  # Employee1
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 3)  # Should return 3 KPIs
    
    def test_get_employee_kpis_as_self(self):
        """Test that an employee can access their own KPIs"""
        token = self.get_token(3)  # Employee1
        response = client.get(
            "/api/kpis/employee/3",  # Employee1
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 3)  # Should return 3 KPIs
    
    def test_get_employee_kpis_unauthorized(self):
        """Test that an employee cannot access another employee's KPIs"""
        token = self.get_token(4)  # Employee2
        response = client.get(
            "/api/kpis/employee/3",  # Employee1
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 403)  # Forbidden
    
    def test_get_employee_kpis_not_found(self):
        """Test that requesting KPIs for a non-existent employee returns 404"""
        token = self.get_token(1)  # Admin user
        response = client.get(
            "/api/kpis/employee/999",  # Non-existent employee
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 404)  # Not Found
    
    def test_get_employee_kpis_no_manager_specific(self):
        """Test for an employee with no manager-specific KPIs"""
        token = self.get_token(1)  # Admin user
        response = client.get(
            "/api/kpis/employee/4",  # Employee2 (has no employee-specific KPIs)
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 2)  # Should return 2 KPIs (global, role-based)
        
        # Verify KPI titles are present
        kpi_titles = [kpi["title"] for kpi in kpis]
        self.assertIn("Global KPI", kpi_titles)
        self.assertIn("Employee Role KPI", kpi_titles)
        self.assertNotIn("Employee1 Specific KPI", kpi_titles)

if __name__ == "__main__":
    unittest.main()