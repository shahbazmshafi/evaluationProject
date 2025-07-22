import requests
import json

# Base URL for API calls
API_BASE_URL = "http://localhost:8000"

# Function to login and get token
def login(email, password):
    response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

# Function to get users with token
def get_users(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE_URL}/users", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Get users failed: {response.status_code} - {response.text}")
        return None

# Test with admin user
print("Testing with admin user...")
admin_token = login("admin@company.com", "password")
if admin_token:
    admin_users = get_users(admin_token)
    if admin_users:
        print(f"Admin can see {len(admin_users)} users")
        # Check if any admin users are in the list
        admin_users_in_list = [user for user in admin_users if user.get("role", {}).get("name", "").lower() == "admin"]
        print(f"Admin users in the list: {len(admin_users_in_list)}")
        if len(admin_users_in_list) == 0:
            print("Success: Admin cannot see other admin users")
        else:
            print("Failure: Admin can still see other admin users")

# Test with manager user
print("\nTesting with manager user...")
manager_token = login("manager@company.com", "password")
if manager_token:
    manager_users = get_users(manager_token)
    if manager_users:
        print(f"Manager can see {len(manager_users)} users")
        # Check if all users have the manager as their manager
        direct_reports = [user for user in manager_users if user.get("manager_id") == "2"]  # Assuming manager ID is 2
        print(f"Direct reports: {len(direct_reports)}")
        if len(direct_reports) == len(manager_users):
            print("Success: Manager can only see direct reports")
        else:
            print("Failure: Manager can see users who are not direct reports")

print("\nTest completed.")