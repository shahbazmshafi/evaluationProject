import unittest
import sys
import os
import logging

# Add the parent directory to the path so we can import the password module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.password import hash_password, verify_password, check_rate_limit, increment_failed_attempts, reset_failed_attempts

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestPasswordUtils(unittest.TestCase):
    """Test the password utility functions"""
    
    def test_password_hashing_and_verification(self):
        """Test that password hashing and verification work correctly"""
        # Test with a simple password
        password = "Asdf@12345"
        hashed_password = hash_password(password)
        
        # Verify the hash is not the same as the password
        self.assertNotEqual(password, hashed_password)
        
        # Verify the password against the hash
        self.assertTrue(verify_password(password, hashed_password))
        
        # Verify an incorrect password fails
        self.assertFalse(verify_password("wrong_password", hashed_password))
        
        # Test with a more complex password
        complex_password = "C0mpl3x!P@ssw0rd#123"
        complex_hashed = hash_password(complex_password)
        
        # Verify the hash is not the same as the password
        self.assertNotEqual(complex_password, complex_hashed)
        
        # Verify the password against the hash
        self.assertTrue(verify_password(complex_password, complex_hashed))
        
        logger.info("Password hashing and verification tests passed")
    
    def test_rate_limiting(self):
        """Test that rate limiting works correctly"""
        # Reset any existing rate limits
        test_user = "test@example.com"
        reset_failed_attempts(test_user)
        
        # Should be allowed initially
        self.assertTrue(check_rate_limit(test_user))
        
        # Increment failed attempts to just below the limit
        for i in range(4):  # Default limit is 5
            increment_failed_attempts(test_user)
            # Should still be allowed
            self.assertTrue(check_rate_limit(test_user))
        
        # One more attempt should trigger the rate limit
        increment_failed_attempts(test_user)
        self.assertFalse(check_rate_limit(test_user))
        
        # Reset should clear the rate limit
        reset_failed_attempts(test_user)
        self.assertTrue(check_rate_limit(test_user))
        
        logger.info("Rate limiting tests passed")

if __name__ == "__main__":
    unittest.main()