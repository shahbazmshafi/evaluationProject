import sqlite3
import hashlib
import json

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    return hash_password(password) == hashed_password

def test_login_direct(email: str, password: str) -> bool:
    """
    Test login functionality directly by querying the database
    """
    print(f"Testing login with email: {email}, password: {password}")
    
    try:
        # Connect to the database
        conn = sqlite3.connect("./employee_eval.db")
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"User not found: {email}")
            return False
        
        # Check if password is correct
        password_hash = user[3]  # Assuming password_hash is the 4th column
        if not verify_password(password, password_hash):
            print(f"Invalid password for user: {email}")
            print(f"Expected hash: {password_hash}")
            print(f"Actual hash: {hash_password(password)}")
            return False
        
        print(f"Login successful for user: {email}")
        print(f"User details: ID={user[0]}, Email={user[1]}, Name={user[2]}, Role ID={user[4]}")
        
        # Get role information
        cursor.execute("SELECT * FROM roles WHERE id = ?", (user[4],))
        role = cursor.fetchone()
        if role:
            print(f"Role: ID={role[0]}, Name={role[1]}")
        
        conn.close()
        return True
    except Exception as e:
        print(f"Error testing login: {e}")
        return False

if __name__ == "__main__":
    # Test login with admin user
    admin_email = "sgul@trafix.com"
    admin_password = "Asdf@12345"
    
    test_login_direct(admin_email, admin_password)
    
    # Also test with incorrect password for comparison
    print("\n--- Testing with incorrect password ---")
    test_login_direct(admin_email, "wrong_password")