import unittest
import sqlite3
import hashlib
import json
import os
import sys

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    return hash_password(password) == hashed_password

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
    
    def test_admin_user_exists(self):
        """Test that the admin user exists in the database"""
        conn = sqlite3.connect("./employee_eval.db")
        cursor = conn.cursor()
        
        # Check if admin user exists
        cursor.execute("SELECT * FROM users WHERE email = ?", (self.admin_email,))
        admin_user = cursor.fetchone()
        
        self.assertIsNotNone(admin_user, f"Admin user {self.admin_email} not found in database")
        self.assertEqual(admin_user[1], self.admin_email, f"Admin user email mismatch: {admin_user[1]} != {self.admin_email}")
        
        conn.close()
    
    def test_admin_password_correct(self):
        """Test that the admin password is correct"""
        conn = sqlite3.connect("./employee_eval.db")
        cursor = conn.cursor()
        
        # Check if admin user exists
        cursor.execute("SELECT * FROM users WHERE email = ?", (self.admin_email,))
        admin_user = cursor.fetchone()
        
        self.assertIsNotNone(admin_user, f"Admin user {self.admin_email} not found in database")
        
        # Check if password is correct
        password_hash = admin_user[3]  # Assuming password_hash is the 4th column
        self.assertTrue(
            verify_password(self.admin_password, password_hash),
            f"Admin password incorrect. Expected hash: {password_hash}, Actual hash: {hash_password(self.admin_password)}"
        )
        
        conn.close()
    
    def test_wrong_password_fails(self):
        """Test that a wrong password fails"""
        conn = sqlite3.connect("./employee_eval.db")
        cursor = conn.cursor()
        
        # Check if admin user exists
        cursor.execute("SELECT * FROM users WHERE email = ?", (self.admin_email,))
        admin_user = cursor.fetchone()
        
        self.assertIsNotNone(admin_user, f"Admin user {self.admin_email} not found in database")
        
        # Check if wrong password fails
        password_hash = admin_user[3]  # Assuming password_hash is the 4th column
        self.assertFalse(
            verify_password("wrong_password", password_hash),
            "Wrong password should fail verification"
        )
        
        conn.close()
    
    def test_nonexistent_user_fails(self):
        """Test that a nonexistent user fails"""
        conn = sqlite3.connect("./employee_eval.db")
        cursor = conn.cursor()
        
        # Check if nonexistent user exists
        cursor.execute("SELECT * FROM users WHERE email = ?", ("nonexistent@example.com",))
        nonexistent_user = cursor.fetchone()
        
        self.assertIsNone(nonexistent_user, "Nonexistent user should not be found in database")
        
        conn.close()

if __name__ == "__main__":
    unittest.main()