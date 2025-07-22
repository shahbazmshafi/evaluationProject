# KPI update service
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy import or_

from models.kpi import KPI
from models.user import User
from schemas.kpi import KPIUpdate
from services.kpi import KPIService

class KPIUpdateService:
    @staticmethod
    def update_kpi(db: Session, kpi_id: int, kpi_data: KPIUpdate, current_user: User) -> KPI:
        """
        Update an existing KPI with weightage validation

        Validation rules:
        - Total KPI weightage for an employee cannot exceed 100%
        - Detailed validation feedback is provided when limits would be exceeded
        - Only the creator, the manager, or an admin can update a KPI
        """
        # Get the KPI
        kpi = db.query(KPI).filter(KPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"KPI with ID {kpi_id} not found")

        # Check if user is authorized to update this KPI
        is_admin = current_user.role.name.lower() == "admin"
        if kpi.created_by != current_user.id and kpi.manager_id != current_user.id and not is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this KPI")

        # Validate KPI type
        if kpi_data.type not in ["global", "role-based", "employee-specific"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid KPI type")

        # Validate target based on type
        if kpi_data.type == "role-based" and not kpi_data.target_role_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role-based KPI requires target_role_id")
        if kpi_data.type == "employee-specific" and not kpi_data.target_employee_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee-specific KPI requires target_employee_id")

        # Calculate the weightage difference
        weightage_diff = kpi_data.weightage - kpi.weightage

        # If weightage is not changing, no need for validation
        if weightage_diff == 0:
            # Update the KPI
            for key, value in kpi_data.dict(exclude_unset=True).items():
                setattr(kpi, key, value)

            db.commit()
            db.refresh(kpi)
            return kpi

        # Perform weightage validation based on KPI type
        if kpi_data.type == "global":
            # For global KPIs, check all employees who would be affected
            if is_admin:
                # Admin global KPIs affect all employees
                all_employees = db.query(User).filter(User.is_active == True).all()
            else:
                # Manager global KPIs affect only their team members
                all_employees = db.query(User).filter(User.manager_id == current_user.id, User.is_active == True).all()

            # Check each affected employee
            for employee in all_employees:
                employee_weightage = KPIService.get_total_kpi_weightage(db, employee.id)
                if employee_weightage["total_weightage"] + weightage_diff > 100:
                    # Provide detailed error message with KPI breakdown
                    kpi_breakdown = "\n".join([
                        f"- {kpi_info['title']} ({kpi_info['weightage']}%, created by {kpi_info['creator_name']})"
                        for kpi_info in employee_weightage["kpis"]
                    ])

                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Updating this KPI would exceed the 100% limit for employee {employee.name}.\n"
                            f"Current total: {employee_weightage['total_weightage']}%\n"
                            f"New KPI weightage: {kpi_data.weightage}% (change of {weightage_diff}%)\n"
                            f"Would exceed by: {employee_weightage['total_weightage'] + weightage_diff - 100}%\n\n"
                            f"Current KPIs:\n{kpi_breakdown}"
                        )
                    )

        elif kpi_data.type == "role-based":
            # For role-based KPIs, check all employees with this role
            employees_with_role = db.query(User).filter(
                User.role_id == kpi_data.target_role_id,
                User.is_active == True
            ).all()

            if not employees_with_role:
                # No validation needed if no employees have this role
                pass
            else:
                # Check each affected employee
                for employee in employees_with_role:
                    employee_weightage = KPIService.get_total_kpi_weightage(db, employee.id)
                    if employee_weightage["total_weightage"] + weightage_diff > 100:
                        # Provide detailed error message with KPI breakdown
                        kpi_breakdown = "\n".join([
                            f"- {kpi_info['title']} ({kpi_info['weightage']}%, created by {kpi_info['creator_name']})"
                            for kpi_info in employee_weightage["kpis"]
                        ])

                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=(
                                f"Updating this KPI would exceed the 100% limit for employee {employee.name}.\n"
                                f"Current total: {employee_weightage['total_weightage']}%\n"
                                f"New KPI weightage: {kpi_data.weightage}% (change of {weightage_diff}%)\n"
                                f"Would exceed by: {employee_weightage['total_weightage'] + weightage_diff - 100}%\n\n"
                                f"Current KPIs:\n{kpi_breakdown}"
                            )
                        )

        elif kpi_data.type == "employee-specific":
            # For employee-specific KPIs, check only the target employee
            employee_weightage = KPIService.get_total_kpi_weightage(db, kpi_data.target_employee_id)
            if employee_weightage["total_weightage"] + weightage_diff > 100:
                # Provide detailed error message with KPI breakdown
                kpi_breakdown = "\n".join([
                    f"- {kpi_info['title']} ({kpi_info['weightage']}%, created by {kpi_info['creator_name']})"
                    for kpi_info in employee_weightage["kpis"]
                ])

                # Get employee name
                employee = db.query(User).filter(User.id == kpi_data.target_employee_id).first()
                employee_name = employee.name if employee else "Unknown"

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Updating this KPI would exceed the 100% limit for employee {employee_name}.\n"
                        f"Current total: {employee_weightage['total_weightage']}%\n"
                        f"New KPI weightage: {kpi_data.weightage}% (change of {weightage_diff}%)\n"
                        f"Would exceed by: {employee_weightage['total_weightage'] + weightage_diff - 100}%\n\n"
                        f"Current KPIs:\n{kpi_breakdown}"
                    )
                )

        # Update the KPI
        for key, value in kpi_data.dict(exclude_unset=True).items():
            setattr(kpi, key, value)

        db.commit()
        db.refresh(kpi)
        return kpi
