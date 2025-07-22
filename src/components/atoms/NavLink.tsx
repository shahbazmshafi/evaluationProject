import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  name: string;
  className?: string;
}

const NavLink: React.FC<NavLinkProps> = React.memo(({ 
  href, 
  icon: Icon, 
  name, 
  className = '' 
}) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Link
      to={href}
      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
        isActive(href)
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } ${className}`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {name}
    </Link>
  );
});

NavLink.displayName = 'NavLink';

export default NavLink;