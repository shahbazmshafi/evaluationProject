import requests
import sqlite3
import json
import sys
import os

# Base URL for API requests
BASE_URL = "http://localhost:8000"

def test_sync_users():
    """
    Test that users synced through the /sync/users endpoint can log in.
    
    This test:
    1. Creates a test user through the /sync/users endpoint
    2. Verifies the user exists in localStorage_sync.db
    3. Attempts to log in with the user's credentials
    4. Cleans up by removing the test user
    """
    print("Starting sync users test...")
    
    # Test user data
    test_email = "test_sync_user@example.com"
    test_password = "password123"
    test_name = "Test Sync User"
    
    # Step 1: Login as admin to get auth token
    print("Logging in as admin...")
    login_data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    
    login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if login_response.status_code != 200:
        print(f"Failed to login as admin: {login_response.text}")
        sys.exit(1)
    
    access_token = login_response.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {access_token}"}
    
    # Step 2: Get current users from localStorage_sync.db
    print("Getting current users...")
    users_response = requests.get(f"{BASE_URL}/sync/users", headers=auth_headers)
    if users_response.status_code != 200:
        print(f"Failed to get users: {users_response.text}")
        sys.exit(1)
    
    users = users_response.json()["users"]
    
    # Step 3: Get current passwords from localStorage_sync.db
    print("Getting current passwords...")
    passwords_response = requests.get(f"{BASE_URL}/sync/passwords", headers=auth_headers)
    if passwords_response.status_code != 200:
        print(f"Failed to get passwords: {passwords_response.text}")
        sys.exit(1)
    
    passwords = passwords_response.json()["passwords"]
    
    # Step 4: Add test user to users list
    print(f"Adding test user {test_email}...")
    
    # Find admin role
    admin_role = None
    for user in users:
        if user["email"] == "admin@example.com":
            admin_role = user["role"]
            break
    
    if not admin_role:
        print("Failed to find admin role")
        sys.exit(1)
    
    # Create test user
    test_user = {
        "id": "999",
        "name": test_name,
        "email": test_email,
        "role": admin_role,
        "isActive": True,
        "createdAt": "2023-01-01T00:00:00.000Z"
    }
    
    # Add test user to users list
    users.append(test_user)
    
    # Add test user password
    passwords[test_email] = test_password
    
    # Step 5: Sync users to both databases
    print("Syncing users...")
    sync_users_response = requests.post(
        f"{BASE_URL}/sync/users", 
        headers=auth_headers,
        json={"users": users}
    )
    if sync_users_response.status_code != 200:
        print(f"Failed to sync users: {sync_users_response.text}")
        sys.exit(1)
    
    # Step 6: Sync passwords
    print("Syncing passwords...")
    sync_passwords_response = requests.post(
        f"{BASE_URL}/sync/passwords", 
        headers=auth_headers,
        json={"passwords": passwords}
    )
    if sync_passwords_response.status_code != 200:
        print(f"Failed to sync passwords: {sync_passwords_response.text}")
        sys.exit(1)
    
    # Step 7: Attempt to login with test user
    print(f"Attempting to login as {test_email}...")
    test_login_data = {
        "email": test_email,
        "password": test_password
    }
    
    test_login_response = requests.post(f"{BASE_URL}/auth/login", json=test_login_data)
    if test_login_response.status_code != 200:
        print(f"Failed to login as test user: {test_login_response.text}")
        print("TEST FAILED: User sync is not working correctly")
        sys.exit(1)
    
    print("Successfully logged in as test user!")
    print("TEST PASSED: User sync is working correctly")
    
    # Step 8: Clean up - remove test user
    print("Cleaning up...")
    users = [user for user in users if user["email"] != test_email]
    del passwords[test_email]
    
    # Sync users without test user
    requests.post(
        f"{BASE_URL}/sync/users", 
        headers=auth_headers,
        json={"users": users}
    )
    
    # Sync passwords without test user
    requests.post(
        f"{BASE_URL}/sync/passwords", 
        headers=auth_headers,
        json={"passwords": passwords}
    )
    
    print("Test completed successfully")

if __name__ == "__main__":
    test_sync_users()