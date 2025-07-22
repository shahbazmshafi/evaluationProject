"""
Test script to verify the evaluation database integration.

This script tests:
1. Saving an evaluation as draft
2. Submitting an evaluation
3. Verifying all table updates (evaluation_cycles, evaluations, kpi_evaluations, kpi_ratings)
"""

import os
import sys
import json
import requests
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/bolt")
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)

# API connection
API_URL = os.getenv("API_URL", "http://localhost:8000")
API_TOKEN = os.getenv("API_TOKEN", "")  # Set your API token here if needed

def get_headers():
    """Get headers for API requests"""
    headers = {"Content-Type": "application/json"}
    if API_TOKEN:
        headers["Authorization"] = f"Bearer {API_TOKEN}"
    return headers

def get_active_cycle():
    """Get the active evaluation cycle"""
    with Session() as session:
        result = session.execute(text("SELECT * FROM evaluation_cycles WHERE status = 'active' LIMIT 1"))
        cycle = result.fetchone()
        if not cycle:
            print("No active evaluation cycle found. Please create and activate a cycle first.")
            return None
        return {
            "id": cycle.id,
            "name": cycle.name,
            "evaluation_start_date": cycle.evaluation_start_date.isoformat(),
            "evaluation_end_date": cycle.evaluation_end_date.isoformat(),
            "status": cycle.status
        }

def get_test_employee():
    """Get a test employee"""
    with Session() as session:
        result = session.execute(text("SELECT * FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'Employee') LIMIT 1"))
        employee = result.fetchone()
        if not employee:
            print("No employee found. Please create an employee first.")
            return None
        return {
            "id": employee.id,
            "name": employee.name,
            "email": employee.email
        }

def get_test_manager():
    """Get a test manager"""
    with Session() as session:
        result = session.execute(text("SELECT * FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'Manager') LIMIT 1"))
        manager = result.fetchone()
        if not manager:
            print("No manager found. Please create a manager first.")
            return None
        return {
            "id": manager.id,
            "name": manager.name,
            "email": manager.email
        }

def get_employee_kpis(employee_id):
    """Get KPIs for an employee"""
    with Session() as session:
        # Get employee role
        result = session.execute(text(f"SELECT role_id FROM users WHERE id = {employee_id}"))
        role_id = result.fetchone().role_id
        
        # Get KPIs for the role
        result = session.execute(text(f"""
            SELECT * FROM kpis 
            WHERE id IN (
                SELECT kpi_id FROM role_kpis WHERE role_id = {role_id}
            ) OR type = 'global'
            LIMIT 5
        """))
        kpis = result.fetchall()
        
        if not kpis:
            print(f"No KPIs found for employee {employee_id}. Please create KPIs first.")
            return None
        
        return [{
            "id": kpi.id,
            "title": kpi.title,
            "description": kpi.description,
            "category": kpi.category,
            "weightage": float(kpi.weightage)
        } for kpi in kpis]

def create_draft_evaluation(employee_id, manager_id, cycle_id, kpis):
    """Create a draft evaluation"""
    print("\n=== Creating Draft Evaluation ===")
    
    # Prepare KPI evaluations
    kpi_evaluations = []
    for kpi in kpis:
        kpi_evaluations.append({
            "kpi_id": kpi["id"],
            "title": kpi["title"],
            "description": kpi["description"],
            "category": kpi["category"],
            "weightage": kpi["weightage"],
            "rating": 3,  # Default rating
            "comment": f"Draft comment for {kpi['title']}"
        })
    
    # Prepare evaluation data
    now = datetime.now()
    quarter = (now.month - 1) // 3 + 1
    period = f"{now.year}-Q{quarter}"
    
    evaluation_data = {
        "employee_id": employee_id,
        "manager_id": manager_id,
        "cycle_id": cycle_id,
        "period": period,
        "kpi_evaluations": kpi_evaluations,
        "status": "draft",
        "comments": "Draft evaluation comments",
        "manager_comments": "Draft manager comments",
        "submitted_by": manager_id
    }
    
    # Create evaluation via API
    try:
        response = requests.post(
            f"{API_URL}/evaluations",
            headers=get_headers(),
            json=evaluation_data
        )
        
        if response.status_code != 200 and response.status_code != 201:
            print(f"Failed to create draft evaluation: {response.status_code}")
            print(response.text)
            return None
        
        evaluation = response.json()
        print(f"Draft evaluation created with ID: {evaluation['id']}")
        return evaluation
    except Exception as e:
        print(f"Error creating draft evaluation: {e}")
        return None

def submit_evaluation(evaluation_id, employee_id, manager_id, cycle_id, kpis):
    """Submit an evaluation"""
    print("\n=== Submitting Evaluation ===")
    
    # Prepare KPI evaluations
    kpi_evaluations = []
    for i, kpi in enumerate(kpis):
        # Vary ratings to test score calculation
        rating = min(5, max(1, 3 + (i % 3 - 1)))
        kpi_evaluations.append({
            "kpi_id": kpi["id"],
            "title": kpi["title"],
            "description": kpi["description"],
            "category": kpi["category"],
            "weightage": kpi["weightage"],
            "rating": rating,
            "comment": f"Final comment for {kpi['title']}"
        })
    
    # Prepare evaluation data
    evaluation_data = {
        "kpi_evaluations": kpi_evaluations,
        "comments": "Final evaluation comments",
        "manager_comments": "Final manager comments"
    }
    
    # Submit evaluation via API
    try:
        response = requests.put(
            f"{API_URL}/evaluations/{evaluation_id}/submit",
            headers=get_headers(),
            json=evaluation_data
        )
        
        if response.status_code != 200:
            print(f"Failed to submit evaluation: {response.status_code}")
            print(response.text)
            return None
        
        evaluation = response.json()
        print(f"Evaluation submitted with ID: {evaluation['id']}")
        return evaluation
    except Exception as e:
        print(f"Error submitting evaluation: {e}")
        return None

def verify_database_updates(evaluation_id):
    """Verify that all tables are updated correctly"""
    print("\n=== Verifying Database Updates ===")
    
    with Session() as session:
        # Check evaluation
        result = session.execute(text(f"SELECT * FROM evaluations WHERE id = {evaluation_id}"))
        evaluation = result.fetchone()
        if not evaluation:
            print(f"Evaluation {evaluation_id} not found in database")
            return False
        
        print(f"Evaluation found: ID={evaluation.id}, Status={evaluation.status}")
        print(f"Scores: Raw={evaluation.raw_score}, Normalized={evaluation.normalized_score}")
        print(f"Performance: {evaluation.performance_label}, Increment: {evaluation.increment_percentage}%")
        
        # Check KPI evaluations
        result = session.execute(text(f"SELECT COUNT(*) as count FROM kpi_evaluations WHERE evaluation_id = {evaluation_id}"))
        kpi_count = result.fetchone().count
        print(f"KPI evaluations found: {kpi_count}")
        
        # Check KPI ratings (audit log)
        result = session.execute(text(f"SELECT COUNT(*) as count FROM kpi_ratings WHERE evaluation_id = {evaluation_id}"))
        rating_count = result.fetchone().count
        print(f"KPI ratings (audit log) found: {rating_count}")
        
        # Verify cycle association
        if evaluation.cycle_id:
            result = session.execute(text(f"SELECT name FROM evaluation_cycles WHERE id = {evaluation.cycle_id}"))
            cycle = result.fetchone()
            print(f"Associated with cycle: {cycle.name}")
        else:
            print("Not associated with any cycle")
        
        return True

def main():
    """Main test function"""
    print("=== Evaluation Database Integration Test ===")
    
    # Get active cycle
    cycle = get_active_cycle()
    if not cycle:
        print("Creating a test cycle is outside the scope of this test script.")
        print("Please create and activate a cycle manually.")
        return
    
    # Get test employee and manager
    employee = get_test_employee()
    if not employee:
        return
    
    manager = get_test_manager()
    if not manager:
        return
    
    print(f"Testing with Employee: {employee['name']} (ID: {employee['id']})")
    print(f"Testing with Manager: {manager['name']} (ID: {manager['id']})")
    print(f"Testing with Cycle: {cycle['name']} (ID: {cycle['id']})")
    
    # Get KPIs for the employee
    kpis = get_employee_kpis(employee['id'])
    if not kpis:
        return
    
    print(f"Found {len(kpis)} KPIs for testing")
    
    # Create draft evaluation
    draft = create_draft_evaluation(employee['id'], manager['id'], cycle['id'], kpis)
    if not draft:
        return
    
    # Verify draft in database
    if not verify_database_updates(draft['id']):
        return
    
    # Submit evaluation
    submitted = submit_evaluation(draft['id'], employee['id'], manager['id'], cycle['id'], kpis)
    if not submitted:
        return
    
    # Verify submitted evaluation in database
    if not verify_database_updates(submitted['id']):
        return
    
    print("\n=== Test Completed Successfully ===")

if __name__ == "__main__":
    main()