# Test script to verify the fix for the submitted_by field in Evaluation model
import sys
import os
import requests
import json
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Define the API endpoint
API_URL = "http://localhost:8000"  # Adjust if your API is running on a different URL

# Function to authenticate and get a token
def get_auth_token(username, password):
    response = requests.post(
        f"{API_URL}/token",
        data={"username": username, "password": password}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"Authentication failed: {response.text}")
        return None

# Function to create an evaluation
def create_evaluation(token, evaluation_data):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    response = requests.post(
        f"{API_URL}/evaluations",
        headers=headers,
        json=evaluation_data
    )
    return response

# Main test function
def test_evaluation_creation():
    # Get authentication token
    token = get_auth_token("admin@example.com", "admin123")  # Replace with valid credentials
    if not token:
        print("Failed to get authentication token. Exiting.")
        return

    # Test case 1: Create evaluation with draft status (submitted_by should be None)
    draft_evaluation = {
        "employee_id": 2,  # Replace with a valid employee ID
        "manager_id": 1,   # Replace with a valid manager ID
        "period": "2025-Q3",
        "cycle_id": 1,     # Replace with a valid cycle ID
        "status": "draft",
        "kpi_evaluations": [
            {
                "kpi_id": 1,  # Replace with a valid KPI ID
                "title": "Test KPI",
                "description": "Test KPI Description",
                "category": "Technical",
                "weightage": 1.0,
                "rating": 3,
                "comment": "Test comment"
            }
        ],
        "comments": "Draft evaluation test"
    }
    
    print("Testing draft evaluation creation...")
    response = create_evaluation(token, draft_evaluation)
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text}")
    
    # Test case 2: Create evaluation with submitted status (submitted_by should be set)
    submitted_evaluation = {
        "employee_id": 2,  # Replace with a valid employee ID
        "manager_id": 1,   # Replace with a valid manager ID
        "period": "2025-Q3",
        "cycle_id": 1,     # Replace with a valid cycle ID
        "status": "submitted",
        "submitted_by": 1,  # Replace with a valid user ID
        "kpi_evaluations": [
            {
                "kpi_id": 1,  # Replace with a valid KPI ID
                "title": "Test KPI",
                "description": "Test KPI Description",
                "category": "Technical",
                "weightage": 1.0,
                "rating": 3,
                "comment": "Test comment"
            }
        ],
        "comments": "Submitted evaluation test"
    }
    
    print("\nTesting submitted evaluation creation...")
    response = create_evaluation(token, submitted_evaluation)
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_evaluation_creation()