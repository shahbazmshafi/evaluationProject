# Evaluation cycle service
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, not_
from datetime import datetime

from ..models.evaluation_cycle import EvaluationCycle
from ..models.evaluation import Evaluation
from ..models.user import User
from ..schemas.evaluation_cycle import EvaluationCycleCreate, EvaluationCycleUpdate

class EvaluationCycleService:
    @staticmethod
    def get_active_cycle(db: Session) -> Optional[EvaluationCycle]:
        """
        Get the currently active evaluation cycle
        """
        # Get the active cycle (there should be only one)
        active_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.status == "active").first()
        return active_cycle
    
    @staticmethod
    def create_cycle(db: Session, cycle_data: EvaluationCycleCreate, current_user: User) -> EvaluationCycle:
        """
        Create a new evaluation cycle
        """
        # Create a new evaluation cycle
        cycle = EvaluationCycle(
            name=cycle_data.name,
            evaluation_start_date=cycle_data.evaluation_start_date,
            evaluation_end_date=cycle_data.evaluation_end_date,
            execution_start_date=cycle_data.execution_start_date,
            execution_end_date=cycle_data.execution_end_date,
            status="draft",
            created_by=current_user.id
        )
        db.add(cycle)
        db.commit()
        db.refresh(cycle)
        return cycle
    
    @staticmethod
    def update_cycle(db: Session, cycle_id: int, cycle_data: EvaluationCycleUpdate) -> EvaluationCycle:
        """
        Update an existing evaluation cycle
        """
        # Get the cycle
        cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
        if not cycle:
            raise ValueError(f"Evaluation cycle with ID {cycle_id} not found")
        
        # Update the cycle with the provided data
        if cycle_data.name is not None:
            cycle.name = cycle_data.name
        if cycle_data.evaluation_start_date is not None:
            cycle.evaluation_start_date = cycle_data.evaluation_start_date
        if cycle_data.evaluation_end_date is not None:
            cycle.evaluation_end_date = cycle_data.evaluation_end_date
        if cycle_data.execution_start_date is not None:
            cycle.execution_start_date = cycle_data.execution_start_date
        if cycle_data.execution_end_date is not None:
            cycle.execution_end_date = cycle_data.execution_end_date
        if cycle_data.status is not None:
            cycle.status = cycle_data.status
        
        db.commit()
        db.refresh(cycle)
        return cycle
    
    @staticmethod
    def delete_cycle(db: Session, cycle_id: int) -> bool:
        """
        Delete an evaluation cycle
        """
        # Get the cycle
        cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
        if not cycle:
            raise ValueError(f"Evaluation cycle with ID {cycle_id} not found")
        
        # Check if there are any evaluations associated with this cycle
        evaluations_count = db.query(Evaluation).filter(Evaluation.cycle_id == cycle_id).count()
        if evaluations_count > 0:
            raise ValueError(f"Cannot delete cycle with ID {cycle_id} because it has {evaluations_count} evaluations associated with it")
        
        # Delete the cycle
        db.delete(cycle)
        db.commit()
        return True
    
    @staticmethod
    def get_cycle_statistics(db: Session, cycle_id: int) -> Dict[str, Any]:
        """
        Get statistics for an evaluation cycle
        """
        # Get the cycle
        cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
        if not cycle:
            raise ValueError(f"Evaluation cycle with ID {cycle_id} not found")
        
        # Get the total number of evaluations in this cycle
        total_evaluations = db.query(Evaluation).filter(Evaluation.cycle_id == cycle_id).count()
        
        # Get the number of completed evaluations (status = approved)
        completed_evaluations = db.query(Evaluation).filter(
            Evaluation.cycle_id == cycle_id,
            Evaluation.status == "approved"
        ).count()
        
        # Calculate progress percentage
        progress_percentage = 0
        if total_evaluations > 0:
            progress_percentage = (completed_evaluations / total_evaluations) * 100
        
        return {
            "total_evaluations": total_evaluations,
            "completed_evaluations": completed_evaluations,
            "progress_percentage": progress_percentage
        }
    
    @staticmethod
    def generate_evaluations_for_cycle(db: Session, cycle_id: int, current_user: User) -> List[Evaluation]:
        """
        Generate evaluations for all eligible employees in a cycle
        """
        # Get the cycle
        cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
        if not cycle:
            raise ValueError(f"Evaluation cycle with ID {cycle_id} not found")
        
        # Get all active users except those with Admin role
        employees = db.query(User).join(User.role).filter(
            User.is_active == True,
            not_(User.role.has(name="Admin"))
        ).all()
        
        # Create evaluations for each employee
        evaluations = []
        for employee in employees:
            # Skip users without a manager assigned
            if employee.manager_id is None:
                continue
                
            # Check if an evaluation already exists for this employee in this cycle
            existing_evaluation = db.query(Evaluation).filter(
                Evaluation.employee_id == employee.id,
                Evaluation.cycle_id == cycle_id
            ).first()
            
            if not existing_evaluation:
                # Create a new evaluation
                evaluation = Evaluation(
                    employee_id=employee.id,
                    manager_id=employee.manager_id,
                    cycle_id=cycle_id,
                    period=f"{cycle.evaluation_start_date.strftime('%b %Y')} - {cycle.evaluation_end_date.strftime('%b %Y')}",
                    status="pending",
                    created_by=current_user.id
                )
                db.add(evaluation)
                evaluations.append(evaluation)
        
        db.commit()
        
        # Refresh all evaluations
        for evaluation in evaluations:
            db.refresh(evaluation)
        
        return evaluations
    
    @staticmethod
    def activate_cycle(db: Session, cycle_id: int, current_user: User) -> EvaluationCycle:
        """
        Activate an evaluation cycle and generate evaluations for all eligible employees
        """
        # Get the cycle
        cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
        if not cycle:
            raise ValueError(f"Evaluation cycle with ID {cycle_id} not found")
        
        # Check if the cycle is in draft status
        if cycle.status != "draft":
            raise ValueError(f"Evaluation cycle with ID {cycle_id} is not in draft status")
        
        # Generate evaluations for all eligible employees
        EvaluationCycleService.generate_evaluations_for_cycle(db, cycle_id, current_user)
        
        # Update the cycle status to active
        cycle.status = "active"
        db.commit()
        db.refresh(cycle)
        
        return cycle