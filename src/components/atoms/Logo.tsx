import React from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = React.memo(({ className = '' }) => {
  return (
    <Link to="/" className={`flex items-center ${className}`}>
      <Target className="h-8 w-8 text-blue-600" />
      <span className="ml-2 text-xl font-bold text-gray-900">EvalPortal</span>
    </Link>
  );
});

Logo.displayName = 'Logo';

export default Logo;