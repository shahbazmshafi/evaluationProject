import sqlite3
import requests
import json
import logging
import sys
import os

# Add the parent directory to the path so we can import the password module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.password import hash_password, verify_password

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_admin_login():
    """Test login with the admin user"""
    # Admin credentials
    admin_email = "sgul@trafix.com"
    admin_password = "Asdf@12345"
    
    # First, verify the admin user exists in the database
    try:
        conn = sqlite3.connect("./data/employee_eval.db")
        cursor = conn.cursor()
        
        # Get admin user
        cursor.execute("SELECT id, email, name, password_hash FROM users WHERE email = ?", (admin_email,))
        admin_user = cursor.fetchone()
        
        if not admin_user:
            logger.error(f"Admin user {admin_email} not found in database")
            return False
        
        user_id, email, name, password_hash = admin_user
        
        logger.info(f"Found admin user: {email}")
        
        # Verify the password hash
        if not verify_password(admin_password, password_hash):
            logger.error(f"Admin password verification failed")
            logger.error(f"This indicates a mismatch between the password hashing methods")
            return False
        
        logger.info("Admin password hash verification successful")
        
        # Test login API
        try:
            # Make a request to the login endpoint
            response = requests.post(
                "http://localhost:8000/auth/login",
                json={"email": admin_email, "password": admin_password}
            )
            
            if response.status_code == 200:
                logger.info("Login API test successful")
                data = response.json()
                logger.info(f"Received access token: {data.get('access_token')[:10]}...")
                return True
            else:
                logger.error(f"Login API test failed with status code {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
                
        except requests.RequestException as e:
            logger.error(f"Error making login request: {e}")
            logger.info("Note: Make sure the API server is running")
            return False
            
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        return False
    finally:
        if conn:
            conn.close()

def test_failed_login():
    """Test login with incorrect password"""
    # Admin email with wrong password
    admin_email = "sgul@trafix.com"
    wrong_password = "WrongPassword123"
    
    try:
        # Make a request to the login endpoint
        response = requests.post(
            "http://localhost:8000/auth/login",
            json={"email": admin_email, "password": wrong_password}
        )
        
        if response.status_code == 401:
            logger.info("Failed login test successful (got expected 401 error)")
            return True
        else:
            logger.error(f"Failed login test failed with unexpected status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        logger.error(f"Error making login request: {e}")
        return False

def test_rate_limiting():
    """Test rate limiting for failed login attempts"""
    # Admin email with wrong password
    admin_email = "rate_limit_test@example.com"
    wrong_password = "WrongPassword123"
    
    try:
        # Make multiple failed login attempts
        for i in range(6):  # Default limit is 5
            response = requests.post(
                "http://localhost:8000/auth/login",
                json={"email": admin_email, "password": wrong_password}
            )
            
            if i < 5:
                if response.status_code != 401:
                    logger.error(f"Expected 401 error for attempt {i+1}, got {response.status_code}")
                    return False
                logger.info(f"Attempt {i+1}: Got expected 401 error")
            else:
                # The 6th attempt should be rate limited
                if response.status_code == 429:
                    logger.info("Rate limiting test successful (got expected 429 error)")
                    return True
                else:
                    logger.error(f"Expected 429 error for attempt {i+1}, got {response.status_code}")
                    logger.error(f"Response: {response.text}")
                    return False
                
    except requests.RequestException as e:
        logger.error(f"Error making login request: {e}")
        return False

if __name__ == "__main__":
    logger.info("Testing authentication flow...")
    
    # Run tests
    admin_login_success = test_admin_login()
    failed_login_success = test_failed_login()
    
    # Only test rate limiting if the server is running
    if admin_login_success or failed_login_success:
        rate_limiting_success = test_rate_limiting()
    else:
        logger.warning("Skipping rate limiting test because server appears to be down")
        rate_limiting_success = None
    
    # Print summary
    logger.info("\nTest Summary:")
    logger.info(f"Admin Login Test: {'PASSED' if admin_login_success else 'FAILED'}")
    logger.info(f"Failed Login Test: {'PASSED' if failed_login_success else 'FAILED'}")
    
    if rate_limiting_success is not None:
        logger.info(f"Rate Limiting Test: {'PASSED' if rate_limiting_success else 'FAILED'}")
    else:
        logger.info("Rate Limiting Test: SKIPPED")
    
    # Overall result
    if admin_login_success and failed_login_success and (rate_limiting_success or rate_limiting_success is None):
        logger.info("\nAll tests PASSED!")
        sys.exit(0)
    else:
        logger.error("\nSome tests FAILED!")
        sys.exit(1)