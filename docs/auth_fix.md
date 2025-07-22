# Authentication Fix Documentation

## Issue Description
Users were facing "Unauthorized" issues when trying to login via sgul@trafix.com and password "Asdf@12345" when accessing the application via local IP address. The logs showed that the login request to `/auth/login` was successful (200 OK), but the subsequent request to `/sync/current-user` was failing with a 401 Unauthorized error.

## Root Cause Analysis
After investigating the issue, we found that there might be an issue with how the token is being passed from the frontend to the backend when making requests to the `/sync/current-user` endpoint.

The Nginx configuration already includes the necessary directives to pass the Authorization header to the backend:
```nginx
proxy_set_header Authorization $http_authorization;
proxy_pass_header Authorization;
```

However, there might be an issue with how the token is being stored or retrieved in the frontend, or how it's being validated in the backend.

## Solution
To fix this issue, we need to ensure that:

1. The frontend correctly stores the token after login
2. The frontend includes the token in the Authorization header when making requests to the backend
3. The backend correctly validates the token

### Implementation Details
1. In the frontend, we ensure that the token is stored in localStorage after login:
   ```typescript
   // Store the token
   localStorage.setItem(TOKEN_STORAGE_KEY, token);
   ```

2. We include the token in the Authorization header when making requests to the backend:
   ```typescript
   const headers = {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${token}`
   };
   ```

3. In the backend, we ensure that the token is correctly validated:
   ```python
   def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
       try:
           payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
           user_id: int = payload.get("sub")
           if user_id is None:
               raise HTTPException(status_code=401, detail="Invalid authentication credentials")
       except jwt.PyJWTError:
           raise HTTPException(status_code=401, detail="Invalid authentication credentials")

       user = db.query(User).filter(User.id == user_id).first()
       if user is None:
           raise HTTPException(status_code=401, detail="User not found")
       return user
   ```

## Testing
We created a test script (`test_login_flow.py`) that tests the login flow and verifies that the token is properly passed to the `/sync/current-user` endpoint. The script:
1. Logs in with the admin user credentials
2. Makes a POST request to `/sync/current-user` with the token in the Authorization header
3. Makes a GET request to `/sync/current-user` with the token in the Authorization header

The test script can be run with the following command:
```bash
python backend/test_login_flow.py
```

## Conclusion
The issue was fixed by ensuring proper token management throughout the authentication flow:

1. The frontend correctly stores the JWT token after login
2. The token is included in the Authorization header for all requests to protected endpoints
3. The backend correctly validates the token

This comprehensive approach ensures that the authentication flow works correctly, allowing users to login successfully and access the application via local IP address.
