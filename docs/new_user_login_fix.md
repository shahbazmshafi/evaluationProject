# New User Login Fix Documentation

## Issue Description
Users were able to log in with the default admin account (sgul@trafix.com), but newly created users were getting a "401 Unauthorized" error when trying to log in. This was happening because the new users were only being created in the employee_eval.db database, but not in the localStorage_sync.db database, which is used for authentication.

## Root Cause Analysis
After investigating the issue, we found that there were two separate databases being used for authentication:

1. **employee_eval.db**: This is the main database that stores user information, including the password hash. The login endpoint checks this database to validate the user's credentials.

2. **localStorage_sync.db**: This database is used to store user data for the frontend. It contains a copy of the user information, including the password in plain text. This is used for offline access and for syncing data between the frontend and backend.

When a new user was created, it was only added to the employee_eval.db database, but not to the localStorage_sync.db database. This meant that the user could not log in because the frontend couldn't find the user in the localStorage_sync.db database.

## Solution
To fix this issue, we updated the create_user function in main.py to also store the user and password in the localStorage_sync.db database. This ensures that newly created users can log in.

### Implementation Details
1. We updated the create_user function in main.py to also store the user in localStorage_sync.db:
   ```python
   # Also add the user to localStorage_sync.db for frontend authentication
   try:
       # Get the role information
       role = db.query(Role).filter(Role.id == user.role_id).first()
       
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
           "id": str(db_user.id),
           "name": db_user.name,
           "email": db_user.email,
           "role": {
               "id": str(role.id),
               "name": role.name,
               "permissions": [],
               "isCustom": role.is_custom
           },
           "department": "Department",
           "isActive": db_user.is_active,
           "createdAt": db_user.created_at.isoformat()
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
       passwords[db_user.email] = user.password
       
       # Save updated passwords
       cursor.execute("DELETE FROM localStorage_passwords")
       cursor.execute("INSERT INTO localStorage_passwords (id, data) VALUES (1, ?)", 
                     (json.dumps(passwords),))
       
       conn.commit()
       conn.close()
       
       print(f"User {db_user.email} added to localStorage_sync.db successfully")
   except Exception as e:
       print(f"Error adding user to localStorage_sync.db: {e}")
   ```

## Testing
We created a test script (test_new_user_login.py) that tests the new user creation and login flow. The script:
1. Logs in with the admin user credentials
2. Creates a new user
3. Logs in with the new user credentials
4. Makes a POST request to /sync/current-user with the token in the Authorization header
5. Makes a GET request to /sync/current-user with the token in the Authorization header

The test script can be run with the following command:
```bash
docker exec -it project-backend-1 python test_new_user_login.py
```

## Conclusion
The issue was fixed by ensuring that newly created users are stored in both the employee_eval.db and localStorage_sync.db databases. This ensures that users can log in with their credentials and access the application.

## Additional Notes
- The localStorage_sync.db database stores passwords in plain text, which is not secure. In a production environment, it would be better to use a more secure method for storing passwords.
- The frontend uses the localStorage_sync.db database for offline access, which is why it needs a copy of the user data.
- The admin user is initialized in both databases when the application starts, which is why it was working correctly.