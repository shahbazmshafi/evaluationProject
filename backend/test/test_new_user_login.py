import requests
import json
import random
import string

def generate_random_email():
    """Generate a random email address for testing"""
    letters = string.ascii_lowercase
    random_string = ''.join(random.choice(letters) for i in range(8))
    return f"{random_string}@example.com"

def test_new_user_creation_and_login():
    """
    Test creating a new user and logging in with it
    """
    print("Testing new user creation and login...")

    # Admin login credentials
    admin_email = "sgul@trafix.com"
    admin_password = "Asdf@12345"

    # Step 1: Login as admin
    print("\nStep 1: Login as admin")
    try:
        login_response = requests.post(
            "http://frontend/api/auth/login",
            json={"email": admin_email, "password": admin_password},
            headers={"Content-Type": "application/json"}
        )

        print(f"Admin login response status code: {login_response.status_code}")

        if login_response.status_code != 200:
            print(f"Admin login failed: {login_response.text}")
            return False

        login_data = login_response.json()
        admin_token = login_data.get("access_token")
        admin_user = login_data.get("user")

        print(f"Admin login successful. Token: {admin_token[:10]}... User ID: {admin_user.get('id')}")

        # Step 2: Create a new user
        print("\nStep 2: Create a new user")
        new_user_email = generate_random_email()
        new_user_password = "Test@12345"
        
        create_user_response = requests.post(
            "http://frontend/api/users",
            json={
                "email": new_user_email,
                "name": "Test User",
                "password": new_user_password,
                "role_id": 1,  # Admin role
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

        new_user = create_user_response.json()
        print(f"New user created successfully: {new_user}")

        # Step 3: Login as the new user
        print("\nStep 3: Login as the new user")
        new_user_login_response = requests.post(
            "http://frontend/api/auth/login",
            json={"email": new_user_email, "password": new_user_password},
            headers={"Content-Type": "application/json"}
        )

        print(f"New user login response status code: {new_user_login_response.status_code}")

        if new_user_login_response.status_code != 200:
            print(f"New user login failed: {new_user_login_response.text}")
            return False

        new_user_login_data = new_user_login_response.json()
        new_user_token = new_user_login_data.get("access_token")
        logged_in_user = new_user_login_data.get("user")

        print(f"New user login successful. Token: {new_user_token[:10]}... User ID: {logged_in_user.get('id')}")

        # Step 4: Sync current user
        print("\nStep 4: Sync current user")
        sync_response = requests.post(
            "http://frontend/api/sync/current-user",
            json={"user": logged_in_user},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {new_user_token}"
            }
        )

        print(f"Sync response status code: {sync_response.status_code}")

        if sync_response.status_code != 200:
            print(f"Sync failed: {sync_response.text}")
            return False

        sync_data = sync_response.json()
        print(f"Sync successful: {sync_data}")

        # Step 5: Get current user
        print("\nStep 5: Get current user")
        get_user_response = requests.get(
            "http://frontend/api/sync/current-user",
            headers={
                "Authorization": f"Bearer {new_user_token}"
            }
        )

        print(f"Get user response status code: {get_user_response.status_code}")

        if get_user_response.status_code != 200:
            print(f"Get user failed: {get_user_response.text}")
            return False

        get_user_data = get_user_response.json()
        print(f"Get user successful: {get_user_data}")

        return True

    except Exception as e:
        print(f"Error testing new user creation and login: {e}")
        return False

if __name__ == "__main__":
    success = test_new_user_creation_and_login()
    print(f"\nTest {'passed' if success else 'failed'}")