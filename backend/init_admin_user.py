import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys
import logging

# Add parent directory to path to import from main.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import LocalStorageUsers, LocalStoragePasswords, Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_admin_user():
    """
    Initialize the database tables for the application
    """
    try:
        # Connect to the main database
        DATA_DIR = "data"
        os.makedirs(DATA_DIR, exist_ok=True)
        DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/employee_eval.db")
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)

        # Get a database session
        db = SessionLocal()

        try:
            # Check if localStorage_users table has data
            localStorage_users = db.query(LocalStorageUsers).filter(LocalStorageUsers.id == 1).first()

            if not localStorage_users:
                # Initialize with empty array
                localStorage_users = LocalStorageUsers(id=1, data=json.dumps([]))
                db.add(localStorage_users)

            # Check if localStorage_passwords table has data
            localStorage_passwords = db.query(LocalStoragePasswords).filter(LocalStoragePasswords.id == 1).first()

            if not localStorage_passwords:
                # Initialize with empty object
                localStorage_passwords = LocalStoragePasswords(id=1, data=json.dumps({}))
                db.add(localStorage_passwords)

            db.commit()
            logger.info("localStorage tables in the main database initialized successfully")

        except Exception as e:
            db.rollback()
            logger.error(f"Error initializing localStorage tables: {e}", exc_info=True)
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error connecting to database: {e}", exc_info=True)

if __name__ == "__main__":
    init_admin_user()
