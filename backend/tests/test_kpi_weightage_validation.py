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

class TestKPIWeightageValidation(unittest.TestCase):
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
            hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password: "password"
            role_id=1,
            manager_id=None,
            name="Admin User",
            is_active=True
        )
        
        manager_user = User(
            id=2, 
            username="manager", 
            email="manager@example.com", 
            hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password: "password"
            role_id=2,
            manager_id=1,
            name="Manager User",
            is_active=True
        )
        
        employee_user = User(
            id=3, 
            username="employee", 
            email="employee@example.com", 
            hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password: "password"
            role_id=3,
            manager_id=2,
            name="Employee User",
            is_active=True
        )
        
        db.add_all([admin_user, manager_user, employee_user])
        db.commit()
        
        db.close()
    
    def get_token(self, username, password="password"):
        """Helper method to get a token for a user"""
        response = client.post(
            "/token",
            data={"username": username, "password": password}
        )
        return response.json()["access_token"]
    
    def test_01_total_weightage_validation(self):
        """Test that the total weightage validation works correctly"""
        # Login as admin
        token = self.get_token("admin")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create KPIs that add up to 90% for employee
        kpi_data_1 = {
            "title": "Employee KPI 1",
            "description": "First KPI for employee",
            "weightage": 40,
            "type": "employee-specific",
            "target_employee_id": 3,
            "status": "active",
            "is_technical": True
        }
        
        response = client.post("/kpis", json=kpi_data_1, headers=headers)
        self.assertEqual(response.status_code, 201)
        
        kpi_data_2 = {
            "title": "Employee KPI 2",
            "description": "Second KPI for employee",
            "weightage": 50,
            "type": "employee-specific",
            "target_employee_id": 3,
            "status": "active",
            "is_technical": False
        }
        
        response = client.post("/kpis", json=kpi_data_2, headers=headers)
        self.assertEqual(response.status_code, 201)
        
        # Try to create a KPI that would exceed the 100% limit
        kpi_data_3 = {
            "title": "Employee KPI 3",
            "description": "Third KPI for employee that would exceed the limit",
            "weightage": 20,
            "type": "employee-specific",
            "target_employee_id": 3,
            "status": "active",
            "is_technical": True
        }
        
        response = client.post("/kpis", json=kpi_data_3, headers=headers)
        
        # Verify that the request is rejected with a 400 Bad Request
        self.assertEqual(response.status_code, 400)
        
        # Verify that the error message contains information about the exceeded limit
        error_detail = response.json()["detail"]
        self.assertIn("exceed the 100% limit", error_detail)
        self.assertIn("Current total: 90%", error_detail)
        self.assertIn("New KPI weightage: 20%", error_detail)
        self.assertIn("Would exceed by: 10%", error_detail)
        self.assertIn("Current KPIs:", error_detail)
        self.assertIn("Available weightage: 10%", error_detail)
    
    def test_02_update_kpi_weightage_validation(self):
        """Test that the weightage validation works when updating a KPI"""
        # Login as admin
        token = self.get_token("admin")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a KPI with weightage 10%
        kpi_data = {
            "title": "Update Test KPI",
            "description": "KPI for testing updates",
            "weightage": 10,
            "type": "employee-specific",
            "target_employee_id": 3,
            "status": "active",
            "is_technical": True
        }
        
        response = client.post("/kpis", json=kpi_data, headers=headers)
        self.assertEqual(response.status_code, 201)
        kpi_id = response.json()["id"]
        
        # Try to update the KPI to a weightage that would exceed the 100% limit
        update_data = {
            "weightage": 30
        }
        
        response = client.put(f"/kpis/{kpi_id}", json=update_data, headers=headers)
        
        # Verify that the request is rejected with a 400 Bad Request
        self.assertEqual(response.status_code, 400)
        
        # Verify that the error message contains information about the exceeded limit
        error_detail = response.json()["detail"]
        self.assertIn("exceed the 100% limit", error_detail)
        self.assertIn("Current total:", error_detail)
        self.assertIn("New KPI weightage: 30%", error_detail)
        self.assertIn("Would exceed by:", error_detail)
        self.assertIn("Current KPIs:", error_detail)
        self.assertIn("Available weightage:", error_detail)
    
    def test_03_technical_administrative_categorization(self):
        """Test that the technical/administrative categorization is maintained"""
        # Login as admin
        token = self.get_token("admin")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a technical KPI
        technical_kpi_data = {
            "title": "Technical KPI",
            "description": "A technical KPI",
            "weightage": 30,
            "type": "global",
            "status": "active",
            "is_technical": True
        }
        
        response = client.post("/kpis", json=technical_kpi_data, headers=headers)
        self.assertEqual(response.status_code, 201)
        technical_kpi = response.json()
        self.assertTrue(technical_kpi["is_technical"])
        
        # Create an administrative KPI
        admin_kpi_data = {
            "title": "Administrative KPI",
            "description": "An administrative KPI",
            "weightage": 20,
            "type": "global",
            "status": "active",
            "is_technical": False
        }
        
        response = client.post("/kpis", json=admin_kpi_data, headers=headers)
        self.assertEqual(response.status_code, 201)
        admin_kpi = response.json()
        self.assertFalse(admin_kpi["is_technical"])
        
        # Get the employee's KPIs and verify both types are included
        token = self.get_token("employee")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/api/kpis/employee/3", headers=headers)
        self.assertEqual(response.status_code, 200)
        
        kpis = response.json()
        technical_kpis = [kpi for kpi in kpis if kpi["is_technical"]]
        admin_kpis = [kpi for kpi in kpis if not kpi["is_technical"]]
        
        self.assertTrue(len(technical_kpis) > 0)
        self.assertTrue(len(admin_kpis) > 0)

if __name__ == "__main__":
    unittest.main()