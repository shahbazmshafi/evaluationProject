import requests
import json

# Base URL for the API
BASE_URL = "http://localhost:8000"  # Change this to match your server

# Admin user credentials
admin_credentials = {
    "username": "admin",
    "password": "admin"  # Replace with actual admin password
}

# Test user credentials (user with role_id = 13)
test_user_credentials = {
    "username": "test_user",
    "password": "password"  # Replace with actual test user password
}

def login(credentials):
    """Login and get access token"""
    response = requests.post(f"{BASE_URL}/token", data=credentials)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def create_role_kpi(token):
    """Create a role-based KPI targeting role_id = 13"""
    headers = {"Authorization": f"Bearer {token}"}
    kpi_data = {
        "title": "Test Role KPI",
        "description": "Test role-based KPI created by admin",
        "weightage": 10,
        "type": "role-based",
        "target_role_id": 13,
        "status": "active",
        "is_technical": True
    }
    
    response = requests.post(f"{BASE_URL}/api/kpis", headers=headers, json=kpi_data)
    if response.status_code == 200:
        print("KPI created successfully")
        return response.json()["id"]
    else:
        print(f"Failed to create KPI: {response.text}")
        return None

def get_employee_kpis(token, employee_id):
    """Get KPIs for a specific employee"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/kpis/employee/{employee_id}", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to get employee KPIs: {response.text}")
        return None

def main():
    # Step 1: Login as admin
    print("Logging in as admin...")
    admin_token = login(admin_credentials)
    if not admin_token:
        return
    
    # Step 2: Create a role-based KPI targeting role_id = 13
    print("Creating role-based KPI...")
    kpi_id = create_role_kpi(admin_token)
    if not kpi_id:
        return
    
    # Step 3: Login as test user (with role_id = 13)
    print("Logging in as test user...")
    test_user_token = login(test_user_credentials)
    if not test_user_token:
        return
    
    # Step 4: Get the test user's ID
    headers = {"Authorization": f"Bearer {test_user_token}"}
    response = requests.get(f"{BASE_URL}/api/users/me", headers=headers)
    if response.status_code != 200:
        print(f"Failed to get user info: {response.text}")
        return
    
    test_user_id = response.json()["id"]
    
    # Step 5: Get the test user's KPIs
    print(f"Getting KPIs for test user (ID: {test_user_id})...")
    kpis = get_employee_kpis(test_user_token, test_user_id)
    
    # Step 6: Check if the role-based KPI is included
    if kpis:
        role_kpis = [kpi for kpi in kpis if kpi["type"] == "role-based" and kpi["target_role_id"] == 13]
        if role_kpis:
            print("Success! Role-based KPI is visible to the test user.")
            for kpi in role_kpis:
                print(f"- {kpi['title']} (ID: {kpi['id']})")
        else:
            print("Error: Role-based KPI is not visible to the test user.")
    
if __name__ == "__main__":
    main()