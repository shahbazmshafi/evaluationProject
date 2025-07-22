# Configuration module for the application
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/employee_eval.db")

# Security configuration
SECRET_KEY = "project-bolt-secure-key-for-jwt-token-validation"

# CORS configuration
CORS_ORIGINS = ["*"]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]