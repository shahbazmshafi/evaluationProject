import sqlite3
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
# Use the same path as migrate_db.py
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
EMPLOYEE_DB = os.path.join(DATA_DIR, "employee_eval.db")

def test_evaluation_columns():
    """
    Test that the evaluations table has the correct columns and indices.
    """
    try:
        # Print the full path of the database file
        db_path = os.path.abspath(EMPLOYEE_DB)
        logger.info(f"Using database file: {db_path}")
        
        # Connect to the database
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()
        
        # Check if the evaluations table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluations'")
        if not cursor.fetchone():
            logger.error("Evaluations table does not exist")
            return False
            
        # Check the columns in the evaluations table
        cursor.execute("PRAGMA table_info(evaluations)")
        columns = {col[1]: col for col in cursor.fetchall()}
        
        # Check if drafted_by and submitted_by columns exist
        if 'drafted_by' not in columns:
            logger.error("drafted_by column does not exist in evaluations table")
            return False
        if 'submitted_by' not in columns:
            logger.error("submitted_by column does not exist in evaluations table")
            return False
            
        logger.info("drafted_by and submitted_by columns exist in evaluations table")
        
        # Check if indices exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='evaluations'")
        indices = [idx[0] for idx in cursor.fetchall()]
        
        if 'idx_evaluations_drafted_by' not in indices:
            logger.error("idx_evaluations_drafted_by index does not exist")
            return False
        if 'idx_evaluations_submitted_by' not in indices:
            logger.error("idx_evaluations_submitted_by index does not exist")
            return False
            
        logger.info("idx_evaluations_drafted_by and idx_evaluations_submitted_by indices exist")
        
        # Test inserting and updating an evaluation
        # First, check if we have any users in the database
        cursor.execute("SELECT id FROM users LIMIT 1")
        user = cursor.fetchone()
        
        if not user:
            logger.warning("No users found in the database, creating a test user")
            cursor.execute("""
            INSERT INTO users (email, password, first_name, last_name, role_id)
            VALUES ('test@example.com', 'password', 'Test', 'User', 1)
            """)
            conn.commit()
            cursor.execute("SELECT id FROM users LIMIT 1")
            user = cursor.fetchone()
        
        user_id = user[0]
        
        # Insert a test evaluation
        cursor.execute("""
        INSERT INTO evaluations (
            employee_id, manager_id, period, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (user_id, user_id, '2025-Q2', 'draft', user_id))
        
        evaluation_id = cursor.lastrowid
        logger.info(f"Created test evaluation with ID {evaluation_id}")
        
        # Update the evaluation to set drafted_by
        cursor.execute("""
        UPDATE evaluations SET drafted_by = ? WHERE id = ?
        """, (user_id, evaluation_id))
        
        # Verify drafted_by was set
        cursor.execute("SELECT drafted_by FROM evaluations WHERE id = ?", (evaluation_id,))
        drafted_by = cursor.fetchone()[0]
        
        if drafted_by != user_id:
            logger.error(f"drafted_by was not set correctly. Expected {user_id}, got {drafted_by}")
            return False
            
        logger.info(f"drafted_by was set correctly to {drafted_by}")
        
        # Update the evaluation to set submitted_by
        cursor.execute("""
        UPDATE evaluations SET status = 'submitted', submitted_by = ?, submitted_at = datetime('now')
        WHERE id = ?
        """, (user_id, evaluation_id))
        
        # Verify submitted_by was set
        cursor.execute("SELECT submitted_by FROM evaluations WHERE id = ?", (evaluation_id,))
        submitted_by = cursor.fetchone()[0]
        
        if submitted_by != user_id:
            logger.error(f"submitted_by was not set correctly. Expected {user_id}, got {submitted_by}")
            return False
            
        logger.info(f"submitted_by was set correctly to {submitted_by}")
        
        # Clean up
        cursor.execute("DELETE FROM evaluations WHERE id = ?", (evaluation_id,))
        conn.commit()
        
        logger.info("Test completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error during test: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # Change to project root
    if test_evaluation_columns():
        logger.info("All tests passed!")
    else:
        logger.error("Tests failed!")