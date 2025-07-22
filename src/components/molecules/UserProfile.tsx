import React from 'react';
import { User, LogOut } from 'lucide-react';

interface UserProfileProps {
  userName: string;
  roleName: string;
  onLogout: () => void;
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = React.memo(({ 
  userName, 
  roleName, 
  onLogout, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <User className="h-5 w-5 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">{userName}</span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {roleName || 'Unknown Role'}
        </span>
      </div>

      <button
        onClick={onLogout}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        aria-label="Logout"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </div>
  );
});

UserProfile.displayName = 'UserProfile';

export default UserProfile;