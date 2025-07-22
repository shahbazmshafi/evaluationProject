import os
import sqlite3
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DATA_DIR = "data"
EMPLOYEE_DB = os.path.join(DATA_DIR, "employee_eval.db")

def migrate_database():
    """Apply database migrations"""
    try:
        # Ensure data directory exists
        os.makedirs(DATA_DIR, exist_ok=True)
        
        # Print the full path of the database file
        db_path = os.path.abspath(EMPLOYEE_DB)
        logger.info(f"Using database file: {db_path}")

        # Connect to the database
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()

        # Check if evaluation_cycles table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluation_cycles'")
        if not cursor.fetchone():
            logger.info("Creating evaluation_cycles table")
            cursor.execute('''
            CREATE TABLE evaluation_cycles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                evaluation_start_date DATE NOT NULL,
                evaluation_end_date DATE NOT NULL,
                execution_start_date DATE NOT NULL,
                execution_end_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_by INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
            ''')
            logger.info("evaluation_cycles table created successfully")
        else:
            logger.info("evaluation_cycles table already exists")

        # Check if kpis table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='kpis'")
        if not cursor.fetchone():
            logger.info("Creating kpis table")
            cursor.execute('''
            CREATE TABLE kpis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                weightage FLOAT NOT NULL,
                type VARCHAR(50) NOT NULL,
                target_role_id INTEGER,
                target_employee_id INTEGER,
                status VARCHAR(50) DEFAULT 'active',
                created_by INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                manager_id INTEGER,
                is_technical BOOLEAN DEFAULT 1,
                FOREIGN KEY (target_role_id) REFERENCES roles(id),
                FOREIGN KEY (target_employee_id) REFERENCES users(id),
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (manager_id) REFERENCES users(id)
            )
            ''')
            logger.info("kpis table created successfully")
        else:
            logger.info("kpis table already exists")

        # Check if evaluations table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluations'")
        if not cursor.fetchone():
            logger.info("Creating evaluations table")
            cursor.execute('''
            CREATE TABLE evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                manager_id INTEGER NOT NULL,
                period VARCHAR(255) NOT NULL,
                raw_score FLOAT,
                normalized_score FLOAT,
                performance_label VARCHAR(255),
                increment_percentage FLOAT,
                status VARCHAR(50) DEFAULT 'draft',
                comments TEXT,
                manager_comments TEXT,
                admin_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                submitted_at TIMESTAMP,
                approved_at TIMESTAMP,
                rejected_at TIMESTAMP,
                created_by INTEGER NOT NULL,
                FOREIGN KEY (employee_id) REFERENCES users(id),
                FOREIGN KEY (manager_id) REFERENCES users(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
            ''')
            logger.info("evaluations table created successfully")
        else:
            logger.info("evaluations table already exists")

        # Check if cycle_id column exists in evaluations table
        cursor.execute("PRAGMA table_info(evaluations)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'cycle_id' not in columns:
            logger.info("Adding cycle_id column to evaluations table")
            cursor.execute('''
            ALTER TABLE evaluations ADD COLUMN cycle_id INTEGER REFERENCES evaluation_cycles(id)
            ''')
            logger.info("cycle_id column added successfully")
        else:
            logger.info("cycle_id column already exists")
            
        # Check if submitted_by column exists in evaluations table
        if 'submitted_by' not in columns:
            logger.info("Adding submitted_by column to evaluations table")
            cursor.execute('''
            ALTER TABLE evaluations ADD COLUMN submitted_by INTEGER REFERENCES users(id) DEFAULT NULL
            ''')
            logger.info("submitted_by column added successfully")
        else:
            logger.info("submitted_by column already exists")
            
        # Check if drafted_by column exists in evaluations table
        if 'drafted_by' not in columns:
            logger.info("Adding drafted_by column to evaluations table")
            cursor.execute('''
            ALTER TABLE evaluations ADD COLUMN drafted_by INTEGER REFERENCES users(id) DEFAULT NULL
            ''')
            logger.info("drafted_by column added successfully")
        else:
            logger.info("drafted_by column already exists")
            
        # Check if the misspelled submitted_by column exists and migrate data if needed
        if 'submitted_by' in columns:
            logger.info("Found misspelled submitted_by column, migrating data to submitted_by")
            # Copy data from misspelled column to correct column
            cursor.execute('''
            UPDATE evaluations SET submitted_by = submitted_by WHERE submitted_by IS NOT NULL
            ''')
            logger.info("Data migrated from submitted_by to submitted_by successfully")

        # Check if kpi_evaluations table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='kpi_evaluations'")
        if not cursor.fetchone():
            logger.info("Creating kpi_evaluations table")
            cursor.execute('''
            CREATE TABLE kpi_evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                evaluation_id INTEGER NOT NULL,
                kpi_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(50),
                weightage FLOAT NOT NULL,
                rating INTEGER,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evaluation_id) REFERENCES evaluations(id),
                FOREIGN KEY (kpi_id) REFERENCES kpis(id)
            )
            ''')
            logger.info("kpi_evaluations table created successfully")
        else:
            logger.info("kpi_evaluations table already exists")

        # Check if kpi_ratings table exists (kept for backward compatibility)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='kpi_ratings'")
        if not cursor.fetchone():
            logger.info("Creating kpi_ratings table")
            cursor.execute('''
            CREATE TABLE kpi_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                evaluation_id INTEGER NOT NULL,
                kpi_id INTEGER NOT NULL,
                rating INTEGER,
                comment TEXT,
                weightage FLOAT,
                FOREIGN KEY (evaluation_id) REFERENCES evaluations(id),
                FOREIGN KEY (kpi_id) REFERENCES kpis(id)
            )
            ''')
            logger.info("kpi_ratings table created successfully")
        else:
            logger.info("kpi_ratings table already exists")

        conn.commit()
        conn.close()
        logger.info("Database migration completed successfully")
    except Exception as e:
        logger.error(f"Error during database migration: {e}")
        raise

if __name__ == "__main__":
    migrate_database()
