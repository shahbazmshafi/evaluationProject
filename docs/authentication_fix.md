# Authentication Fix Documentation

## Issue Description
Users were facing "401 Unauthorized" issues when trying to login with newly created users when accessing the application via the Docker machine's IP address. The issue was that the application was using hardcoded users, and newly created users were not being properly authenticated.

## Root Cause Analysis
After investigating the issue, we found several problems:

1. **Hardcoded Admin User**: The application was initializing a hardcoded admin user with the email "sgul@trafix.com" and password "Asdf@12345" in both the employee_eval.db and localStorage_sync.db databases. This was causing issues when trying to create and authenticate new users.

2. **Authentication Flow**: When accessing the application from another machine via IP, the frontend correctly detected that it was running in Docker mode and used the backend API for authentication. However, the backend was not properly validating tokens for newly created users.

3. **User Creation**: The user creation process was not properly storing users in both databases (employee_eval.db and localStorage_sync.db), which is necessary for authentication to work correctly.

## Solution
To fix these issues, we made the following changes:

1. **Removed Hardcoded Users**: We removed all hardcoded users from the codebase, including:
   - The hardcoded admin user in main.py
   - The hardcoded admin user in init_admin_user.py

2. **Dynamic Database Initialization**: We replaced the hardcoded user initialization with a more dynamic approach that initializes the database tables without creating any hardcoded users. This allows users to be created dynamically through the application.

3. **First Admin User Endpoint**: We added a new endpoint `/users/first-admin` that allows creating the first admin user without authentication. This endpoint can only be used when no users exist in the database, ensuring it can't be abused.

4. **User Creation Process**: We ensured that the user creation process properly stores users in both databases (employee_eval.db and localStorage_sync.db), which is necessary for authentication to work correctly.

5. **Testing**: We created a test script that verifies the entire flow:
   - Creating the first admin user
   - Logging in as the admin user
   - Creating a regular user
   - Logging in as the regular user
   - Verifying that the regular user can access protected endpoints
   - Testing frontend access via the nginx proxy

## Implementation Details

### 1. Removed Hardcoded Users
We removed the hardcoded admin user initialization from main.py and init_admin_user.py.

### 2. Dynamic Database Initialization
We updated the `init_admin_user` function in main.py to initialize the database tables without creating any hardcoded users:

```python
def init_admin_user():
    """
    Initialize the database tables for the application
    """
    try:
        # Connect to the localStorage sync database
        conn = sqlite3.connect("./localStorage_sync.db")
        cursor = conn.cursor()

        # Create tables if they don't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS localStorage_users
        (id INTEGER PRIMARY KEY, data TEXT)
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS localStorage_passwords
        (id INTEGER PRIMARY KEY, data TEXT)
        ''')

        # Initialize empty data if tables are empty
        cursor.execute("SELECT data FROM localStorage_users WHERE id = 1")
        users_result = cursor.fetchone()

        if not users_result:
            # Initialize with empty array
            cursor.execute("INSERT INTO localStorage_users (id, data) VALUES (1, ?)", 
                          (json.dumps([]),))

        cursor.execute("SELECT data FROM localStorage_passwords WHERE id = 1")
        passwords_result = cursor.fetchone()

        if not passwords_result:
            # Initialize with empty object
            cursor.execute("INSERT INTO localStorage_passwords (id, data) VALUES (1, ?)", 
                          (json.dumps({}),))

        conn.commit()
        print("localStorage_sync.db tables initialized successfully")

        # Initialize the employee_eval.db database
        db = SessionLocal()
        try:
            # Check if admin role exists
            admin_role = db.query(Role).filter(Role.name == "Admin").first()
            if not admin_role:
                # Create admin role
                admin_role = Role(name="Admin", is_custom=False)
                db.add(admin_role)
                db.commit()
                db.refresh(admin_role)
                print("Admin role created successfully")

            # Create employee role if it doesn't exist
            employee_role = db.query(Role).filter(Role.name == "Employee").first()
            if not employee_role:
                employee_role = Role(name="Employee", is_custom=False)
                db.add(employee_role)
                db.commit()
                db.refresh(employee_role)
                print("Employee role created successfully")

            # Create manager role if it doesn't exist
            manager_role = db.query(Role).filter(Role.name == "Manager").first()
            if not manager_role:
                manager_role = Role(name="Manager", is_custom=False)
                db.add(manager_role)
                db.commit()
                db.refresh(manager_role)
                print("Manager role created successfully")

            print("Database initialization completed successfully")
        except Exception as e:
            print(f"Error initializing database: {e}")
        finally:
            db.close()

    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        if conn:
            conn.close()
```

### 3. First Admin User Endpoint
We added a new endpoint `/users/first-admin` that allows creating the first admin user without authentication:

```python
@app.post("/users/first-admin", response_model=UserResponse)
def create_first_admin(user_data: dict, db: Session = Depends(get_db)):
    """
    Create the first admin user without authentication.
    This endpoint should only be used during initial setup.
    """
    # Check if any users exist
    existing_users = db.query(User).count()
    if existing_users > 0:
        raise HTTPException(status_code=403, detail="Cannot create first admin user when users already exist")
    
    # Check if admin role exists
    admin_role = db.query(Role).filter(Role.name == "Admin").first()
    if not admin_role:
        # Create admin role
        admin_role = Role(name="Admin", is_custom=False)
        db.add(admin_role)
        db.commit()
        db.refresh(admin_role)
        print("Admin role created successfully")
    
    # Create admin user
    admin_user = User(
        email=user_data["email"],
        name=user_data["name"],
        password_hash=hash_password(user_data["password"]),
        role_id=admin_role.id,
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    # Also add the user to localStorage_sync.db for frontend authentication
    try:
        # Connect to localStorage_sync.db
        conn = sqlite3.connect("./localStorage_sync.db")
        cursor = conn.cursor()

        # Create tables if they don't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS localStorage_users
        (id INTEGER PRIMARY KEY, data TEXT)
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS localStorage_passwords
        (id INTEGER PRIMARY KEY, data TEXT)
        ''')

        # Get existing users
        cursor.execute("SELECT data FROM localStorage_users WHERE id = 1")
        users_result = cursor.fetchone()

        users = []
        if users_result:
            users = json.loads(users_result[0])

        # Create new user object for localStorage
        new_user = {
            "id": str(admin_user.id),
            "name": admin_user.name,
            "email": admin_user.email,
            "role": {
                "id": str(admin_role.id),
                "name": admin_role.name,
                "permissions": [],
                "isCustom": admin_role.is_custom
            },
            "department": "Administration",
            "isActive": admin_user.is_active,
            "createdAt": admin_user.created_at.isoformat()
        }

        # Add user to the list
        users.append(new_user)

        # Save updated users
        cursor.execute("DELETE FROM localStorage_users")
        cursor.execute("INSERT INTO localStorage_users (id, data) VALUES (1, ?)", 
                      (json.dumps(users),))

        # Get existing passwords
        cursor.execute("SELECT data FROM localStorage_passwords WHERE id = 1")
        passwords_result = cursor.fetchone()

        passwords = {}
        if passwords_result:
            passwords = json.loads(passwords_result[0])

        # Add the new user's password
        passwords[admin_user.email] = user_data["password"]

        # Save updated passwords
        cursor.execute("DELETE FROM localStorage_passwords")
        cursor.execute("INSERT INTO localStorage_passwords (id, data) VALUES (1, ?)", 
                      (json.dumps(passwords),))

        conn.commit()
        conn.close()

        print(f"Admin user {admin_user.email} added to localStorage_sync.db successfully")
    except Exception as e:
        print(f"Error adding admin user to localStorage_sync.db: {e}")
    
    return admin_user
```

### 4. Testing
We created a test script that verifies the entire flow:

```python
def test_create_and_login():
    """
    Test creating a new user and logging in with it
    """
    print("Testing new user creation and login...")
    
    # Determine the base URL based on the environment
    if is_running_in_docker():
        base_url = "http://backend:8000"
        print("Running in Docker mode, using backend service URL")
    else:
        base_url = "http://localhost:8000"
        print("Running in local mode, using localhost URL")

    # Step 1: Create a new user with Admin role
    print("\nStep 1: Create a new Admin user")
    
    # First, we need to create the Admin role if it doesn't exist
    admin_email = generate_random_email()
    admin_password = "Admin@12345"
    admin_name = "Test Admin"
    
    try:
        # Create the admin user directly in the database
        create_user_response = requests.post(
            f"{base_url}/users/first-admin",
            json={
                "email": admin_email,
                "name": admin_name,
                "password": admin_password
            },
            headers={"Content-Type": "application/json"}
        )

        # ... (rest of the test script)
```

## Testing
We tested the changes by:
1. Running the test script in both local and Docker environments
2. Verifying that the first admin user can be created
3. Verifying that the admin user can create regular users
4. Verifying that regular users can log in and access protected endpoints
5. Verifying that the frontend can access the backend via the nginx proxy

## Conclusion
The issue was fixed by:
1. Removing hardcoded users from the codebase
2. Implementing a dynamic database initialization approach
3. Adding a secure way to create the first admin user
4. Ensuring that user creation properly stores users in both databases
5. Testing the entire flow to verify that authentication works correctly

These changes ensure that users can create new accounts and log in with them, regardless of how they access the application (locally or via IP).