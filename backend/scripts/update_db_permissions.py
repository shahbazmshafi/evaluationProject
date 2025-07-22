import os
import sqlite3
import sys
import logging

# Add utils directory to path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DATA_DIR = "data"
EMPLOYEE_DB = os.path.join(DATA_DIR, "employee_eval.db")

def ensure_data_dir():
    """Ensure data directory exists"""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        logger.info(f"Data directory '{DATA_DIR}' is ready")
    except Exception as e:
        logger.error(f"Error creating data directory: {e}")
        sys.exit(1)

def update_employee_db():
    """Update employee evaluation database with permissions"""
    logger.info(f"Updating employee database at {EMPLOYEE_DB}")
    try:
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()

        # Check if permissions table already exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='permissions'")
        if not cursor.fetchone():
            # Create permissions table
            cursor.execute('''
            CREATE TABLE permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT NOT NULL
            )
            ''')
            logger.info("Created permissions table")

        # Check if roles table has permissions column
        cursor.execute("PRAGMA table_info(roles)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'permissions' not in columns:
            # Add permissions column to roles table
            cursor.execute('ALTER TABLE roles ADD COLUMN permissions TEXT')
            logger.info("Added permissions column to roles table")

        # Create role_permissions table for many-to-many relationship
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS role_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_id INTEGER NOT NULL,
            permission_id INTEGER NOT NULL,
            FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
            UNIQUE(role_id, permission_id)
        )
        ''')
        logger.info("Created role_permissions table")

        # Insert core permissions
        core_permissions = [
            ("USER_READ", "View users"),
            ("USER_WRITE", "Create/Edit users"),
            ("USER_DELETE", "Delete users"),
            ("KPI_READ", "View KPIs"),
            ("KPI_WRITE", "Create/Edit KPIs"),
            ("KPI_DELETE", "Delete KPIs"),
            ("EVALUATION_READ", "View evaluations"),
            ("EVALUATION_WRITE", "Create/Edit evaluations"),
            ("EVALUATION_APPROVE", "Approve evaluations")
        ]

        for name, description in core_permissions:
            cursor.execute('''
            INSERT OR IGNORE INTO permissions (name, description)
            VALUES (?, ?)
            ''', (name, description))
            logger.info(f"Ensuring permission exists: {name}")

        # Get role IDs
        cursor.execute("SELECT id, name FROM roles WHERE name IN ('Admin', 'Manager', 'Employee')")
        roles = {name: role_id for role_id, name in cursor.fetchall()}

        # Get permission IDs
        cursor.execute("SELECT id, name FROM permissions")
        permissions = {name: perm_id for perm_id, name in cursor.fetchall()}

        # Assign default permissions to roles
        # Admin: All permissions
        for perm_name, perm_id in permissions.items():
            cursor.execute('''
            INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
            VALUES (?, ?)
            ''', (roles['Admin'], perm_id))
        logger.info("Assigned all permissions to Admin role")

        # Manager: All except DELETE permissions
        for perm_name, perm_id in permissions.items():
            if not perm_name.endswith('DELETE'):
                cursor.execute('''
                INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
                VALUES (?, ?)
                ''', (roles['Manager'], perm_id))
        logger.info("Assigned non-DELETE permissions to Manager role")

        # Employee: Only READ permissions
        for perm_name, perm_id in permissions.items():
            if perm_name.endswith('READ'):
                cursor.execute('''
                INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
                VALUES (?, ?)
                ''', (roles['Employee'], perm_id))
        logger.info("Assigned READ permissions to Employee role")

        conn.commit()
        conn.close()
        logger.info("Employee database updated successfully")
    except Exception as e:
        logger.error(f"Error updating employee database: {e}")
        raise

def verify_update():
    """Verify database update was successful"""
    logger.info("Verifying database update...")

    try:
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()

        # Check if permissions table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='permissions'")
        if not cursor.fetchone():
            logger.error("Permissions table not created")
            return False

        # Check if role_permissions table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='role_permissions'")
        if not cursor.fetchone():
            logger.error("Role_permissions table not created")
            return False

        # Check if permissions were inserted
        cursor.execute("SELECT COUNT(*) FROM permissions")
        count = cursor.fetchone()[0]
        if count < 9:  # We should have at least 9 core permissions
            logger.error(f"Not all permissions were inserted. Found {count}, expected at least 9")
            return False

        # Check if permissions were assigned to roles
        cursor.execute("SELECT COUNT(*) FROM role_permissions")
        count = cursor.fetchone()[0]
        if count < 15:  # Admin: 9, Manager: ~6, Employee: ~3
            logger.error(f"Not all role permissions were assigned. Found {count}, expected at least 15")
            return False

        conn.close()
        logger.info("Database update verification completed successfully")
        return True
    except Exception as e:
        logger.error(f"Error during verification: {e}")
        return False

def update_database():
    """Update database with proper error handling"""
    try:
        ensure_data_dir()
        update_employee_db()
        if verify_update():
            logger.info("Database update completed successfully")
        else:
            logger.error("Database update verification failed")
            sys.exit(1)
    except Exception as e:
        logger.error(f"ERROR: Database update failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    update_database()