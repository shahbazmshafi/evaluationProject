import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationButtonProps {
  onClick?: () => void;
  className?: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = React.memo(({ 
  onClick, 
  className = '' 
}) => {
  return (
    <button 
      onClick={onClick}
      className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors ${className}`}
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
    </button>
  );
});

NotificationButton.displayName = 'NotificationButton';

export default NotificationButton;