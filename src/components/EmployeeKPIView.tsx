// src/components/EmployeeKPIView.tsx
import React, { useEffect, useState } from 'react';
import { KPI } from '../types';
import { kpiAccessControlService } from '../services/kpi_access_control';
import KPIAccessIndicator from './KPIAccessIndicator';

interface EmployeeKPIViewProps {
  userId: string;
}

const EmployeeKPIView: React.FC<EmployeeKPIViewProps> = ({ userId }) => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);
        const visibleKPIs = await kpiAccessControlService.getVisibleKPIs(userId);
        setKpis(visibleKPIs);
        setLoading(false);
      } catch (err) {
        setError('Failed to load your KPIs');
        setLoading(false);
        console.error(err);
      }
    };

    fetchKPIs();
  }, [userId]);

  if (loading) return <div>Loading your KPIs...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="employee-kpi-view">
      <h2>My KPIs</h2>

      {kpis.length === 0 ? (
        <p>No KPIs assigned to you yet.</p>
      ) : (
        <div className="kpi-grid">
          {kpis.map(kpi => (
            <div key={kpi.id} className="kpi-card">
              <h3>{kpi.title}</h3>
              <p>{kpi.description}</p>
              <div className="kpi-details">
                <span>Type: {kpi.type}</span>
                <span>Weightage: {kpi.weightage}%</span>
                <span>Category: {kpi.category}</span>
                <KPIAccessIndicator kpi={kpi} showText={false} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeKPIView;
