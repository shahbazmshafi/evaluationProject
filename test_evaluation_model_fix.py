# Unit test for the Evaluation model fix
import sys
import os
import unittest
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the Evaluation model
from backend.models.evaluation import Evaluation

class TestEvaluationModel(unittest.TestCase):
    def test_evaluation_constructor_with_submitted_by(self):
        """Test that the Evaluation constructor accepts submitted_by parameter"""
        try:
            # Create an evaluation with submitted_by parameter
            evaluation = Evaluation(
                employee_id=1,
                manager_id=2,
                cycle_id=1,
                period="2025-Q3",
                raw_score=3.5,
                normalized_score=0.7,
                performance_label="Good",
                increment_percentage=5.0,
                status="submitted",
                comments="Test comments",
                manager_comments="Test manager comments",
                admin_comments="Test admin comments",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=2,
                submitted_by=2  # This is the parameter we're testing
            )
            
            # Check that submitted_by was set correctly
            self.assertEqual(evaluation.submitted_by, 2)
            print("✅ Test passed: Evaluation constructor accepts submitted_by parameter")
            
        except TypeError as e:
            self.fail(f"Evaluation constructor raised TypeError: {str(e)}")
            
    def test_evaluation_constructor_without_submitted_by(self):
        """Test that the Evaluation constructor works without submitted_by parameter"""
        try:
            # Create an evaluation without submitted_by parameter
            evaluation = Evaluation(
                employee_id=1,
                manager_id=2,
                cycle_id=1,
                period="2025-Q3",
                raw_score=3.5,
                normalized_score=0.7,
                performance_label="Good",
                increment_percentage=5.0,
                status="draft",
                comments="Test comments",
                manager_comments="Test manager comments",
                admin_comments="Test admin comments",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=2
                # No submitted_by parameter
            )
            
            # Check that submitted_by is None
            self.assertIsNone(evaluation.submitted_by)
            print("✅ Test passed: Evaluation constructor works without submitted_by parameter")
            
        except TypeError as e:
            self.fail(f"Evaluation constructor raised TypeError: {str(e)}")

if __name__ == "__main__":
    unittest.main()