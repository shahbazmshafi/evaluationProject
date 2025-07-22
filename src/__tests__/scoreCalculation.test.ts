import { apiService } from '../services/api';
import { KPIRating } from '../types';

describe('Score Calculation', () => {
  // Test data
  const technicalRatings: KPIRating[] = [
    { kpiId: '1', rating: 4, weightage: 15, comment: 'Good' },
    { kpiId: '2', rating: 5, weightage: 20, comment: 'Excellent' },
    { kpiId: '3', rating: 4, weightage: 10, comment: 'Good' },
    { kpiId: '4', rating: 3, weightage: 15, comment: 'Average' },
    { kpiId: '5', rating: 4, weightage: 10, comment: 'Good' },
  ];

  const adminRatings: KPIRating[] = [
    { kpiId: '6', rating: 5, weightage: 10, comment: 'Excellent' },
    { kpiId: '7', rating: 4, weightage: 10, comment: 'Good' },
    { kpiId: '8', rating: 5, weightage: 10, comment: 'Excellent' },
  ];

  const allRatings = [...technicalRatings, ...adminRatings];

  test('calculateTechnicalScore returns correct score for technical KPIs', () => {
    const technicalScore = apiService.calculateTechnicalScore(allRatings);
    // (4*15 + 5*20 + 4*10 + 3*15 + 4*10) / 70 = 4.0
    expect(technicalScore).toBeCloseTo(4.0, 1);
  });

  test('calculateAdminScore returns correct score for admin KPIs', () => {
    const adminScore = apiService.calculateAdminScore(allRatings);
    // (5*10 + 4*10 + 5*10) / 30 = 4.67
    expect(adminScore).toBeCloseTo(4.67, 1);
  });

  test('calculateOverallScore applies 70/30 split correctly', () => {
    const technicalScore = 4.0;
    const adminScore = 4.67;
    const overallScore = apiService.calculateOverallScore(technicalScore, adminScore);
    // (4.0*0.7 + 4.67*0.3) = 4.2
    expect(overallScore).toBeCloseTo(4.2, 1);
  });

  test('calculateNormalizedScore normalizes the score correctly', () => {
    const technicalScore = 4.0;
    const adminScore = 4.67;
    const normalizedScore = apiService.calculateNormalizedScore(allRatings, technicalScore, adminScore);
    // Should be normalized to the 3-5 scale
    expect(normalizedScore).toBeGreaterThanOrEqual(3.0);
    expect(normalizedScore).toBeLessThanOrEqual(5.0);
  });

  test('calculateIncrementPercentage returns correct increment for score ranges', () => {
    expect(apiService.calculateIncrementPercentage(4.6)).toBe(22.5); // 20-25%
    expect(apiService.calculateIncrementPercentage(4.2)).toBe(17.5); // 15-19.99%
    expect(apiService.calculateIncrementPercentage(3.7)).toBe(12.5); // 10-14.99%
    expect(apiService.calculateIncrementPercentage(3.2)).toBe(7.5);  // 5-9.99%
    expect(apiService.calculateIncrementPercentage(2.8)).toBe(2.5);  // 0-4.99%
  });

  test('Empty ratings should return 0 scores', () => {
    const emptyRatings: KPIRating[] = [];
    expect(apiService.calculateTechnicalScore(emptyRatings)).toBe(0);
    expect(apiService.calculateAdminScore(emptyRatings)).toBe(0);
    expect(apiService.calculateNormalizedScore(emptyRatings, 0, 0)).toBe(0);
  });

  test('70/30 split is correctly applied for overall score', () => {
    // Test with different technical and admin scores
    const testCases = [
      { tech: 5.0, admin: 1.0, expected: 3.8 }, // (5.0*0.7 + 1.0*0.3) = 3.8
      { tech: 1.0, admin: 5.0, expected: 2.2 }, // (1.0*0.7 + 5.0*0.3) = 2.2
      { tech: 3.0, admin: 3.0, expected: 3.0 }, // (3.0*0.7 + 3.0*0.3) = 3.0
    ];

    testCases.forEach(({ tech, admin, expected }) => {
      const result = apiService.calculateOverallScore(tech, admin);
      expect(result).toBeCloseTo(expected, 1);
    });
  });
});