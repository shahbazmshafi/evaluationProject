import requests
import json

def test_login(email, password):
    """
    Test login functionality by sending a request to the backend API
    """
    print(f"Testing login with email: {email}, password: {password}")
    
    try:
        # Send login request to the backend API
        response = requests.post(
            "http://localhost:8000/auth/login",
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"}
        )
        
        # Print response status code and content
        print(f"Response status code: {response.status_code}")
        
        try:
            response_json = response.json()
            print(f"Response content: {json.dumps(response_json, indent=2)}")
            
            if response.status_code == 200:
                print("Login successful!")
                return True
            else:
                print(f"Login failed: {response_json.get('detail', 'Unknown error')}")
                return False
        except json.JSONDecodeError:
            print(f"Response content (not JSON): {response.text}")
            return False
            
    except Exception as e:
        print(f"Error testing login: {e}")
        return False

def test_login_with_curl_command(email, password):
    """
    Print the curl command that can be used to test the login functionality
    """
    curl_command = f"""
    curl -X POST http://localhost:8000/auth/login \\
      -H "Content-Type: application/json" \\
      -d '{{"email": "{email}", "password": "{password}"}}'
    """
    print("\nCurl command for manual testing:")
    print(curl_command)

if __name__ == "__main__":
    # Test login with admin user
    admin_email = "sgul@trafix.com"
    admin_password = "Asdf@12345"
    
    test_login(admin_email, admin_password)
    test_login_with_curl_command(admin_email, admin_password)
    
    # Also test with incorrect password for comparison
    print("\n--- Testing with incorrect password ---")
    test_login(admin_email, "wrong_password")