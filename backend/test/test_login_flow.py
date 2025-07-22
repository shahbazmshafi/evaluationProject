import requests
import json

def test_login_flow():
    """
    Test the login flow and verify that the token is properly passed to the /sync/current-user endpoint
    """
    print("Testing login flow...")

    # Login credentials
    email = "sgul@trafix.com"
    password = "Asdf@12345"

    # Step 1: Login
    print("\nStep 1: Login")
    try:
        login_response = requests.post(
            "http://frontend/api/auth/login",
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"}
        )

        print(f"Login response status code: {login_response.status_code}")

        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return False

        login_data = login_response.json()
        token = login_data.get("access_token")
        user = login_data.get("user")

        print(f"Login successful. Token: {token[:10]}... User ID: {user.get('id')}")
        print(f"Full token: {token}")

        # Step 2: Sync current user
        print("\nStep 2: Sync current user")
        sync_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        print(f"Sync request headers: {sync_headers}")

        # Try direct request to backend first with different Authorization header formats
        print("\nTrying direct request to backend with 'Bearer' prefix:")
        direct_sync_response = requests.post(
            "http://backend:8000/sync/current-user",
            json={"user": user},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
        )

        print(f"Direct sync response status code: {direct_sync_response.status_code}")
        if direct_sync_response.status_code != 200:
            print(f"Direct sync failed: {direct_sync_response.text}")

            # Try without 'Bearer' prefix
            print("\nTrying direct request to backend without 'Bearer' prefix:")
            direct_sync_response_no_bearer = requests.post(
                "http://backend:8000/sync/current-user",
                json={"user": user},
                headers={
                    "Content-Type": "application/json",
                    "Authorization": token
                }
            )
            print(f"Direct sync (no Bearer) response status code: {direct_sync_response_no_bearer.status_code}")
            if direct_sync_response_no_bearer.status_code != 200:
                print(f"Direct sync (no Bearer) failed: {direct_sync_response_no_bearer.text}")
            else:
                print(f"Direct sync (no Bearer) successful: {direct_sync_response_no_bearer.json()}")
        else:
            print(f"Direct sync successful: {direct_sync_response.json()}")

        # Then try through frontend
        sync_response = requests.post(
            "http://frontend/api/sync/current-user",
            json={"user": user},
            headers=sync_headers
        )

        print(f"Sync response status code: {sync_response.status_code}")

        if sync_response.status_code != 200:
            print(f"Sync failed: {sync_response.text}")
            return False

        sync_data = sync_response.json()
        print(f"Sync successful: {sync_data}")

        # Step 3: Get current user
        print("\nStep 3: Get current user")
        get_user_headers = {
            "Authorization": f"Bearer {token}"
        }
        print(f"Get user request headers: {get_user_headers}")

        # Try direct request to backend first with different Authorization header formats
        print("\nTrying direct request to backend for GET with 'Bearer' prefix:")
        direct_get_user_response = requests.get(
            "http://backend:8000/sync/current-user",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        print(f"Direct get user response status code: {direct_get_user_response.status_code}")
        if direct_get_user_response.status_code != 200:
            print(f"Direct get user failed: {direct_get_user_response.text}")

            # Try without 'Bearer' prefix
            print("\nTrying direct request to backend for GET without 'Bearer' prefix:")
            direct_get_user_response_no_bearer = requests.get(
                "http://backend:8000/sync/current-user",
                headers={
                    "Authorization": token
                }
            )
            print(f"Direct get user (no Bearer) response status code: {direct_get_user_response_no_bearer.status_code}")
            if direct_get_user_response_no_bearer.status_code != 200:
                print(f"Direct get user (no Bearer) failed: {direct_get_user_response_no_bearer.text}")
            else:
                print(f"Direct get user (no Bearer) successful: {direct_get_user_response_no_bearer.json()}")
        else:
            print(f"Direct get user successful: {direct_get_user_response.json()}")

        # Then try through frontend
        get_user_response = requests.get(
            "http://frontend/api/sync/current-user",
            headers=get_user_headers
        )

        print(f"Get user response status code: {get_user_response.status_code}")

        if get_user_response.status_code != 200:
            print(f"Get user failed: {get_user_response.text}")
            return False

        get_user_data = get_user_response.json()
        print(f"Get user successful: {get_user_data}")

        return True

    except Exception as e:
        print(f"Error testing login flow: {e}")
        return False

if __name__ == "__main__":
    success = test_login_flow()
    print(f"\nTest {'passed' if success else 'failed'}")
