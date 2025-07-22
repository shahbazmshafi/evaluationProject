import requests
import json
import random
import string
import time
import os
import socket

def generate_random_email():
    """Generate a random email address for testing"""
    letters = string.ascii_lowercase
    random_string = ''.join(random.choice(letters) for i in range(8))
    return f"{random_string}@example.com"

def is_running_in_docker():
    """Check if the script is running inside a Docker container"""
    try:
        # Check if we can resolve the backend service name
        socket.gethostbyname("backend")
        return True
    except:
        return False

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

        print(f"Create admin user response status code: {create_user_response.status_code}")

        if create_user_response.status_code != 200 and create_user_response.status_code != 201:
            print(f"Create admin user failed: {create_user_response.text}")
            return False

        admin_user = create_user_response.json()
        print(f"Admin user created successfully: {admin_user}")

        # Step 2: Login as the new admin user
        print("\nStep 2: Login as the new admin user")
        admin_login_response = requests.post(
            f"{base_url}/auth/login",
            json={"email": admin_email, "password": admin_password},
            headers={"Content-Type": "application/json"}
        )

        print(f"Admin login response status code: {admin_login_response.status_code}")

        if admin_login_response.status_code != 200:
            print(f"Admin login failed: {admin_login_response.text}")
            return False

        admin_login_data = admin_login_response.json()
        admin_token = admin_login_data.get("access_token")
        admin_user_data = admin_login_data.get("user")

        print(f"Admin login successful. Token: {admin_token[:10]}... User ID: {admin_user_data.get('id')}")

        # Step 3: Create a regular user
        print("\nStep 3: Create a regular user")
        regular_email = generate_random_email()
        regular_password = "User@12345"
        regular_name = "Test User"

        create_user_response = requests.post(
            f"{base_url}/users",
            json={
                "email": regular_email,
                "name": regular_name,
                "password": regular_password,
                "role_id": 2,  # Employee role
                "manager_id": None
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {admin_token}"
            }
        )

        print(f"Create user response status code: {create_user_response.status_code}")

        if create_user_response.status_code != 200 and create_user_response.status_code != 201:
            print(f"Create user failed: {create_user_response.text}")
            return False

        regular_user = create_user_response.json()
        print(f"Regular user created successfully: {regular_user}")

        # Step 4: Login as the regular user
        print("\nStep 4: Login as the regular user")
        regular_login_response = requests.post(
            f"{base_url}/auth/login",
            json={"email": regular_email, "password": regular_password},
            headers={"Content-Type": "application/json"}
        )

        print(f"Regular user login response status code: {regular_login_response.status_code}")

        if regular_login_response.status_code != 200:
            print(f"Regular user login failed: {regular_login_response.text}")
            return False

        regular_login_data = regular_login_response.json()
        regular_token = regular_login_data.get("access_token")
        regular_user_data = regular_login_data.get("user")

        print(f"Regular user login successful. Token: {regular_token[:10]}... User ID: {regular_user_data.get('id')}")

        # Step 5: Verify the regular user can access protected endpoints
        print("\nStep 5: Verify the regular user can access protected endpoints")
        verify_response = requests.get(
            f"{base_url}/auth/validate",
            headers={
                "Authorization": f"Bearer {regular_token}"
            }
        )

        print(f"Verify response status code: {verify_response.status_code}")

        if verify_response.status_code != 200:
            print(f"Verification failed: {verify_response.text}")
            return False

        verify_data = verify_response.json()
        print(f"Verification successful: {verify_data}")

        # Step 6: Test frontend access via the nginx proxy
        if is_running_in_docker():
            print("\nStep 6: Test frontend access via the nginx proxy")
            frontend_url = "http://frontend/api"

            # Test login via frontend
            frontend_login_response = requests.post(
                f"{frontend_url}/auth/login",
                json={"email": regular_email, "password": regular_password},
                headers={"Content-Type": "application/json"}
            )

            print(f"Frontend login response status code: {frontend_login_response.status_code}")

            if frontend_login_response.status_code != 200:
                print(f"Frontend login failed: {frontend_login_response.text}")
                return False

            frontend_login_data = frontend_login_response.json()
            frontend_token = frontend_login_data.get("access_token")

            # Test validate via frontend
            frontend_validate_response = requests.get(
                f"{frontend_url}/auth/validate",
                headers={
                    "Authorization": f"Bearer {frontend_token}"
                }
            )

            print(f"Frontend validate response status code: {frontend_validate_response.status_code}")

            if frontend_validate_response.status_code != 200:
                print(f"Frontend validation failed: {frontend_validate_response.text}")
                return False

            print("Frontend access test passed successfully")

        return True

    except Exception as e:
        print(f"Error testing user creation and login: {e}")
        return False

if __name__ == "__main__":
    success = test_create_and_login()
    print(f"\nTest {'passed' if success else 'failed'}")
