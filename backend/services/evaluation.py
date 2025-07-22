# Evaluation service
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from ..models.evaluation import Evaluation
from ..models.kpi_evaluation import KPIEvaluation
from ..models.kpi_rating import KPIRating
from ..models.user import User
from ..services.evaluation_cycle import EvaluationCycleService
from ..schemas.evaluation import KPIEvaluationCreate, EvaluationStartRequest, EvaluationSubmitRequest

class EvaluationService:
    @staticmethod
    def calculate_raw_score(kpi_evaluations: List[KPIEvaluationCreate]) -> float:
        """
        Calculate raw score as sum of (rating × weight)
        """
        if not kpi_evaluations:
            return 0.0

        return sum(e.rating * e.weightage for e in kpi_evaluations)

    @staticmethod
    def calculate_normalized_score(raw_score: float) -> float:
        """
        Normalize score using the formula: 3.00 + ((raw - 1.00) / 4.00) × 2.00
        """
        return 3.00 + ((raw_score - 1.00) / 4.00) * 2.00

    @staticmethod
    def get_performance_label(normalized_score: float) -> str:
        """
        Return performance label based on normalized score:
        3.50–3.99: "Meets Expectations"
        4.00–4.49: "Exceeds Expectations"
        4.50–5.00: "Outstanding"
        """
        if normalized_score >= 4.50:
            return "Outstanding"
        elif normalized_score >= 4.00:
            return "Exceeds Expectations"
        elif normalized_score >= 3.50:
            return "Meets Expectations"
        else:
            return "Below Expectations"

    @staticmethod
    def calculate_increment_percentage(normalized_score: float) -> float:
        if normalized_score >= 4.50:
            return 22.5  # 20-25%
        elif normalized_score >= 4.00:
            return 17.5  # 15-19.99%
        elif normalized_score >= 3.50:
            return 12.5  # 10-14.99%
        elif normalized_score >= 3.00:
            return 7.5   # 5-9.99%
        else:
            return 2.5   # 0-4.99%

    @staticmethod
    def start_evaluation(db: Session, evaluation_request: EvaluationStartRequest, current_user: User) -> Evaluation:
        """
        Start a new evaluation
        """
        # Get the active evaluation cycle if cycle_id is not provided
        cycle_id = evaluation_request.cycle_id
        if not cycle_id:
            active_cycle = EvaluationCycleService.get_active_cycle(db)
            if active_cycle:
                cycle_id = active_cycle.id
            else:
                raise ValueError("No active evaluation cycle found. Please create and activate a cycle first.")
        
        # Create a new evaluation
        evaluation = Evaluation(
            employee_id=evaluation_request.employee_id,
            manager_id=current_user.id,
            cycle_id=cycle_id,
            period=evaluation_request.period,
            status="draft",
            comments=evaluation_request.comments,
            created_by=current_user.id
        )
        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)
        return evaluation

    @staticmethod
    def save_evaluation_draft(db: Session, evaluation_id: int, evaluation_data: EvaluationSubmitRequest,
                              current_user: User) -> Evaluation:
        """
        Save an evaluation as a draft
        """
        # Get the evaluation
        evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
        if not evaluation:
            raise ValueError(f"Evaluation with ID {evaluation_id} not found")

        # Update the evaluation with the submitted data
        evaluation.comments = evaluation_data.comments
        evaluation.manager_comments = evaluation_data.manager_comments
        evaluation.status = "draft"
        evaluation.updated_at = datetime.utcnow()

        # Use raw SQL update for drafted_by to avoid SQLAlchemy validation issues
        db.execute(
            text("UPDATE evaluations SET drafted_by = :user_id WHERE id = :eval_id"),
            {"user_id": current_user.id, "eval_id": evaluation_id}
        )

        # Use raw SQL update for submitted_by to avoid SQLAlchemy validation issues
        db.execute(
            text("UPDATE evaluations SET submitted_by = NULL WHERE id = :eval_id"),
            {"eval_id": evaluation_id}
        )

        # Delete existing KPI evaluations
        db.query(KPIEvaluation).filter(KPIEvaluation.evaluation_id == evaluation_id).delete()

        # Create new KPI evaluations
        for kpi_eval in evaluation_data.kpi_evaluations:
            # Add KPI evaluation
            db.add(KPIEvaluation(
                evaluation_id=evaluation_id,
                kpi_id=kpi_eval.kpi_id,
                title=kpi_eval.title,
                description=kpi_eval.description,
                category=kpi_eval.category,
                weightage=kpi_eval.weightage,
                rating=kpi_eval.rating,
                comment=kpi_eval.comment
            ))

        # Calculate scores
        raw_score = EvaluationService.calculate_raw_score(evaluation_data.kpi_evaluations)
        normalized_score = EvaluationService.calculate_normalized_score(raw_score)
        performance_label = EvaluationService.get_performance_label(normalized_score)
        increment_percentage = EvaluationService.calculate_increment_percentage(normalized_score)

        # Update evaluation with calculated scores
        evaluation.raw_score = raw_score
        evaluation.normalized_score = normalized_score
        evaluation.performance_label = performance_label
        evaluation.increment_percentage = increment_percentage

        db.commit()
        db.refresh(evaluation)
        return evaluation

    @staticmethod
    def submit_evaluation(db: Session, evaluation_id: int, evaluation_data: EvaluationSubmitRequest, current_user: User) -> Evaluation:
        """
        Submit an evaluation
        """
        # Get the evaluation
        evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
        if not evaluation:
            raise ValueError(f"Evaluation with ID {evaluation_id} not found")

        # Update the evaluation with the submitted data
        evaluation.comments = evaluation_data.comments
        evaluation.manager_comments = evaluation_data.manager_comments
        evaluation.status = "submitted"
        evaluation.submitted_at = datetime.utcnow()
        
        # Use raw SQL update for submitted_by to avoid SQLAlchemy validation issues
        db.execute(
            text("UPDATE evaluations SET submitted_by = :user_id WHERE id = :eval_id"),
            {"user_id": current_user.id, "eval_id": evaluation_id}
        )
        
        # Use raw SQL update for drafted_by to avoid SQLAlchemy validation issues
        db.execute(
            text("UPDATE evaluations SET drafted_by = NULL WHERE id = :eval_id"),
            {"eval_id": evaluation_id}
        )

        # Delete existing KPI evaluations
        db.query(KPIEvaluation).filter(KPIEvaluation.evaluation_id == evaluation_id).delete()

        # Create new KPI evaluations and record ratings in audit log
        for kpi_eval in evaluation_data.kpi_evaluations:
            # Add KPI evaluation
            db.add(KPIEvaluation(
                evaluation_id=evaluation_id,
                kpi_id=kpi_eval.kpi_id,
                title=kpi_eval.title,
                description=kpi_eval.description,
                category=kpi_eval.category,
                weightage=kpi_eval.weightage,
                rating=kpi_eval.rating,
                comment=kpi_eval.comment
            ))

            # Record in audit log (kpi_ratings table)
            db.add(KPIRating(
                evaluation_id=evaluation_id,
                kpi_id=kpi_eval.kpi_id,
                rating=kpi_eval.rating,
                comment=kpi_eval.comment,
                weightage=kpi_eval.weightage
            ))

        # Calculate scores
        raw_score = EvaluationService.calculate_raw_score(evaluation_data.kpi_evaluations)
        normalized_score = EvaluationService.calculate_normalized_score(raw_score)
        performance_label = EvaluationService.get_performance_label(normalized_score)
        increment_percentage = EvaluationService.calculate_increment_percentage(normalized_score)

        # Update evaluation with calculated scores
        evaluation.raw_score = raw_score
        evaluation.normalized_score = normalized_score
        evaluation.performance_label = performance_label
        evaluation.increment_percentage = increment_percentage

        db.commit()
        db.refresh(evaluation)
        return evaluation

    @staticmethod
    def get_evaluation_permissions(evaluation: Evaluation, current_user: User) -> dict:
        """
        Get permissions for the current user on the given evaluation
        """
        permissions = {
            "can_view_increment_percentage": False,
            "can_view_admin_comments": False,
            "can_edit": False,
            "can_approve": False
        }

        # Admin can do everything
        if current_user.role.name == "Admin":
            permissions["can_view_increment_percentage"] = True
            permissions["can_view_admin_comments"] = True
            permissions["can_edit"] = True
            permissions["can_approve"] = True
        # Manager can view increment percentage and edit if they are the manager
        elif current_user.role.name == "Manager":
            permissions["can_view_increment_percentage"] = True
            if evaluation.manager_id == current_user.id:
                permissions["can_edit"] = True
                permissions["can_approve"] = True
        # Employee can only view their own evaluations
        elif current_user.id == evaluation.employee_id:
            permissions["can_edit"] = evaluation.status == "draft"

        return permissions