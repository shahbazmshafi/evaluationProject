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
# Use absolute paths to ensure the script works from any directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
EMPLOYEE_DB = os.path.join(DATA_DIR, "employee_eval.db")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def test_permission_persistence():
    """Test that role permissions persist after database reinitialization"""
    logger.info("Testing permission persistence...")

    try:
        # Connect to the database
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()

        # 1. Create a custom role with specific permissions
        logger.info("Creating a custom test role...")
        cursor.execute("INSERT INTO roles (name, is_custom) VALUES (?, ?)", ("TestCustomRole", 1))
        custom_role_id = cursor.lastrowid

        # Get permission IDs for KPI_READ and USER_READ
        cursor.execute("SELECT id FROM permissions WHERE name = 'KPI_READ'")
        kpi_read_id = cursor.fetchone()[0]

        cursor.execute("SELECT id FROM permissions WHERE name = 'USER_READ'")
        user_read_id = cursor.fetchone()[0]

        # Assign permissions to custom role
        cursor.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                      (custom_role_id, kpi_read_id))
        cursor.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                      (custom_role_id, user_read_id))

        # 2. Modify a built-in role's permissions (remove a permission from Manager)
        logger.info("Modifying Manager role permissions...")
        cursor.execute("SELECT id FROM roles WHERE name = 'Manager'")
        manager_role_id = cursor.fetchone()[0]

        cursor.execute("SELECT id FROM permissions WHERE name = 'KPI_WRITE'")
        kpi_write_id = cursor.fetchone()[0]

        # Remove KPI_WRITE permission from Manager role
        cursor.execute("DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?", 
                      (manager_role_id, kpi_write_id))

        # Commit changes
        conn.commit()

        # Log current state before reinitialization
        cursor.execute("""
        SELECT r.name, COUNT(rp.permission_id) 
        FROM roles r 
        LEFT JOIN role_permissions rp ON r.id = rp.role_id 
        GROUP BY r.name
        """)
        logger.info("Role permissions before reinitialization:")
        for role_name, perm_count in cursor.fetchall():
            logger.info(f"  {role_name}: {perm_count} permissions")

        # Close connection
        conn.close()

        # 3. Simulate a container restart by running the init_db.py script
        logger.info("Simulating container restart by running init_db.py...")
        from scripts.init_db import init_database
        init_database()

        # 4. Verify that both the custom role and the modified built-in role maintain their permissions
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()

        # Check if custom role still exists
        cursor.execute("SELECT id FROM roles WHERE name = 'TestCustomRole'")
        custom_role_result = cursor.fetchone()
        if custom_role_result:
            custom_role_id = custom_role_result[0]
            logger.info("Custom role still exists.")

            # Check if custom role still has its permissions
            cursor.execute("""
            SELECT p.name FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            """, (custom_role_id,))
            permissions = [row[0] for row in cursor.fetchall()]
            logger.info(f"Custom role permissions: {permissions}")

            if 'KPI_READ' in permissions and 'USER_READ' in permissions:
                logger.info("SUCCESS: Custom role maintained its permissions.")
            else:
                logger.error("FAILURE: Custom role lost some permissions.")
        else:
            logger.error("FAILURE: Custom role no longer exists.")

        # Check if Manager role still has KPI_WRITE permission removed
        cursor.execute("SELECT id FROM roles WHERE name = 'Manager'")
        manager_role_id = cursor.fetchone()[0]

        cursor.execute("SELECT id FROM permissions WHERE name = 'KPI_WRITE'")
        kpi_write_id = cursor.fetchone()[0]

        cursor.execute("""
        SELECT COUNT(*) FROM role_permissions 
        WHERE role_id = ? AND permission_id = ?
        """, (manager_role_id, kpi_write_id))

        if cursor.fetchone()[0] == 0:
            logger.info("SUCCESS: Manager role still has KPI_WRITE permission removed.")
        else:
            logger.error("FAILURE: Manager role had KPI_WRITE permission restored.")

        # Log final state
        cursor.execute("""
        SELECT r.name, COUNT(rp.permission_id) 
        FROM roles r 
        LEFT JOIN role_permissions rp ON r.id = rp.role_id 
        GROUP BY r.name
        """)
        logger.info("Role permissions after reinitialization:")
        for role_name, perm_count in cursor.fetchall():
            logger.info(f"  {role_name}: {perm_count} permissions")

        conn.close()
        logger.info("Permission persistence test completed.")

    except Exception as e:
        logger.error(f"Error during permission persistence test: {e}")
        raise

if __name__ == "__main__":
    test_permission_persistence()
