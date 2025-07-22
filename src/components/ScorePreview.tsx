import React from 'react';
import { KPIEvaluation } from '../types';
import { Download, BarChart } from 'lucide-react';
import { apiService } from '../services/api';

interface ScorePreviewProps {
  kpiEvaluations: KPIEvaluation[];
  employeeName?: string;
  period?: string;
}

const ScorePreview: React.FC<ScorePreviewProps> = ({ 
  kpiEvaluations, 
  employeeName = 'Employee',
  period = 'Current Period'
}) => {
  // Calculate scores
  const rawScore = apiService.calculateRawScore(kpiEvaluations);
  const normalizedScore = apiService.calculateNormalizedScore(rawScore);
  const performanceLabel = apiService.getPerformanceLabel(normalizedScore);
  const incrementPercentage = apiService.calculateIncrementPercentage(normalizedScore);

  // Calculate technical and admin scores separately
  const technicalKPIs = kpiEvaluations.filter(kpi => kpi.category === 'technical');
  const adminKPIs = kpiEvaluations.filter(kpi => kpi.category === 'admin');
  
  const technicalScore = technicalKPIs.length > 0 
    ? apiService.calculateRawScore(technicalKPIs) 
    : 0;
  
  const adminScore = adminKPIs.length > 0 
    ? apiService.calculateRawScore(adminKPIs) 
    : 0;

  // Calculate percentages for visualization
  const technicalPercentage = technicalKPIs.length > 0 
    ? Math.min(100, (technicalScore / 5) * 100) 
    : 0;
  
  const adminPercentage = adminKPIs.length > 0 
    ? Math.min(100, (adminScore / 5) * 100) 
    : 0;
  
  const normalizedPercentage = Math.min(100, (normalizedScore / 5) * 100);

  // Handle export to CSV
  const handleExport = () => {
    // Create CSV content
    const headers = ['KPI Title', 'Category', 'Weightage', 'Rating', 'Comment'];
    const rows = kpiEvaluations.map(kpi => [
      kpi.title,
      kpi.category,
      kpi.weightage.toString(),
      kpi.rating.toString(),
      kpi.comment || ''
    ]);

    // Add summary row
    rows.push(['', '', '', '', '']);
    rows.push(['Summary', '', '', '', '']);
    rows.push(['Technical Score', technicalScore.toFixed(2), '', '', '']);
    rows.push(['Admin Score', adminScore.toFixed(2), '', '', '']);
    rows.push(['Raw Score', rawScore.toFixed(2), '', '', '']);
    rows.push(['Normalized Score', normalizedScore.toFixed(2), '', '', '']);
    rows.push(['Performance Label', performanceLabel, '', '', '']);
    rows.push(['Increment Percentage', `${incrementPercentage.toFixed(2)}%`, '', '', '']);

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${employeeName.replace(/\s+/g, '_')}_Evaluation_${period.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Performance Score Preview</h2>
        <button
          onClick={handleExport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Score visualization */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Score Visualization</h3>
          
          {/* Technical Score */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-purple-700">Technical Score</span>
              <span className="text-sm font-medium text-purple-700">{technicalScore.toFixed(1)}/5.0</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full bg-purple-600" 
                style={{ width: `${technicalPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Admin Score */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-green-700">Admin Score</span>
              <span className="text-sm font-medium text-green-700">{adminScore.toFixed(1)}/5.0</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full bg-green-600" 
                style={{ width: `${adminPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Normalized Score */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-blue-700">Normalized Score</span>
              <span className="text-sm font-medium text-blue-700">{normalizedScore.toFixed(1)}/5.0</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full bg-blue-600" 
                style={{ width: `${normalizedPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Performance Label */}
          <div className="mt-6 text-center">
            <div className="text-sm text-gray-500">Performance Label</div>
            <div className={`text-2xl font-bold ${
              performanceLabel === 'Outstanding' ? 'text-green-600' :
              performanceLabel === 'Exceeds Expectations' ? 'text-blue-600' :
              performanceLabel === 'Meets Expectations' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {performanceLabel}
            </div>
          </div>
        </div>
        
        {/* Right column: Score breakdown */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Score Breakdown</h3>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Raw Score</div>
                <div className="text-xl font-semibold">{rawScore.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Normalized Score</div>
                <div className="text-xl font-semibold">{normalizedScore.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Technical (70%)</div>
                <div className="text-xl font-semibold">{technicalScore.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Admin (30%)</div>
                <div className="text-xl font-semibold">{adminScore.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorePreview;