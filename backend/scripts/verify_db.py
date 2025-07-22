#!/usr/bin/env python3
import os
import sys
import sqlite3
import stat
from datetime import datetime

# ANSI color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Constants
DATA_DIR = "data"
EMPLOYEE_DB = os.path.join(DATA_DIR, "employee_eval.db")
LOCALSTORAGE_DB = os.path.join(DATA_DIR, "localStorage_sync.db")

def print_header(message):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 50}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{message.center(50)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 50}{Colors.ENDC}\n")

def print_success(message):
    """Print a success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_error(message):
    """Print an error message"""
    print(f"{Colors.RED}✗ {message}{Colors.ENDC}")

def print_info(message):
    """Print an info message"""
    print(f"{Colors.BLUE}ℹ {message}{Colors.ENDC}")

def print_warning(message):
    """Print a warning message"""
    print(f"{Colors.YELLOW}⚠ {message}{Colors.ENDC}")

def check_file_exists(file_path):
    """Check if a file exists and print its details"""
    if os.path.exists(file_path):
        file_stats = os.stat(file_path)
        size_kb = file_stats.st_size / 1024

        # Get file permissions
        perms = stat.filemode(file_stats.st_mode)

        # Format modification time
        mod_time = datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')

        print_success(f"File exists: {file_path}")
        print_info(f"  Size: {size_kb:.2f} KB")
        print_info(f"  Permissions: {perms}")
        print_info(f"  Last modified: {mod_time}")
        return True
    else:
        print_error(f"File does not exist: {file_path}")
        return False

def get_table_info(db_path):
    """Get information about tables in the database"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        if not tables:
            print_warning("No tables found in the database")
            return False

        print_success(f"Found {len(tables)} tables:")

        # Get record count for each table
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print_info(f"  {table}: {count} records")

        conn.close()
        return True
    except Exception as e:
        print_error(f"Error getting table information: {e}")
        return False

def check_admin_user():
    """Check if admin user exists and show details"""
    try:
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()

        # Check if admin user exists
        cursor.execute("""
            SELECT u.id, u.email, u.name, u.is_active, r.name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = 'sgul@trafix.com'
        """)

        admin = cursor.fetchone()

        if admin:
            print_success("Admin user exists:")
            print_info(f"  ID: {admin[0]}")
            print_info(f"  Email: {admin[1]}")
            print_info(f"  Name: {admin[2]}")
            print_info(f"  Active: {'Yes' if admin[3] else 'No'}")
            print_info(f"  Role: {admin[4]}")
            conn.close()
            return True
        else:
            print_error("Admin user not found")
            conn.close()
            return False
    except Exception as e:
        print_error(f"Error checking admin user: {e}")
        return False

def check_roles():
    """Check if required roles exist"""
    try:
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()

        # Standard roles that should exist
        standard_roles = ["Admin", "Manager", "Employee"]
        missing_roles = []

        print_info("Checking standard roles:")

        for role_name in standard_roles:
            cursor.execute("SELECT id, name, is_custom FROM roles WHERE name = ?", (role_name,))
            role = cursor.fetchone()

            if role:
                print_success(f"{role_name} role exists:")
                print_info(f"  ID: {role[0]}")
                print_info(f"  Name: {role[1]}")
                print_info(f"  Is Custom: {'Yes' if role[2] else 'No'}")
            else:
                print_error(f"{role_name} role not found")
                missing_roles.append(role_name)

        # Check for duplicate roles
        cursor.execute("""
            SELECT name, COUNT(*) as count 
            FROM roles 
            GROUP BY name 
            HAVING count > 1
        """)

        duplicates = cursor.fetchall()
        if duplicates:
            print_warning("Duplicate roles found:")
            for dup in duplicates:
                print_warning(f"  {dup[0]}: {dup[1]} occurrences")

        conn.close()

        if missing_roles:
            print_error(f"Missing roles: {', '.join(missing_roles)}")
            return False
        return True
    except Exception as e:
        print_error(f"Error checking roles: {e}")
        return False

def verify_database():
    """Verify database initialization and structure"""
    errors = 0

    print_header("DATABASE VERIFICATION REPORT")

    # Check data directory
    print_header("DATA DIRECTORY")
    if os.path.exists(DATA_DIR) and os.path.isdir(DATA_DIR):
        print_success(f"Data directory exists: {os.path.abspath(DATA_DIR)}")
    else:
        print_error(f"Data directory does not exist: {os.path.abspath(DATA_DIR)}")
        errors += 1

    # Check employee database file
    print_header("EMPLOYEE DATABASE")
    if check_file_exists(EMPLOYEE_DB):
        if get_table_info(EMPLOYEE_DB):
            print_success("Employee database structure is valid")
        else:
            print_error("Employee database structure is invalid")
            errors += 1
    else:
        errors += 1

    # Check localStorage database file
    print_header("LOCAL STORAGE DATABASE")
    if check_file_exists(LOCALSTORAGE_DB):
        if get_table_info(LOCALSTORAGE_DB):
            print_success("Local storage database structure is valid")
        else:
            print_error("Local storage database structure is invalid")
            errors += 1
    else:
        errors += 1

    # Check admin user
    print_header("ADMIN USER")
    if not check_admin_user():
        errors += 1

    # Check roles
    print_header("ROLES")
    if not check_roles():
        errors += 1

    # Summary
    print_header("VERIFICATION SUMMARY")
    if errors == 0:
        print_success("All checks passed successfully!")
        return 0
    else:
        print_error(f"Verification completed with {errors} errors")
        return 1

if __name__ == "__main__":
    exit_code = verify_database()
    sys.exit(exit_code)
