import os
import logging
from passlib.context import CryptContext
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize password context with bcrypt
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
    logger.info("Password hashing context initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize password context: {e}")
    raise

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: The plaintext password to hash
        
    Returns:
        str: The hashed password
    """
    try:
        hashed_password = pwd_context.hash(password)
        return hashed_password
    except Exception as e:
        logger.error(f"Password hashing error: {e}")
        raise

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash using constant-time comparison.
    
    Args:
        plain_password: The plaintext password to check
        hashed_password: The hashed password to check against
        
    Returns:
        bool: True if the password matches, False otherwise
    """
    try:
        # Use passlib's verify method which uses constant-time comparison
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

# Rate limiting for failed login attempts
# Simple in-memory implementation (would use Redis or similar in production)
failed_attempts = {}

def check_rate_limit(user_id: str, max_attempts: int = 5, reset_after_seconds: int = 300) -> bool:
    """
    Check if a user has exceeded the rate limit for failed login attempts.
    
    Args:
        user_id: Identifier for the user (email or IP address)
        max_attempts: Maximum number of failed attempts allowed
        reset_after_seconds: Time in seconds after which the counter resets
        
    Returns:
        bool: True if the user is allowed to attempt login, False if rate limited
    """
    import time
    current_time = time.time()
    
    # Clean up old entries
    for uid in list(failed_attempts.keys()):
        if current_time - failed_attempts[uid]["timestamp"] > reset_after_seconds:
            del failed_attempts[uid]
    
    # Check if user is in the dictionary
    if user_id not in failed_attempts:
        failed_attempts[user_id] = {"count": 0, "timestamp": current_time}
        return True
    
    # Check if time has elapsed to reset
    if current_time - failed_attempts[user_id]["timestamp"] > reset_after_seconds:
        failed_attempts[user_id] = {"count": 0, "timestamp": current_time}
        return True
    
    # Check if max attempts reached
    if failed_attempts[user_id]["count"] >= max_attempts:
        return False
    
    return True

def increment_failed_attempts(user_id: str) -> None:
    """
    Increment the failed login attempt counter for a user.
    
    Args:
        user_id: Identifier for the user (email or IP address)
    """
    import time
    if user_id in failed_attempts:
        failed_attempts[user_id]["count"] += 1
        failed_attempts[user_id]["timestamp"] = time.time()
    else:
        failed_attempts[user_id] = {"count": 1, "timestamp": time.time()}

def reset_failed_attempts(user_id: str) -> None:
    """
    Reset the failed login attempt counter for a user after successful login.
    
    Args:
        user_id: Identifier for the user (email or IP address)
    """
    if user_id in failed_attempts:
        del failed_attempts[user_id]