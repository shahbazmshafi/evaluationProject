// src/components/KPIAccessIndicator.tsx
import React from 'react';
import { KPI, User } from '../types';

interface KPIAccessIndicatorProps {
  kpi: KPI;
  teamMembers?: User[];
  showText?: boolean;
}

const KPIAccessIndicator: React.FC<KPIAccessIndicatorProps> = ({ 
  kpi, 
  teamMembers = [], 
  showText = true 
}) => {
  const getVisibilityText = (): string => {
    if (kpi.type === 'global') {
      return 'Visible to all team members';
    } else if (kpi.type === 'role-based') {
      const roleName = teamMembers.find(u => u.role.id === kpi.targetRoleId)?.role.name;
      return `Visible to team members with ${roleName || 'specific'} role`;
    } else if (kpi.type === 'employee-specific') {
      const employeeName = teamMembers.find(u => u.id === kpi.targetEmployeeId)?.name;
      return `Visible only to ${employeeName || 'specific employee'}`;
    }
    return 'Unknown visibility';
  };

  const getVisibilityIcon = (): string => {
    if (kpi.type === 'global') {
      return '👥'; // Group icon for global visibility
    } else if (kpi.type === 'role-based') {
      return '👤👤'; // Multiple people for role-based
    } else if (kpi.type === 'employee-specific') {
      return '👤'; // Single person for employee-specific
    }
    return '❓'; // Question mark for unknown
  };

  const getKPITypeText = (): string => {
    return kpi.isTechnical ? 'Technical KPI' : 'Administrative KPI';
  };

  const getKPITypeIcon = (): string => {
    return kpi.isTechnical ? '🔧' : '📋'; // Wrench for technical, clipboard for administrative
  };

  return (
    <div className="kpi-access-indicator">
      <div title={getVisibilityText()} className="mb-1">
        <span className="visibility-icon">{getVisibilityIcon()}</span>
        {showText && <span className="visibility-text">{getVisibilityText()}</span>}
      </div>
      <div title={getKPITypeText()} className="text-sm text-gray-600">
        <span className="kpi-type-icon">{getKPITypeIcon()}</span>
        {showText && <span className="kpi-type-text ml-1">{getKPITypeText()}</span>}
      </div>
    </div>
  );
};

export default KPIAccessIndicator;
