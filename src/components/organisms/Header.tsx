import React from 'react';
import Logo from '../atoms/Logo';
import NotificationButton from '../atoms/NotificationButton';
import UserProfile from '../molecules/UserProfile';

interface HeaderProps {
  userName: string;
  roleName: string;
  onLogout: () => void;
  onNotificationClick?: () => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = React.memo(({ 
  userName, 
  roleName, 
  onLogout, 
  onNotificationClick,
  className = '' 
}) => {
  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Logo />
          
          <div className="flex items-center space-x-4">
            <NotificationButton onClick={onNotificationClick} />
            <UserProfile 
              userName={userName} 
              roleName={roleName} 
              onLogout={onLogout} 
            />
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;