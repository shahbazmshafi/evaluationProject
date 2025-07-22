# Local storage schemas
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

class LocalStorageUserData(BaseModel):
    users: List[Dict[str, Any]]

class LocalStoragePasswordData(BaseModel):
    passwords: Dict[str, str]