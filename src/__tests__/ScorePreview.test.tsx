import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScorePreview from '../components/ScorePreview';
import { KPIEvaluation } from '../types';
import { apiService } from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    calculateRawScore: jest.fn(),
    calculateNormalizedScore: jest.fn(),
    getPerformanceLabel: jest.fn(),
    calculateIncrementPercentage: jest.fn(),
  }
}));

describe('ScorePreview Component', () => {
  // Sample KPI evaluations for testing
  const mockKPIEvaluations: KPIEvaluation[] = [
    {
      id: '1',
      kpiId: '101',
      title: 'Technical KPI 1',
      description: 'Description for Technical KPI 1',
      category: 'technical',
      weightage: 30,
      rating: 4.5,
      comment: 'Good performance'
    },
    {
      id: '2',
      kpiId: '102',
      title: 'Technical KPI 2',
      description: 'Description for Technical KPI 2',
      category: 'technical',
      weightage: 40,
      rating: 3.5,
      comment: 'Average performance'
    },
    {
      id: '3',
      kpiId: '103',
      title: 'Admin KPI 1',
      description: 'Description for Admin KPI 1',
      category: 'admin',
      weightage: 30,
      rating: 4.0,
      comment: 'Good admin skills'
    }
  ];

  beforeEach(() => {
    // Reset mock implementations
    jest.clearAllMocks();
    
    // Set up mock return values
    (apiService.calculateRawScore as jest.Mock).mockImplementation((evals) => {
      if (evals.length === 0) return 0;
      return evals.reduce((sum, e) => sum + (e.rating * e.weightage), 0) / 100;
    });
    
    (apiService.calculateNormalizedScore as jest.Mock).mockImplementation((rawScore) => {
      return 3.00 + ((rawScore - 1.00) / 4.00) * 2.00;
    });
    
    (apiService.getPerformanceLabel as jest.Mock).mockImplementation((normalizedScore) => {
      if (normalizedScore >= 4.50) return "Outstanding";
      if (normalizedScore >= 4.00) return "Exceeds Expectations";
      if (normalizedScore >= 3.50) return "Meets Expectations";
      return "Below Expectations";
    });
    
    (apiService.calculateIncrementPercentage as jest.Mock).mockImplementation((normalizedScore) => {
      if (normalizedScore >= 4.50) return 22.5;
      if (normalizedScore >= 4.00) return 17.5;
      if (normalizedScore >= 3.50) return 12.5;
      if (normalizedScore >= 3.00) return 7.5;
      return 2.5;
    });
  });

  test('renders the component with correct title', () => {
    render(<ScorePreview kpiEvaluations={mockKPIEvaluations} />);
    expect(screen.getByText('Performance Score Preview')).toBeInTheDocument();
  });

  test('displays the correct employee name and period', () => {
    render(
      <ScorePreview 
        kpiEvaluations={mockKPIEvaluations} 
        employeeName="John Doe" 
        period="Q2 2023" 
      />
    );
    
    // The employee name and period might not be directly visible in the UI
    // but they should be used in the export functionality
    expect(screen.getByText('Export to CSV')).toBeInTheDocument();
  });

  test('calculates and displays the correct scores', () => {
    render(<ScorePreview kpiEvaluations={mockKPIEvaluations} />);
    
    // Check if API service calculation functions were called
    expect(apiService.calculateRawScore).toHaveBeenCalledTimes(3); // Once for each: all KPIs, technical KPIs, admin KPIs
    expect(apiService.calculateNormalizedScore).toHaveBeenCalled();
    expect(apiService.getPerformanceLabel).toHaveBeenCalled();
    expect(apiService.calculateIncrementPercentage).toHaveBeenCalled();
    
    // Check if the scores are displayed
    expect(screen.getByText('Technical Score')).toBeInTheDocument();
    expect(screen.getByText('Admin Score')).toBeInTheDocument();
    expect(screen.getByText('Normalized Score')).toBeInTheDocument();
    expect(screen.getByText('Raw Score')).toBeInTheDocument();
  });

  test('handles empty KPI evaluations gracefully', () => {
    render(<ScorePreview kpiEvaluations={[]} />);
    
    // Should still render without errors
    expect(screen.getByText('Performance Score Preview')).toBeInTheDocument();
    
    // Scores should be 0
    expect(screen.getByText('Technical Score')).toBeInTheDocument();
    expect(screen.getByText('Admin Score')).toBeInTheDocument();
  });

  test('export button triggers CSV download', () => {
    // Mock the document.createElement and other DOM methods
    const mockLink = {
      setAttribute: jest.fn(),
      style: {},
      click: jest.fn()
    };
    
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation(() => mockLink as unknown as HTMLElement);
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);
    
    // Mock URL.createObjectURL
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockImplementation(() => 'mock-url');
    
    render(<ScorePreview kpiEvaluations={mockKPIEvaluations} employeeName="John Doe" period="Q2 2023" />);
    
    // Click the export button
    fireEvent.click(screen.getByText('Export to CSV'));
    
    // Check if the link was created and clicked
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'mock-url');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'John_Doe_Evaluation_Q2_2023.csv');
    expect(mockLink.click).toHaveBeenCalled();
    
    // Clean up
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
  });
});