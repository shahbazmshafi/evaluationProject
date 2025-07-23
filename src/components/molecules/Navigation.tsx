import React, { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';
import NavLink from '../atoms/NavLink';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission, hasPermissionEnhanced, hasGranularPermission } from '../../utils/permissions';

export interface NavigationItem {
  name: string;
  icon: LucideIcon;
  path: string;
  permission: string;
  granularPermission?: {
    module: string;
    action: string;
  };
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
  const [authorizedItems, setAuthorizedItems] = useState<NavigationItem[]>([]);

  useEffect(() => {
    const checkPermissions = async () => {
      const filteredItems: NavigationItem[] = [];

      for (const item of items) {
        let hasAccess = false;

        // If no permission is required or it's a special case (Dashboard or Settings)
        if (!item.permission || item.permission === 'DASHBOARD_VIEW' || item.permission === 'SETTINGS_VIEW') {
          hasAccess = true;
        }
        // Use enhanced permission checker for special permissions like ACCESS_CONTROL_VIEW
        else if (item.permission === 'ACCESS_CONTROL_VIEW') {
          hasAccess = hasPermissionEnhanced(user, item.permission);
        }
        // Check for granular permissions if specified
        else if (item.granularPermission) {
          // Check both role-based permission AND granular permission
          const hasRolePermission = hasPermission(user, item.permission);
          const hasGranularPerm = await hasGranularPermission(
            user, 
            item.granularPermission.module, 
            item.granularPermission.action
          );
          hasAccess = hasRolePermission || hasGranularPerm;
        }
        // Default role-based permission check
        else {
          hasAccess = hasPermission(user, item.permission);
        }

        if (hasAccess) {
          filteredItems.push(item);
        }
      }

      setAuthorizedItems(filteredItems);
    };

    checkPermissions();
  }, [user, items]);

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
