import sqlite3
import hashlib
import json

# Function to hash password (must match the one in main.py)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Check admin user in localStorage_sync.db
def check_localstorage_admin():
    print("Checking admin user in localStorage_sync.db...")
    try:
        conn = sqlite3.connect("./localStorage_sync.db")
        cursor = conn.cursor()

        # Check users
        cursor.execute("SELECT data FROM localStorage_users WHERE id = 1")
        users_result = cursor.fetchone()

        if users_result:
            users = json.loads(users_result[0])
            admin_user = next((user for user in users if user.get('email') == 'sgul@trafix.com'), None)
            if admin_user:
                print("Admin user found in localStorage_sync.db:")
                print(f"  Email: {admin_user.get('email')}")
                print(f"  Role: {admin_user.get('role')}")
                print(f"  Active: {admin_user.get('isActive')}")
            else:
                print("Admin user NOT found in localStorage_sync.db")
        else:
            print("No users found in localStorage_sync.db")

        # Check passwords
        cursor.execute("SELECT data FROM localStorage_passwords WHERE id = 1")
        passwords_result = cursor.fetchone()

        if passwords_result:
            passwords = json.loads(passwords_result[0])
            admin_password = passwords.get('sgul@trafix.com')
            if admin_password:
                print(f"Admin password found in localStorage_sync.db: {admin_password}")
            else:
                print("Admin password NOT found in localStorage_sync.db")
        else:
            print("No passwords found in localStorage_sync.db")

        conn.close()
    except Exception as e:
        print(f"Error checking localStorage_sync.db: {e}")

# Check admin user in employee_eval.db
def check_employee_eval_admin():
    print("\nChecking admin user in employee_eval.db...")
    try:
        # Connect to the database
        conn = sqlite3.connect("./employee_eval.db")
        cursor = conn.cursor()

        # Check if admin role exists
        cursor.execute("SELECT * FROM roles WHERE name = 'admin'")
        admin_role = cursor.fetchone()
        if admin_role:
            print(f"Admin role found in employee_eval.db: ID={admin_role[0]}, Name={admin_role[1]}")
        else:
            print("Admin role NOT found in employee_eval.db")

        # Check if admin user exists
        cursor.execute("SELECT * FROM users WHERE email = 'sgul@trafix.com'")
        admin_user = cursor.fetchone()
        if admin_user:
            print(f"Admin user found in employee_eval.db:")
            print(f"  ID: {admin_user[0]}")
            print(f"  Email: {admin_user[1]}")
            print(f"  Name: {admin_user[2]}")
            print(f"  Password hash: {admin_user[3]}")
            print(f"  Role ID: {admin_user[4]}")

            # Check if password hash matches
            expected_hash = hash_password("Asdf@12345")
            if admin_user[3] == expected_hash:
                print(f"Password hash matches expected value: {expected_hash}")
            else:
                print(f"Password hash DOES NOT match expected value!")
                print(f"  Expected: {expected_hash}")
                print(f"  Actual: {admin_user[3]}")
        else:
            print("Admin user NOT found in employee_eval.db")

        conn.close()
    except Exception as e:
        print(f"Error checking employee_eval.db: {e}")

if __name__ == "__main__":
    check_localstorage_admin()
    check_employee_eval_admin()
