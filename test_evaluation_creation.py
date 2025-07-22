"""
Test script to verify the evaluation creation process.

This script tests:
1. Creating an evaluation as draft
2. Creating an evaluation with all fields populated
3. Creating an evaluation with missing optional fields
4. Verifying the response includes all required fields
5. Verifying proper error handling
6. Verifying permissions are correctly set
"""

import os
import sys
import json
import requests
from datetime import datetime

# Try to import dotenv, but continue if not available
try:
    from dotenv import load_dotenv
    # Load environment variables
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed. Using default environment variables.")

# API connection
API_URL = os.getenv("API_URL", "http://localhost:8000")
API_TOKEN = os.getenv("API_TOKEN", "")  # Set your API token here if needed

def get_headers():
    """Get headers for API requests"""
    headers = {"Content-Type": "application/json"}
    if API_TOKEN:
        headers["Authorization"] = f"Bearer {API_TOKEN}"
    return headers

def get_test_employee():
    """Get a test employee"""
    response = requests.get(f"{API_URL}/users?role=Employee", headers=get_headers())
    if response.status_code != 200:
        print(f"Failed to get employees: {response.status_code}")
        return None
    
    employees = response.json()
    if not employees:
        print("No employees found. Please create an employee first.")
        return None
    
    return employees[0]

def get_test_manager():
    """Get a test manager"""
    response = requests.get(f"{API_URL}/users?role=Manager", headers=get_headers())
    if response.status_code != 200:
        print(f"Failed to get managers: {response.status_code}")
        return None
    
    managers = response.json()
    if not managers:
        print("No managers found. Please create a manager first.")
        return None
    
    return managers[0]

def get_active_cycle():
    """Get the active evaluation cycle"""
    response = requests.get(f"{API_URL}/evaluation-cycles?status=active", headers=get_headers())
    if response.status_code != 200:
        print(f"Failed to get active cycle: {response.status_code}")
        return None
    
    cycles = response.json()
    if not cycles:
        print("No active evaluation cycle found. Please create and activate a cycle first.")
        return None
    
    return cycles[0]

def get_employee_kpis(employee_id):
    """Get KPIs for an employee"""
    response = requests.get(f"{API_URL}/kpis/employee/{employee_id}", headers=get_headers())
    if response.status_code != 200:
        print(f"Failed to get employee KPIs: {response.status_code}")
        return None
    
    kpis = response.json()
    if not kpis:
        print(f"No KPIs found for employee {employee_id}. Please assign KPIs first.")
        return None
    
    return kpis

def test_create_evaluation_draft():
    """Test creating an evaluation as draft"""
    print("\n=== Testing Creating Evaluation Draft ===")
    
    # Get test data
    employee = get_test_employee()
    if not employee:
        return False
    
    manager = get_test_manager()
    if not manager:
        return False
    
    cycle = get_active_cycle()
    cycle_id = cycle["id"] if cycle else None
    
    kpis = get_employee_kpis(employee["id"])
    if not kpis:
        return False
    
    # Prepare KPI evaluations
    kpi_evaluations = []
    for kpi in kpis:
        kpi_evaluations.append({
            "kpi_id": int(kpi["id"]),
            "title": kpi["title"],
            "description": kpi["description"],
            "category": kpi["category"],
            "weightage": kpi["weightage"],
            "rating": 3.5,  # Sample rating
            "comment": "Good performance"
        })
    
    # Get the current quarter and year for the period
    now = datetime.now()
    quarter = (now.month - 1) // 3 + 1
    year = now.year
    period = f"{year}-Q{quarter}"
    
    # Prepare evaluation data
    evaluation_data = {
        "employee_id": int(employee["id"]),
        "manager_id": int(manager["id"]),
        "period": period,
        "cycle_id": int(cycle_id) if cycle_id else None,
        "kpi_evaluations": kpi_evaluations,
        "status": "draft",
        "comments": "Overall good performance",
        "manager_comments": "Employee has shown improvement",
        "admin_comments": None,
        "submitted_by": int(manager["id"])
    }
    
    # Create evaluation
    response = requests.post(
        f"{API_URL}/evaluations",
        headers=get_headers(),
        json=evaluation_data
    )
    
    # Check response
    if response.status_code != 200:
        print(f"Failed to create evaluation: {response.status_code}")
        print(response.text)
        return False
    
    evaluation = response.json()
    print(f"Evaluation created successfully with ID: {evaluation['id']}")
    
    # Verify required fields
    required_fields = ["id", "employee_id", "manager_id", "status", "created_at", "updated_at", "permissions"]
    missing_fields = [field for field in required_fields if field not in evaluation]
    
    if missing_fields:
        print(f"Missing required fields in response: {missing_fields}")
        return False
    
    print("All required fields are present in the response")
    
    # Verify permissions
    if "permissions" not in evaluation:
        print("Permissions not included in response")
        return False
    
    permissions = evaluation["permissions"]
    permission_fields = ["can_view_increment_percentage", "can_view_admin_comments", "can_edit", "can_approve"]
    missing_permission_fields = [field for field in permission_fields if field not in permissions]
    
    if missing_permission_fields:
        print(f"Missing permission fields in response: {missing_permission_fields}")
        return False
    
    print("All permission fields are present in the response")
    return True

def test_create_evaluation_with_all_fields():
    """Test creating an evaluation with all fields populated"""
    print("\n=== Testing Creating Evaluation With All Fields ===")
    
    # Get test data
    employee = get_test_employee()
    if not employee:
        return False
    
    manager = get_test_manager()
    if not manager:
        return False
    
    cycle = get_active_cycle()
    cycle_id = cycle["id"] if cycle else None
    
    kpis = get_employee_kpis(employee["id"])
    if not kpis:
        return False
    
    # Prepare KPI evaluations
    kpi_evaluations = []
    for kpi in kpis:
        kpi_evaluations.append({
            "kpi_id": int(kpi["id"]),
            "title": kpi["title"],
            "description": kpi["description"],
            "category": kpi["category"],
            "weightage": kpi["weightage"],
            "rating": 4.0,  # Sample rating
            "comment": "Excellent performance"
        })
    
    # Get the current quarter and year for the period
    now = datetime.now()
    quarter = (now.month - 1) // 3 + 1
    year = now.year
    period = f"{year}-Q{quarter}"
    
    # Prepare evaluation data with all fields
    evaluation_data = {
        "employee_id": int(employee["id"]),
        "manager_id": int(manager["id"]),
        "period": period,
        "cycle_id": int(cycle_id) if cycle_id else None,
        "kpi_evaluations": kpi_evaluations,
        "status": "submitted",
        "comments": "Overall excellent performance",
        "manager_comments": "Employee has exceeded expectations",
        "admin_comments": "Approved for promotion",
        "submitted_by": int(manager["id"])
    }
    
    # Create evaluation
    response = requests.post(
        f"{API_URL}/evaluations",
        headers=get_headers(),
        json=evaluation_data
    )
    
    # Check response
    if response.status_code != 200:
        print(f"Failed to create evaluation: {response.status_code}")
        print(response.text)
        return False
    
    evaluation = response.json()
    print(f"Evaluation created successfully with ID: {evaluation['id']}")
    
    # Verify all fields are present
    all_fields = [
        "id", "employee_id", "manager_id", "cycle_id", "period", "raw_score", 
        "normalized_score", "performance_label", "increment_percentage", "status", 
        "comments", "manager_comments", "admin_comments", "created_at", "updated_at", 
        "submitted_at", "approved_at", "rejected_at", "created_by", "submitted_by", 
        "kpi_evaluations", "permissions"
    ]
    
    missing_fields = [field for field in all_fields if field not in evaluation]
    
    if missing_fields:
        print(f"Missing fields in response: {missing_fields}")
        return False
    
    print("All fields are present in the response")
    return True

def test_create_evaluation_with_missing_optional_fields():
    """Test creating an evaluation with missing optional fields"""
    print("\n=== Testing Creating Evaluation With Missing Optional Fields ===")
    
    # Get test data
    employee = get_test_employee()
    if not employee:
        return False
    
    manager = get_test_manager()
    if not manager:
        return False
    
    kpis = get_employee_kpis(employee["id"])
    if not kpis:
        return False
    
    # Prepare KPI evaluations
    kpi_evaluations = []
    for kpi in kpis:
        kpi_evaluations.append({
            "kpi_id": int(kpi["id"]),
            "title": kpi["title"],
            "description": kpi["description"],
            "category": kpi["category"],
            "weightage": kpi["weightage"],
            "rating": 3.0,  # Sample rating
            "comment": None  # Missing comment
        })
    
    # Get the current quarter and year for the period
    now = datetime.now()
    quarter = (now.month - 1) // 3 + 1
    year = now.year
    period = f"{year}-Q{quarter}"
    
    # Prepare evaluation data with missing optional fields
    evaluation_data = {
        "employee_id": int(employee["id"]),
        "manager_id": int(manager["id"]),
        "period": period,
        # Missing cycle_id
        "kpi_evaluations": kpi_evaluations,
        "status": "draft",
        # Missing comments
        # Missing manager_comments
        # Missing admin_comments
        "submitted_by": int(manager["id"])
    }
    
    # Create evaluation
    response = requests.post(
        f"{API_URL}/evaluations",
        headers=get_headers(),
        json=evaluation_data
    )
    
    # Check response
    if response.status_code != 200:
        print(f"Failed to create evaluation: {response.status_code}")
        print(response.text)
        return False
    
    evaluation = response.json()
    print(f"Evaluation created successfully with ID: {evaluation['id']}")
    
    # Verify required fields
    required_fields = ["id", "employee_id", "manager_id", "status", "created_at", "updated_at", "permissions"]
    missing_fields = [field for field in required_fields if field not in evaluation]
    
    if missing_fields:
        print(f"Missing required fields in response: {missing_fields}")
        return False
    
    print("All required fields are present in the response")
    return True

def test_error_handling():
    """Test error handling for invalid evaluation data"""
    print("\n=== Testing Error Handling ===")
    
    # Test with missing employee_id
    evaluation_data = {
        # Missing employee_id
        "manager_id": 1,
        "period": "2025-Q3",
        "kpi_evaluations": [],
        "status": "draft",
        "submitted_by": 1
    }
    
    response = requests.post(
        f"{API_URL}/evaluations",
        headers=get_headers(),
        json=evaluation_data
    )
    
    if response.status_code == 200:
        print("Error: Expected error for missing employee_id, but got success")
        return False
    
    print(f"Received expected error for missing employee_id: {response.status_code}")
    
    # Test with invalid kpi_evaluations
    evaluation_data = {
        "employee_id": 1,
        "manager_id": 1,
        "period": "2025-Q3",
        "kpi_evaluations": [
            {
                # Missing kpi_id
                "title": "Test KPI",
                "description": "Test description",
                "category": "technical",
                "weightage": 10,
                "rating": 3.0
            }
        ],
        "status": "draft",
        "submitted_by": 1
    }
    
    response = requests.post(
        f"{API_URL}/evaluations",
        headers=get_headers(),
        json=evaluation_data
    )
    
    if response.status_code == 200:
        print("Error: Expected error for invalid kpi_evaluations, but got success")
        return False
    
    print(f"Received expected error for invalid kpi_evaluations: {response.status_code}")
    
    return True

def main():
    """Main function to run all tests"""
    print("=== Starting Evaluation Creation Tests ===")
    
    # Run tests
    draft_test = test_create_evaluation_draft()
    all_fields_test = test_create_evaluation_with_all_fields()
    missing_fields_test = test_create_evaluation_with_missing_optional_fields()
    error_handling_test = test_error_handling()
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Create Evaluation Draft: {'PASS' if draft_test else 'FAIL'}")
    print(f"Create Evaluation With All Fields: {'PASS' if all_fields_test else 'FAIL'}")
    print(f"Create Evaluation With Missing Optional Fields: {'PASS' if missing_fields_test else 'FAIL'}")
    print(f"Error Handling: {'PASS' if error_handling_test else 'FAIL'}")
    
    # Overall result
    if draft_test and all_fields_test and missing_fields_test and error_handling_test:
        print("\nAll tests PASSED!")
        return 0
    else:
        print("\nSome tests FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())