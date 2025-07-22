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

class TestManagedKPIs(unittest.TestCase):
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
        employee_user = User(
            id=3, 
            username="employee", 
            email="employee@example.com", 
            hashed_password="hashed_password", 
            role_id=3,
            manager_id=2
        )
        db.add_all([admin_user, manager_user, employee_user])
        db.commit()

        # Create KPIs
        # KPIs created by manager
        manager_kpi1 = KPI(
            id=1,
            title="Manager KPI 1",
            description="First KPI created by manager",
            weightage=10.0,
            type="global",
            status="active",
            created_by=2,  # Manager
            manager_id=2
        )

        manager_kpi2 = KPI(
            id=2,
            title="Manager KPI 2",
            description="Second KPI created by manager",
            weightage=20.0,
            type="role-based",
            target_role_id=3,
            status="draft",
            created_by=2,  # Manager
            manager_id=2
        )

        manager_kpi3 = KPI(
            id=3,
            title="Manager KPI 3",
            description="Third KPI created by manager",
            weightage=30.0,
            type="employee-specific",
            target_employee_id=3,
            status="archived",
            created_by=2,  # Manager
            manager_id=2
        )

        # KPIs created by admin
        admin_kpi = KPI(
            id=4,
            title="Admin Technical KPI",
            description="Technical KPI created by admin",
            weightage=40.0,
            type="global",
            status="active",
            created_by=1,  # Admin
            manager_id=0,
            is_technical=True  # Technical KPI
        )

        admin_admin_kpi = KPI(
            id=5,
            title="Admin Administrative KPI",
            description="Administrative KPI created by admin",
            weightage=20.0,
            type="global",
            status="active",
            created_by=1,  # Admin
            manager_id=0,
            is_technical=False  # Administrative KPI
        )

        db.add_all([manager_kpi1, manager_kpi2, manager_kpi3, admin_kpi, admin_admin_kpi])
        db.commit()

        db.close()

    def get_token(self, user_id):
        """Helper method to generate a token for a user"""
        # In a real test, you would use the actual token generation logic
        # For simplicity, we'll just return a mock token
        return f"mock_token_for_user_{user_id}"

    def test_get_managed_kpis_as_manager(self):
        """Test that a manager can access their created KPIs and admin global administrative KPIs"""
        token = self.get_token(2)  # Manager user
        response = client.get(
            "/api/kpis/managed",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 4)  # Should return all 3 KPIs created by the manager plus admin's global administrative KPI

        # Verify KPI titles are present
        kpi_titles = [kpi["title"] for kpi in kpis]
        self.assertIn("Manager KPI 1", kpi_titles)
        self.assertIn("Manager KPI 2", kpi_titles)
        self.assertIn("Manager KPI 3", kpi_titles)
        self.assertIn("Admin Administrative KPI", kpi_titles)

    def test_get_managed_kpis_as_admin(self):
        """Test that an admin can access their created KPIs"""
        token = self.get_token(1)  # Admin user
        response = client.get(
            "/api/kpis/managed",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 2)  # Should return both KPIs created by the admin

        # Verify KPI titles are present
        kpi_titles = [kpi["title"] for kpi in kpis]
        self.assertIn("Admin Technical KPI", kpi_titles)
        self.assertIn("Admin Administrative KPI", kpi_titles)

    def test_get_managed_kpis_as_employee(self):
        """Test that an employee cannot access the managed KPIs endpoint"""
        token = self.get_token(3)  # Employee user
        response = client.get(
            "/api/kpis/managed",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 403)  # Forbidden

    def test_get_managed_kpis_with_status_filter(self):
        """Test filtering managed KPIs by status"""
        token = self.get_token(2)  # Manager user
        response = client.get(
            "/api/kpis/managed?status=active",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 2)  # Should return both active KPIs (manager's and admin's)

        # Verify KPI titles are present
        kpi_titles = [kpi["title"] for kpi in kpis]
        self.assertIn("Manager KPI 1", kpi_titles)
        self.assertIn("Admin Administrative KPI", kpi_titles)

    def test_get_managed_kpis_with_type_filter(self):
        """Test filtering managed KPIs by type"""
        token = self.get_token(2)  # Manager user
        response = client.get(
            "/api/kpis/managed?type=role-based",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 1)  # Should return only the role-based KPI
        self.assertEqual(kpis[0]["title"], "Manager KPI 2")

    def test_get_managed_kpis_with_sorting(self):
        """Test sorting managed KPIs"""
        token = self.get_token(2)  # Manager user
        response = client.get(
            "/api/kpis/managed?sort_by=title",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 4)  # Should return all 4 KPIs (3 manager's + 1 admin's)

        # Verify KPIs are sorted by title
        kpi_titles = [kpi["title"] for kpi in kpis]
        self.assertEqual(kpi_titles, ["Admin Administrative KPI", "Manager KPI 1", "Manager KPI 2", "Manager KPI 3"])

    def test_get_managed_kpis_with_combined_filters(self):
        """Test combining filters for managed KPIs"""
        token = self.get_token(2)  # Manager user
        response = client.get(
            "/api/kpis/managed?status=draft&type=role-based",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()
        self.assertEqual(len(kpis), 1)  # Should return only the draft role-based KPI
        self.assertEqual(kpis[0]["title"], "Manager KPI 2")

    def test_manager_can_see_admin_global_administrative_kpis(self):
        """Test that a manager can see admin-created global administrative KPIs"""
        token = self.get_token(2)  # Manager user
        response = client.get(
            "/api/kpis/managed",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        kpis = response.json()

        # Should return all 3 KPIs created by the manager plus the admin's global administrative KPI
        self.assertEqual(len(kpis), 4)

        # Verify KPI titles are present
        kpi_titles = [kpi["title"] for kpi in kpis]
        self.assertIn("Manager KPI 1", kpi_titles)
        self.assertIn("Manager KPI 2", kpi_titles)
        self.assertIn("Manager KPI 3", kpi_titles)
        self.assertIn("Admin Administrative KPI", kpi_titles)

        # Verify the admin's global technical KPI is NOT included
        self.assertNotIn("Admin Technical KPI", kpi_titles)

        # Verify the admin's global administrative KPI has the correct properties
        admin_admin_kpi = next(kpi for kpi in kpis if kpi["title"] == "Admin Administrative KPI")
        self.assertEqual(admin_admin_kpi["type"], "global")
        self.assertEqual(admin_admin_kpi["isTechnical"], False)
        self.assertEqual(admin_admin_kpi["createdBy"], "1")  # Created by admin (ID 1)

if __name__ == "__main__":
    unittest.main()
