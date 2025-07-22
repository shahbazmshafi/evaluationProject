import requests
import json
import sys
import os
from datetime import datetime, timedelta

# Base URL for the API
BASE_URL = "http://localhost:8000"

# Test credentials
ADMIN_CREDENTIALS = {
    "email": "admin@example.com",
    "password": "adminpassword"
}

MANAGER_CREDENTIALS = {
    "email": "manager@example.com",
    "password": "managerpassword"
}

def login(credentials):
    """Login and get auth token"""
    response = requests.post(f"{BASE_URL}/login", json=credentials)
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        sys.exit(1)
    return response.json()["token"]

def test_active_cycle_access():
    """Test that both admin and manager can access active evaluation cycles"""
    print("\n=== Testing Active Cycle Access ===")
    
    # Login as admin
    admin_token = login(ADMIN_CREDENTIALS)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Login as manager
    manager_token = login(MANAGER_CREDENTIALS)
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    
    # Create an active evaluation cycle as admin
    cycle_data = {
        "name": "Test Cycle",
        "evaluation_start_date": (datetime.now() - timedelta(days=1)).isoformat(),
        "evaluation_end_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "execution_start_date": (datetime.now() - timedelta(days=1)).isoformat(),
        "execution_end_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "status": "active"
    }
    
    response = requests.post(f"{BASE_URL}/evaluation-cycles", json=cycle_data, headers=admin_headers)
    if response.status_code != 200:
        print(f"Failed to create evaluation cycle: {response.text}")
        return False
    
    cycle_id = response.json()["id"]
    print(f"Created active evaluation cycle with ID: {cycle_id}")
    
    # Test admin access to active cycles
    response = requests.get(f"{BASE_URL}/evaluation-cycles?status=active", headers=admin_headers)
    if response.status_code != 200:
        print(f"Admin failed to access active cycles: {response.text}")
        return False
    
    admin_cycles = response.json()
    if not admin_cycles:
        print("Admin could not see any active cycles")
        return False
    
    print(f"Admin can see {len(admin_cycles)} active cycle(s)")
    
    # Test manager access to active cycles
    response = requests.get(f"{BASE_URL}/evaluation-cycles?status=active", headers=manager_headers)
    if response.status_code != 200:
        print(f"Manager failed to access active cycles: {response.text}")
        return False
    
    manager_cycles = response.json()
    if not manager_cycles:
        print("Manager could not see any active cycles")
        return False
    
    print(f"Manager can see {len(manager_cycles)} active cycle(s)")
    
    # Test manager access to specific active cycle
    response = requests.get(f"{BASE_URL}/evaluation-cycles/{cycle_id}", headers=manager_headers)
    if response.status_code != 200:
        print(f"Manager failed to access specific active cycle: {response.text}")
        return False
    
    print(f"Manager can access specific active cycle with ID: {cycle_id}")
    
    # Clean up - deactivate the cycle
    deactivate_data = {"status": "completed"}
    requests.put(f"{BASE_URL}/evaluation-cycles/{cycle_id}", json=deactivate_data, headers=admin_headers)
    
    return True

def main():
    """Run all tests"""
    print("Starting evaluation cycle access tests...")
    
    success = test_active_cycle_access()
    
    if success:
        print("\nAll tests passed!")
    else:
        print("\nSome tests failed!")

if __name__ == "__main__":
    main()