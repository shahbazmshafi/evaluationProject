import os
import sqlite3
import sys
import logging

# Add utils directory to path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.password import hash_password

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DATA_DIR = "data"
EMPLOYEE_DB = os.path.join(DATA_DIR, "employee_eval.db")
LOCALSTORAGE_DB = os.path.join(DATA_DIR, "localStorage_sync.db")

def ensure_data_dir():
    """Ensure data directory exists"""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        print(f"Data directory '{DATA_DIR}' is ready")
    except Exception as e:
        print(f"Error creating data directory: {e}")
        sys.exit(1)

def init_employee_db():
    """Initialize employee evaluation database"""
    print(f"Initializing employee database at {EMPLOYEE_DB}")
    try:
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()

        # Create roles table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            is_custom BOOLEAN NOT NULL DEFAULT 0
        )
        ''')

        # Create permissions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL
        )
        ''')

        # Create role_permissions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS role_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_id INTEGER NOT NULL,
            permission_id INTEGER NOT NULL,
            FOREIGN KEY (role_id) REFERENCES roles (id),
            FOREIGN KEY (permission_id) REFERENCES permissions (id)
        )
        ''')

        # Create users table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role_id INTEGER NOT NULL,
            manager_id INTEGER,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES roles (id),
            FOREIGN KEY (manager_id) REFERENCES users (id)
        )
        ''')

        # Insert standard roles if they don't exist
        # Note: Role names must maintain this exact casing (Admin, Manager, Employee)
        # to ensure consistent behavior across the application
        standard_roles = [
            ("Admin", 0),
            ("Manager", 0),
            ("Employee", 0)
        ]

        for role_name, is_custom in standard_roles:
            cursor.execute("INSERT OR IGNORE INTO roles (name, is_custom) VALUES (?, ?)", (role_name, is_custom))
            print(f"Ensuring role exists: {role_name}")

        # Clean up any duplicate roles
        cursor.execute("""
        DELETE FROM roles 
        WHERE id NOT IN (
            SELECT MIN(id) 
            FROM roles 
            GROUP BY name
        )
        """)

        # Insert permissions if they don't exist
        standard_permissions = [
            ("USER_READ", "Permission to view user data"),
            ("USER_WRITE", "Permission to create and update users"),
            ("USER_DELETE", "Permission to delete users"),
            ("KPI_READ", "Permission to view KPIs"),
            ("KPI_WRITE", "Permission to create and update KPIs"),
            ("KPI_DELETE", "Permission to delete KPIs"),
            ("EVALUATION_READ", "Permission to view evaluations"),
            ("EVALUATION_WRITE", "Permission to create and update evaluations"),
            ("EVALUATION_APPROVE", "Permission to approve evaluations"),
            # Navigation permissions
            ("DASHBOARD_VIEW", "Permission to view Dashboard navigation item"),
            ("EVALUATION_VIEW", "Permission to view Evaluation navigation item"),
            ("KPI_VIEW", "Permission to view KPIs navigation item"),
            ("USERS_VIEW", "Permission to view Users navigation item"),
            ("ROLE_MANAGEMENT_VIEW", "Permission to view Role Management navigation item"),
            ("SETTINGS_VIEW", "Permission to view Settings navigation item")
        ]

        for perm_name, perm_desc in standard_permissions:
            cursor.execute("INSERT OR IGNORE INTO permissions (name, description) VALUES (?, ?)", (perm_name, perm_desc))
            print(f"Ensuring permission exists: {perm_name}")

        # Get role IDs
        cursor.execute("SELECT id FROM roles WHERE name = 'Admin'")
        admin_role_id = cursor.fetchone()[0]

        cursor.execute("SELECT id FROM roles WHERE name = 'Manager'")
        manager_role_id = cursor.fetchone()[0]

        cursor.execute("SELECT id FROM roles WHERE name = 'Employee'")
        employee_role_id = cursor.fetchone()[0]

        # Get permission IDs
        permission_ids = {}
        for perm_name, _ in standard_permissions:
            cursor.execute("SELECT id FROM permissions WHERE name = ?", (perm_name,))
            permission_ids[perm_name] = cursor.fetchone()[0]

        # Check if role-permission associations already exist
        cursor.execute("SELECT COUNT(*) FROM role_permissions")
        role_permission_count = cursor.fetchone()[0]

        if role_permission_count == 0:
            # Only initialize default permissions if none exist
            print("No existing role-permission associations found. Initializing defaults...")

            # Associate permissions with roles
            # Admin gets all permissions
            for perm_name, perm_id in permission_ids.items():
                cursor.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                              (admin_role_id, perm_id))
                print(f"Assigned permission {perm_name} to Admin role")

            # Manager gets all except DELETE permissions
            for perm_name, perm_id in permission_ids.items():
                if not perm_name.endswith("_DELETE"):
                    cursor.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                                  (manager_role_id, perm_id))
                    print(f"Assigned permission {perm_name} to Manager role")

            # Employee gets only READ permissions
            for perm_name, perm_id in permission_ids.items():
                if perm_name.endswith("_READ"):
                    cursor.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                                  (employee_role_id, perm_id))
                    print(f"Assigned permission {perm_name} to Employee role")
        else:
            print(f"Found {role_permission_count} existing role-permission associations. Preserving current configuration.")

            # Ensure new permissions are assigned to Admin role
            for perm_name, perm_id in permission_ids.items():
                cursor.execute("SELECT COUNT(*) FROM role_permissions WHERE role_id = ? AND permission_id = ?", 
                              (admin_role_id, perm_id))
                if cursor.fetchone()[0] == 0:
                    cursor.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                                  (admin_role_id, perm_id))
                    print(f"Added new permission {perm_name} to Admin role")

        # Insert admin user if not exists
        admin_password_hash = hash_password("Asdf@12345")
        cursor.execute("""
        INSERT OR IGNORE INTO users (email, name, password_hash, role_id, is_active)
        VALUES (?, ?, ?, ?, ?)
        """, ("sgul@trafix.com", "Admin User", admin_password_hash, admin_role_id, 1))

        # Verify admin user was created
        cursor.execute("SELECT email, role_id FROM users WHERE email = 'sgul@trafix.com'")
        admin_user = cursor.fetchone()
        if admin_user:
            print(f"Admin user verified: {admin_user[0]}")
            # Verify role name
            cursor.execute("SELECT name FROM roles WHERE id = ?", (admin_user[1],))
            role_name = cursor.fetchone()[0]
            print(f"Admin user has role: {role_name}")
        else:
            print("WARNING: Admin user creation failed")

        conn.commit()
        conn.close()
        print("Employee database initialized successfully")
    except Exception as e:
        print(f"Error initializing employee database: {e}")
        raise

def init_localstorage_db():
    """Initialize localStorage sync database"""
    print(f"Initializing localStorage database at {LOCALSTORAGE_DB}")
    try:
        conn = sqlite3.connect(LOCALSTORAGE_DB)
        cursor = conn.cursor()

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS localStorage_users
        (id INTEGER PRIMARY KEY, data TEXT)
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS localStorage_passwords
        (id INTEGER PRIMARY KEY, data TEXT)
        ''')

        conn.commit()
        conn.close()
        print("localStorage database initialized successfully")
    except Exception as e:
        print(f"Error initializing localStorage database: {e}")
        raise

def verify_initialization():
    """Verify database initialization was successful"""
    print("Verifying database initialization...")

    # Verify employee database
    try:
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()

        # Check if admin user exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = 'sgul@trafix.com'")
        admin_count = cursor.fetchone()[0]

        if admin_count == 0:
            print("ERROR: Admin user not created properly")
            raise Exception("Admin user verification failed")

        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        required_tables = ['roles', 'users', 'permissions', 'role_permissions']
        for table in required_tables:
            if table not in tables:
                print(f"ERROR: Required table '{table}' not found in employee database")
                raise Exception(f"Table verification failed: {table} not found")

        # Verify permissions exist
        cursor.execute("SELECT COUNT(*) FROM permissions")
        permission_count = cursor.fetchone()[0]
        if permission_count < 15:  # We should have at least 15 standard permissions
            print(f"ERROR: Not all permissions are initialized. Found {permission_count} permissions.")
            raise Exception("Permissions verification failed")

        # Verify admin role has permissions
        cursor.execute("""
        SELECT COUNT(*) FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        WHERE r.name = 'Admin'
        """)
        admin_permission_count = cursor.fetchone()[0]

        # Get total number of permissions
        cursor.execute("SELECT COUNT(*) FROM permissions")
        total_permissions = cursor.fetchone()[0]

        # For new installations, Admin should have all permissions
        # For existing installations, Admin should have at least some permissions
        if admin_permission_count == 0:
            print(f"ERROR: Admin role has no permissions. This is unexpected.")
            raise Exception("Admin permissions verification failed")
        else:
            print(f"Admin role has {admin_permission_count} of {total_permissions} total permissions.")

        conn.close()

        # Verify localStorage database
        conn = sqlite3.connect(LOCALSTORAGE_DB)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        required_tables = ['localStorage_users', 'localStorage_passwords']
        for table in required_tables:
            if table not in tables:
                print(f"ERROR: Required table '{table}' not found in localStorage database")
                raise Exception(f"Table verification failed: {table} not found")

        conn.close()
        print("Database verification completed successfully")
    except Exception as e:
        print(f"Error during verification: {e}")
        raise

def init_database():
    """Initialize databases with proper error handling"""
    try:
        ensure_data_dir()
        init_employee_db()
        init_localstorage_db()
        verify_initialization()
        print("Database initialization completed successfully")
    except Exception as e:
        print(f"ERROR: Database initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()
