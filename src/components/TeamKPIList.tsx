// src/components/TeamKPIList.tsx
import React, { useEffect, useState } from 'react';
import { KPI, User } from '../types';
import { apiService } from '../services/api';
import { kpiAccessControlService } from '../services/kpi_access_control';
import KPIAccessIndicator from './KPIAccessIndicator';

interface TeamKPIListProps {
  managerId: string;
}

const TeamKPIList: React.FC<TeamKPIListProps> = ({ managerId }) => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get all KPIs created by this manager
        const managerKPIs = await apiService.getManagerKPIs();
        setKpis(managerKPIs);

        // Get all users to identify team members
        const allUsers = await apiService.getAllUsers();
        const directReports = allUsers.filter(user => user.managerId === managerId);
        setTeamMembers(directReports);

        setLoading(false);
      } catch (err) {
        setError('Failed to load team KPIs');
        setLoading(false);
        console.error(err);
      }
    };

    fetchData();
  }, [managerId]);

  if (loading) return <div>Loading team KPIs...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="team-kpi-list">
      <h2>Team KPIs</h2>

      {kpis.length === 0 ? (
        <p>No KPIs created for your team yet.</p>
      ) : (
        <div className="kpi-grid">
          {kpis.map(kpi => (
            <div key={kpi.id} className="kpi-card">
              <div className="kpi-header">
                <h3>{kpi.title}</h3>
                <KPIAccessIndicator kpi={kpi} teamMembers={teamMembers} />
              </div>
              <p>{kpi.description}</p>
              <div className="kpi-details">
                <span>Type: {kpi.type}</span>
                <span>Weightage: {kpi.weightage}%</span>
                <span>Category: {kpi.category}</span>
                {kpi.type === 'employee-specific' && (
                  <span>
                    Target: {teamMembers.find(u => u.id === kpi.targetEmployeeId)?.name || 'Unknown'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamKPIList;
