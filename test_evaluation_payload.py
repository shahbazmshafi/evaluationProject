import json
import requests
import sys

# Test script to verify the evaluation creation API payload structure
# This script will create a test evaluation with the correct payload structure
# and verify that the API returns a 201 status code

# Configuration
API_URL = "http://192.168.20.63/evaluations"
AUTH_TOKEN = "your_auth_token_here"  # Replace with a valid auth token

# Test payload based on the example in the issue description
test_payload = {
  "employee_id": 7,
  "manager_id": 1,
  "period": "2025-Q3",
  "cycle_id": None,  # Optional, can be null
  "kpi_evaluations": [
    {
      "kpi_id": 12,
      "title": "Attendance KPI",
      "description": "Attendance KPI",
      "category": "admin",
      "weightage": 15,
      "rating": 4,
      "comment": "4"
    },
    {
      "kpi_id": 15,
      "title": "Sr.Dev Kpi",
      "description": "Sr.Dev Kpi",
      "category": "technical",
      "weightage": 40,
      "rating": 4,
      "comment": "4"
    },
    {
      "kpi_id": 17,
      "title": "admin Create role employee KPI",
      "description": "admin Create role employee KPI",
      "category": "technical",
      "weightage": 2,
      "rating": 4,
      "comment": "4"
    },
    {
      "kpi_id": 19,
      "title": "Employee Rolebased KPI By manager",
      "description": "Employee Rolebased KPI By manager",
      "category": "technical",
      "weightage": 1,
      "rating": 4,
      "comment": "4"
    },
    {
      "kpi_id": 20,
      "title": "Office Ethic Global",
      "description": "Office Ethic Global",
      "category": "admin",
      "weightage": 10,
      "rating": 4,
      "comment": "4"
    },
    {
      "kpi_id": 21,
      "title": "Office Ethic Global -Administrative",
      "description": "Office Ethic Global -Administrative",
      "category": "admin",
      "weightage": 5,
      "rating": 4,
      "comment": "4"
    }
  ],
  "status": "draft",
  "comments": "4",
  "submitted_by": 1
}

def test_evaluation_creation():
    """Test the evaluation creation API endpoint with the correct payload structure."""
    print("Testing evaluation creation API endpoint...")
    print(f"API URL: {API_URL}")
    
    # Print the payload for debugging
    print("\nPayload:")
    print(json.dumps(test_payload, indent=2))
    
    # Check if we should actually send the request or just print the payload
    if len(sys.argv) > 1 and sys.argv[1] == "--send":
        try:
            # Send the request
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {AUTH_TOKEN}"
            }
            
            response = requests.post(API_URL, json=test_payload, headers=headers)
            
            # Print the response
            print("\nResponse:")
            print(f"Status code: {response.status_code}")
            
            if response.status_code == 201:
                print("Success! Evaluation created successfully.")
                print("\nResponse body:")
                print(json.dumps(response.json(), indent=2))
                return True
            else:
                print("Error! Failed to create evaluation.")
                print("\nResponse body:")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"Error: {e}")
            return False
    else:
        print("\nThis is a dry run. Use --send to actually send the request.")
        return True

if __name__ == "__main__":
    test_evaluation_creation()