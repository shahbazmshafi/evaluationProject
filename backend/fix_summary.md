# KPI Creation Bug Fix Summary

## Issue Description
When trying to create a KPI as an admin user, the following error was encountered:

```
{
    "detail": "Failed to create KPI: attempted relative import beyond top-level package"
}
```

This error occurred when making a POST request to the `/api/kpis` endpoint with a valid KPI payload.

## Root Cause Analysis
After examining the codebase, the issue was identified in the `main.py` file. The `create_kpi` function was using an incorrect import statement:

```python
# Use the KPIService to create the KPI with proper validation
from services.kpi import KPIService
```

This import statement was problematic because:
1. It was not a proper relative import (it didn't use dots to indicate a relative import)
2. It was not an absolute import from the root of the project
3. Python was treating it as a relative import, but couldn't find the `services` package because it was trying to import it relative to a package that doesn't exist or is not in the Python path

## Fix Implemented
The import statement was changed to use a proper relative import:

```python
# Use the KPIService to create the KPI with proper validation
from .services.kpi import KPIService
```

This change ensures that Python correctly imports the `KPIService` class from the `services.kpi` module relative to the current package.

## Verification
To verify that the fix resolves the issue:

1. Run the application using Docker:
   ```
   docker-compose up
   ```

2. Log in as an admin user and obtain an authentication token.

3. Make a POST request to the `/api/kpis` endpoint with the following payload:
   ```json
   {
     "title": "Admin Create 100KPI global",
     "description": "Admin Create 100KPI global",
     "weightage": 100,
     "is_technical": true,
     "status": "active",
     "target_employee_id": null,
     "target_role_id": null,
     "type": "global"
   }
   ```

4. Verify that the request is successful and returns a 201 Created status code.

5. Alternatively, run the provided test script:
   ```
   cd backend/tests
   python test_kpi_fix.py
   ```
   Note: The test script requires the FastAPI package to be installed.

## Additional Notes
- The fix is minimal and focused on resolving the specific import issue.
- No changes were made to the actual KPI creation logic.
- The fix ensures that the application can correctly import the KPIService class, which is essential for creating KPIs.