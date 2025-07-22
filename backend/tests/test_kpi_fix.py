import unittest
from fastapi.testclient import TestClient
import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

# Create a test client
client = TestClient(app)

class TestKPIFix(unittest.TestCase):
    def test_create_kpi_as_admin(self):
        """Test creating a KPI as an admin user"""
        # Mock login as admin
        login_response = client.post(
            "/token",
            data={"username": "admin", "password": "password"}
        )
        
        # Check if login was successful
        if login_response.status_code != 200:
            self.skipTest("Could not log in as admin. Test environment may not be properly set up.")
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a global KPI with the same payload that was causing the error
        kpi_data = {
            "title": "Admin Create 100KPI global",
            "description": "Admin Create 100KPI global",
            "weightage": 100,
            "is_technical": True,
            "status": "active",
            "target_employee_id": None,
            "target_role_id": None,
            "type": "global"
        }
        
        response = client.post("/kpis", json=kpi_data, headers=headers)
        
        # Print response for debugging
        print(f"Response status code: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        # Assert that the request was successful
        self.assertEqual(response.status_code, 201)
        
        # Verify the KPI was created with the correct data
        created_kpi = response.json()
        self.assertEqual(created_kpi["title"], kpi_data["title"])
        self.assertEqual(created_kpi["description"], kpi_data["description"])
        self.assertEqual(created_kpi["weightage"], kpi_data["weightage"])
        self.assertEqual(created_kpi["type"], kpi_data["type"])

if __name__ == "__main__":
    unittest.main()