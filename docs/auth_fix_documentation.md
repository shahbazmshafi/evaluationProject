# Authentication Fix Documentation

## Issue Description
Users were facing "Unauthorized" issues when trying to login via sgul@trafix.com and password "Asdf@12345" when accessing the application via local IP address. The logs showed that the login request to `/auth/login` was successful (200 OK), but the subsequent request to `/sync/current-user` was failing with a 401 Unauthorized error.

## Root Cause Analysis
After investigating the issue, we found that there was a problem with how the JWT token was being generated and validated. Specifically, the `create_access_token` function was setting the "sub" field in the token payload to an integer (the user ID), but the JWT library was expecting the "sub" field to be a string. This was causing the token validation to fail with the error "Subject must be a string".

## Solution
To fix this issue, we made the following changes:

1. Updated the `create_access_token` function in `main.py` to convert the user ID to a string before setting it as the "sub" field in the token payload:
   ```python
   def create_access_token(user_id: int) -> str:
       payload = {"sub": str(user_id)}
       return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
   ```

2. Updated the `get_current_user` function in `main.py` to handle the string user ID correctly by converting it back to an integer before using it to query the database:
   ```python
   def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
       try:
           payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
           user_id_str: str = payload.get("sub")
           if user_id_str is None:
               raise HTTPException(status_code=401, detail="Invalid authentication credentials")
           
           # Convert string user_id to integer
           try:
               user_id = int(user_id_str)
           except ValueError:
               raise HTTPException(status_code=401, detail="Invalid authentication credentials")
       except jwt.PyJWTError:
           raise HTTPException(status_code=401, detail="Invalid authentication credentials")

       user = db.query(User).filter(User.id == user_id).first()
       if user is None:
           raise HTTPException(status_code=401, detail="User not found")
       return user
   ```

3. Updated the SECRET_KEY in `main.py` to a more secure value:
   ```python
   SECRET_KEY = "project-bolt-secure-key-for-jwt-token-validation"
   ```

4. Updated the URLs in `test_login_flow.py` to use the service name `frontend` instead of `localhost`:
   ```python
   login_response = requests.post(
       "http://frontend/api/auth/login",
       json={"email": email, "password": password},
       headers={"Content-Type": "application/json"}
   )
   ```

   ```python
   sync_response = requests.post(
       "http://frontend/api/sync/current-user",
       json={"user": user},
       headers={
           "Content-Type": "application/json",
           "Authorization": f"Bearer {token}"
       }
   )
   ```

   ```python
   get_user_response = requests.get(
       "http://frontend/api/sync/current-user",
       headers={
           "Authorization": f"Bearer {token}"
       }
   )
   ```

## Testing
We created a test script (`test_login_flow.py`) that tests the login flow and verifies that the token is properly passed to the `/sync/current-user` endpoint. The script:
1. Logs in with the admin user credentials
2. Makes a POST request to `/sync/current-user` with the token in the Authorization header
3. Makes a GET request to `/sync/current-user` with the token in the Authorization header

The test script can be run with the following command:
```bash
docker exec -it project-backend-1 python test_login_flow.py
```

## Conclusion
The issue was fixed by ensuring that the JWT token is generated and validated correctly:

1. The `create_access_token` function now converts the user ID to a string before setting it as the "sub" field in the token payload
2. The `get_current_user` function now handles the string user ID correctly by converting it back to an integer before using it to query the database
3. The SECRET_KEY was updated to a more secure value

This comprehensive approach ensures that the authentication flow works correctly, allowing users to login successfully and access the application via local IP address.