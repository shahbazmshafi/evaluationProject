import React from 'react';
import { LucideIcon } from 'lucide-react';
import NavLink from '../atoms/NavLink';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../utils/permissions';

export interface NavigationItem {
  name: string;
  icon: LucideIcon;
  path: string;
  permission: string;
}

interface NavigationProps {
  items: NavigationItem[];
  className?: string;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ 
  items, 
  className = '' 
}) => {
  const { user } = useAuth();

  // Filter items based on user permissions
  const authorizedItems = items.filter(item => {
    // If no permission is required or it's a special case (Dashboard or Settings)
    if (!item.permission || item.permission === 'DASHBOARD_VIEW' || item.permission === 'SETTINGS_VIEW') {
      return true;
    }

    // Check if user has the required permission
    return hasPermission(user, item.permission);
  });

  return (
    <nav className={`bg-white shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {authorizedItems.map((item) => (
            <NavLink
              key={item.name}
              href={item.path}
              icon={item.icon}
              name={item.name}
            />
          ))}
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;
