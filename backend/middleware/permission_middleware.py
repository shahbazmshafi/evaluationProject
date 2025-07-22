from functools import wraps
from flask import request, jsonify, g
import logging

logger = logging.getLogger(__name__)

def has_permission(required_permission):
    """
    Middleware to check if the user has the required permission.
    
    Args:
        required_permission (str): The permission name required to access the endpoint
        
    Returns:
        function: The decorated function
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get the current user from the request context
            current_user = g.get('current_user')
            
            if not current_user:
                logger.warning("Permission check failed: No authenticated user")
                return jsonify({"detail": "Authentication required"}), 401
            
            # Get user's role with permissions
            user_role = current_user.get('role', {})
            
            # Check if the role has permissions
            if not user_role or 'permissions' not in user_role:
                logger.warning(f"Permission check failed: User {current_user.get('id')} has no role or permissions")
                return jsonify({"detail": "You don't have permission to access this resource"}), 403
            
            # Check if the user has the required permission
            user_permissions = user_role.get('permissions', [])
            has_required_permission = any(p.get('name') == required_permission for p in user_permissions)
            
            if not has_required_permission:
                logger.warning(f"Permission check failed: User {current_user.get('id')} lacks permission {required_permission}")
                return jsonify({"detail": "You don't have permission to access this resource"}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def has_any_permission(required_permissions):
    """
    Middleware to check if the user has any of the required permissions.
    
    Args:
        required_permissions (list): List of permission names, any of which grants access
        
    Returns:
        function: The decorated function
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get the current user from the request context
            current_user = g.get('current_user')
            
            if not current_user:
                logger.warning("Permission check failed: No authenticated user")
                return jsonify({"detail": "Authentication required"}), 401
            
            # Get user's role with permissions
            user_role = current_user.get('role', {})
            
            # Check if the role has permissions
            if not user_role or 'permissions' not in user_role:
                logger.warning(f"Permission check failed: User {current_user.get('id')} has no role or permissions")
                return jsonify({"detail": "You don't have permission to access this resource"}), 403
            
            # Check if the user has any of the required permissions
            user_permissions = user_role.get('permissions', [])
            user_permission_names = [p.get('name') for p in user_permissions]
            
            if not any(perm in user_permission_names for perm in required_permissions):
                logger.warning(f"Permission check failed: User {current_user.get('id')} lacks any of {required_permissions}")
                return jsonify({"detail": "You don't have permission to access this resource"}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def has_all_permissions(required_permissions):
    """
    Middleware to check if the user has all of the required permissions.
    
    Args:
        required_permissions (list): List of permission names, all of which are required
        
    Returns:
        function: The decorated function
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get the current user from the request context
            current_user = g.get('current_user')
            
            if not current_user:
                logger.warning("Permission check failed: No authenticated user")
                return jsonify({"detail": "Authentication required"}), 401
            
            # Get user's role with permissions
            user_role = current_user.get('role', {})
            
            # Check if the role has permissions
            if not user_role or 'permissions' not in user_role:
                logger.warning(f"Permission check failed: User {current_user.get('id')} has no role or permissions")
                return jsonify({"detail": "You don't have permission to access this resource"}), 403
            
            # Check if the user has all of the required permissions
            user_permissions = user_role.get('permissions', [])
            user_permission_names = [p.get('name') for p in user_permissions]
            
            missing_permissions = [perm for perm in required_permissions if perm not in user_permission_names]
            
            if missing_permissions:
                logger.warning(f"Permission check failed: User {current_user.get('id')} lacks permissions {missing_permissions}")
                return jsonify({"detail": "You don't have permission to access this resource"}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator