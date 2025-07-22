import unittest
import sqlite3
import hashlib
import json
import os
import sys
from fastapi.testclient import TestClient

# Add the parent directory to sys.path to import the main module
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import the FastAPI app from main.py
from main import app, hash_password

# Create a test client
client = TestClient(app)

class TestLogin(unittest.TestCase):
    """Test the login functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Ensure the admin user exists in the database
        self.admin_email = "sgul@trafix.com"
        self.admin_password = "Asdf@12345"
        
        # Check if admin user exists in employee_eval.db
        self._ensure_admin_user_exists()
    
    def _ensure_admin_user_exists(self):
        """Ensure the admin user exists in the database"""
        try:
            # Connect to the database
            conn = sqlite3.connect("./employee_eval.db")
            cursor = conn.cursor()
            
            # Check if admin role exists
            cursor.execute("SELECT * FROM roles WHERE name = 'admin'")
            admin_role = cursor.fetchone()
            
            if not admin_role:
                # Create admin role
                cursor.execute("INSERT INTO roles (name, is_custom) VALUES (?, ?)", 
                              ("admin", 0))
                conn.commit()
                
                # Get the role ID
                cursor.execute("SELECT id FROM roles WHERE name = 'admin'")
                admin_role_id = cursor.fetchone()[0]
            else:
                admin_role_id = admin_role[0]
            
            # Check if admin user exists
            cursor.execute("SELECT * FROM users WHERE email = ?", (self.admin_email,))
            admin_user = cursor.fetchone()
            
            if not admin_user:
                # Create admin user
                password_hash = hash_password(self.admin_password)
                cursor.execute(
                    "INSERT INTO users (email, name, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?)",
                    (self.admin_email, "Admin User", password_hash, admin_role_id, 1)
                )
                conn.commit()
            
            conn.close()
        except Exception as e:
            print(f"Error ensuring admin user exists: {e}")
    
    def test_login_success(self):
        """Test successful login"""
        # Send login request
        response = client.post(
            "/auth/login",
            json={"email": self.admin_email, "password": self.admin_password}
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], self.admin_email)
    
    def test_login_wrong_password(self):
        """Test login with wrong password"""
        # Send login request with wrong password
        response = client.post(
            "/auth/login",
            json={"email": self.admin_email, "password": "wrong_password"}
        )
        
        # Check response
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertIn("detail", data)
        self.assertIn("password", data["detail"].lower())
    
    def test_login_nonexistent_user(self):
        """Test login with nonexistent user"""
        # Send login request with nonexistent user
        response = client.post(
            "/auth/login",
            json={"email": "nonexistent@example.com", "password": "password"}
        )
        
        # Check response
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertIn("detail", data)
        self.assertIn("user", data["detail"].lower())

if __name__ == "__main__":
    unittest.main()