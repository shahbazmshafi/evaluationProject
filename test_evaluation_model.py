"""
Simple test script to verify the EvaluationCreate model directly.

This script tests:
1. Creating an EvaluationCreate object with manager_id
2. Verifying that the manager_id field is accessible
"""

import sys
import os

# Add the backend directory to the path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

# Import the EvaluationCreate model from main.py
from main import EvaluationCreate, KPIEvaluationCreate

def test_evaluation_create_with_manager_id():
    """Test creating an EvaluationCreate object with manager_id"""
    print("\n=== Testing EvaluationCreate with manager_id ===")
    
    # Create a KPIEvaluationCreate object for testing
    kpi_eval = KPIEvaluationCreate(
        kpi_id=1,
        title="Test KPI",
        description="Test description",
        category="technical",
        weightage=10.0,
        rating=3
    )
    
    # Create an EvaluationCreate object with manager_id
    evaluation = EvaluationCreate(
        employee_id=1,
        manager_id=2,
        period="2025-Q3",
        kpi_evaluations=[kpi_eval],
        status="draft",
        comments="Test comments",
        manager_comments="Test manager comments",
        admin_comments="Test admin comments",
        submitted_by=2
    )
    
    # Verify that the manager_id field is accessible
    try:
        manager_id = evaluation.manager_id
        print(f"Successfully accessed manager_id: {manager_id}")
        assert manager_id == 2, f"Expected manager_id to be 2, got {manager_id}"
        print("Test PASSED: manager_id has the expected value")
        return True
    except AttributeError as e:
        print(f"Failed to access manager_id: {e}")
        print("Test FAILED: manager_id is not accessible")
        return False

def test_evaluation_create_without_manager_id():
    """Test creating an EvaluationCreate object without manager_id"""
    print("\n=== Testing EvaluationCreate without manager_id ===")
    
    # Create a KPIEvaluationCreate object for testing
    kpi_eval = KPIEvaluationCreate(
        kpi_id=1,
        title="Test KPI",
        description="Test description",
        category="technical",
        weightage=10.0,
        rating=3
    )
    
    # Create an EvaluationCreate object without manager_id
    evaluation = EvaluationCreate(
        employee_id=1,
        period="2025-Q3",
        kpi_evaluations=[kpi_eval],
        status="draft",
        comments="Test comments",
        manager_comments="Test manager comments",
        admin_comments="Test admin comments",
        submitted_by=2
    )
    
    # Verify that the manager_id field is accessible and has the default value
    try:
        manager_id = evaluation.manager_id
        print(f"Successfully accessed manager_id: {manager_id}")
        assert manager_id is None, f"Expected manager_id to be None, got {manager_id}"
        print("Test PASSED: manager_id has the expected default value (None)")
        return True
    except AttributeError as e:
        print(f"Failed to access manager_id: {e}")
        print("Test FAILED: manager_id is not accessible")
        return False

def main():
    """Main function to run all tests"""
    print("=== Starting EvaluationCreate Model Tests ===")
    
    # Run tests
    with_manager_id_test = test_evaluation_create_with_manager_id()
    without_manager_id_test = test_evaluation_create_without_manager_id()
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"EvaluationCreate with manager_id: {'PASS' if with_manager_id_test else 'FAIL'}")
    print(f"EvaluationCreate without manager_id: {'PASS' if without_manager_id_test else 'FAIL'}")
    
    # Overall result
    if with_manager_id_test and without_manager_id_test:
        print("\nAll tests PASSED!")
        return 0
    else:
        print("\nSome tests FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())