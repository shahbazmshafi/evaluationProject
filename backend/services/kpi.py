# KPI service
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy import or_, func, and_

from models.kpi import KPI
from models.user import User
from schemas.kpi import KPICreate, KPIUpdate

class KPIService:
    @staticmethod
    def get_kpis(db: Session, skip: int = 0, limit: int = 100) -> list[KPI]:
        """
        Get all KPIs
        """
        return db.query(KPI).offset(skip).limit(limit).all()

    @staticmethod
    def get_managed_kpis(db: Session, current_user: User, status: str = None, type: str = None, sort_by: str = None) -> list[KPI]:
        """
        Get KPIs managed by the current user
        """
        query = db.query(KPI).filter(KPI.manager_id == current_user.id)

        # Apply filters
        if status:
            query = query.filter(KPI.status == status)
        if type:
            query = query.filter(KPI.type == type)

        # Apply sorting
        if sort_by:
            if sort_by == "title":
                query = query.order_by(KPI.title)
            elif sort_by == "weightage":
                query = query.order_by(KPI.weightage)
            elif sort_by == "created_at":
                query = query.order_by(KPI.created_at)

        return query.all()

    @staticmethod
    def get_employee_kpis(db: Session, employee_id: int, current_user: User) -> list[KPI]:
        """
        Get KPIs for a specific employee
        """
        # Get the employee
        employee = db.query(User).filter(User.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee with ID {employee_id} not found")

        # Check if current user has role_id=1
        is_role_id_1 = current_user.role_id == 1

        # Get KPIs for the employee
        query = db.query(KPI).filter(
            or_(
                KPI.type == "global",
                (KPI.type == "role-based" and KPI.target_role_id == employee.role_id),
                (KPI.type == "employee-specific" and KPI.target_employee_id == employee_id)
            )
        )

        # Only filter by active status if user doesn't have role_id=1
        if not is_role_id_1:
            query = query.filter(KPI.status == "active")

        return query.all()

    @staticmethod
    def get_admin_kpi_weightage(db: Session, employee_id: int = None, role_id: int = None) -> float:
        """
        Calculate the total weightage of admin KPIs for a specific employee or role

        Admin KPIs include:
        1. Global KPIs created by admin (manager_id = 0)
        2. Role-based KPIs for the employee's role created by admin
        3. Employee-specific KPIs created by admin

        The total weightage should not exceed 30%
        """
        # Get the employee if employee_id is provided
        employee = None
        if employee_id:
            employee = db.query(User).filter(User.id == employee_id).first()
            if not employee:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee with ID {employee_id} not found")

            # Use the employee's role_id if role_id is not provided
            if not role_id:
                role_id = employee.role_id

        # Build the query for admin KPIs
        query = db.query(KPI).filter(
            KPI.status == "active"
        )

        # Add filters based on KPI type
        conditions = []

        # Global KPIs created by admin (manager_id = 0)
        conditions.append(
            (KPI.type == "global") & (KPI.manager_id == 0)
        )

        # Role-based KPIs for the employee's role created by admin
        if role_id:
            conditions.append(
                (KPI.type == "role-based") & (KPI.target_role_id == role_id) & (KPI.created_by != KPI.manager_id)
            )

        # Employee-specific KPIs created by admin
        if employee_id:
            conditions.append(
                (KPI.type == "employee-specific") & (KPI.target_employee_id == employee_id) & (KPI.created_by != KPI.manager_id)
            )

        # Combine conditions with OR
        query = query.filter(or_(*conditions))

        # Calculate the total weightage
        total_weightage = db.query(func.sum(KPI.weightage)).select_from(query.subquery()).scalar() or 0

        return total_weightage

    @staticmethod
    def get_manager_kpi_weightage(db: Session, employee_id: int = None, role_id: int = None, manager_id: int = None) -> float:
        """
        Calculate the total weightage of manager KPIs for a specific employee or role

        Manager KPIs include:
        1. Global KPIs created by the manager
        2. Role-based KPIs for the employee's role created by the manager
        3. Employee-specific KPIs created by the manager

        The total weightage should not exceed 70%
        """
        # Get the employee if employee_id is provided
        employee = None
        if employee_id:
            employee = db.query(User).filter(User.id == employee_id).first()
            if not employee:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee with ID {employee_id} not found")

            # Use the employee's role_id and manager_id if not provided
            if not role_id:
                role_id = employee.role_id
            if not manager_id:
                manager_id = employee.manager_id

        # Build the query for manager KPIs
        query = db.query(KPI).filter(
            KPI.status == "active"
        )

        # Add filters based on KPI type
        conditions = []

        # Global KPIs created by the manager
        if manager_id:
            conditions.append(
                (KPI.type == "global") & (KPI.manager_id == manager_id) & (KPI.manager_id != 0)
            )

        # Role-based KPIs for the employee's role created by the manager
        if role_id and manager_id:
            conditions.append(
                (KPI.type == "role-based") & (KPI.target_role_id == role_id) & (KPI.manager_id == manager_id)
            )

        # Employee-specific KPIs created by the manager
        if employee_id and manager_id:
            conditions.append(
                (KPI.type == "employee-specific") & (KPI.target_employee_id == employee_id) & (KPI.manager_id == manager_id)
            )

        # Combine conditions with OR
        query = query.filter(or_(*conditions))

        # Calculate the total weightage
        total_weightage = db.query(func.sum(KPI.weightage)).select_from(query.subquery()).scalar() or 0

        return total_weightage

    @staticmethod
    def get_total_kpi_weightage(db: Session, employee_id: int) -> dict:
        """
        Calculate the total weightage of all KPIs for a specific employee.
        Returns a dictionary with:
        - total_weightage: total weightage of all KPIs
        - remaining_to_100: 100 - total_weightage
        - kpis: list of KPIs with their details
        For backward compatibility, also includes:
        - admin_weightage: total weightage of admin KPIs (deprecated)
        - manager_weightage: total weightage of manager KPIs (deprecated)
        """
        # Get the employee
        employee = db.query(User).filter(User.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee with ID {employee_id} not found")

        # For backward compatibility
        admin_weightage = KPIService.get_admin_kpi_weightage(db, employee_id)
        manager_weightage = KPIService.get_manager_kpi_weightage(db, employee_id)

        # Get all active KPIs for this employee (global, role-based for their role, employee-specific for them)
        kpis_query = db.query(KPI).filter(
            KPI.status == "active",
            or_(
                (KPI.type == "global"),
                and_(KPI.type == "role-based", KPI.target_role_id == employee.role_id),
                and_(KPI.type == "employee-specific", KPI.target_employee_id == employee_id)
            )
        )
        kpis = kpis_query.all()

        # Calculate total weightage directly
        total_weightage = sum(kpi.weightage for kpi in kpis)
        remaining_to_100 = 100 - total_weightage

        # Get creator names for each KPI
        kpi_details = []
        for kpi in kpis:
            creator = db.query(User).filter(User.id == kpi.created_by).first()
            creator_name = creator.name if creator else "Unknown"
            kpi_details.append({
                "id": kpi.id,
                "title": kpi.title,
                "weightage": kpi.weightage,
                "is_technical": kpi.is_technical,
                "creator_name": creator_name,
                "type": kpi.type
            })

        return {
            "admin_weightage": admin_weightage,  # Kept for backward compatibility
            "manager_weightage": manager_weightage,  # Kept for backward compatibility
            "total_weightage": total_weightage,
            "remaining_to_100": remaining_to_100,
            "kpis": kpi_details
        }

    @staticmethod
    def create_kpi(db: Session, kpi_data: KPICreate, current_user: User) -> KPI:
        """
        Create a new KPI with weightage validation

        Validation rules:
        1. Total KPI weightage for an employee cannot exceed 100%
        2. Detailed validation feedback is provided when limits would be exceeded
        3. Technical/Administrative KPI categorization is maintained
        """
        # Validate KPI type
        if kpi_data.type not in ["global", "role-based", "employee-specific"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid KPI type")

        # Validate target based on type
        if kpi_data.type == "role-based" and not kpi_data.target_role_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role-based KPI requires target_role_id")
        if kpi_data.type == "employee-specific" and not kpi_data.target_employee_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee-specific KPI requires target_employee_id")

        # Check if user is admin or manager
        is_admin = current_user.role.name.lower() == "admin"
        is_manager = current_user.role.name.lower() == "manager"

        # Set manager_id based on user role and KPI type
        if is_admin:
            # For all KPIs created by admin, manager_id = 0
            manager_id = 0
            
            # For employee-specific KPIs, we still need to validate the employee exists
            if kpi_data.type == "employee-specific":
                employee = db.query(User).filter(User.id == kpi_data.target_employee_id).first()
                if not employee:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Target employee with ID {kpi_data.target_employee_id} not found"
                    )
        else:
            # For non-admin users, manager_id = current user's id
            manager_id = current_user.id

        # Perform 100% total weightage validation based on KPI type
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
                if employee_weightage["total_weightage"] + kpi_data.weightage > 100:
                    # Provide detailed error message with KPI breakdown
                    kpi_breakdown = "\n".join([
                        f"- {kpi_info['title']} ({kpi_info['weightage']}%, created by {kpi_info['creator_name']})"
                        for kpi_info in employee_weightage["kpis"]
                    ])

                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Creating this KPI would exceed the 100% limit for employee {employee.name}.\n"
                            f"Current total: {employee_weightage['total_weightage']}%\n"
                            f"New KPI weightage: {kpi_data.weightage}%\n"
                            f"Would exceed by: {employee_weightage['total_weightage'] + kpi_data.weightage - 100}%\n\n"
                            f"Current KPIs:\n{kpi_breakdown}\n\n"
                            f"Available weightage: {100 - employee_weightage['total_weightage']}%"
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
                    if employee_weightage["total_weightage"] + kpi_data.weightage > 100:
                        # Provide detailed error message with KPI breakdown
                        kpi_breakdown = "\n".join([
                            f"- {kpi_info['title']} ({kpi_info['weightage']}%, created by {kpi_info['creator_name']})"
                            for kpi_info in employee_weightage["kpis"]
                        ])

                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=(
                                f"Creating this KPI would exceed the 100% limit for employee {employee.name}.\n"
                                f"Current total: {employee_weightage['total_weightage']}%\n"
                                f"New KPI weightage: {kpi_data.weightage}%\n"
                                f"Would exceed by: {employee_weightage['total_weightage'] + kpi_data.weightage - 100}%\n\n"
                                f"Current KPIs:\n{kpi_breakdown}\n\n"
                                f"Available weightage: {100 - employee_weightage['total_weightage']}%"
                            )
                        )

        elif kpi_data.type == "employee-specific":
            # For employee-specific KPIs, check only the target employee
            employee_weightage = KPIService.get_total_kpi_weightage(db, kpi_data.target_employee_id)
            if employee_weightage["total_weightage"] + kpi_data.weightage > 100:
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
                        f"Creating this KPI would exceed the 100% limit for employee {employee_name}.\n"
                        f"Current total: {employee_weightage['total_weightage']}%\n"
                        f"New KPI weightage: {kpi_data.weightage}%\n"
                        f"Would exceed by: {employee_weightage['total_weightage'] + kpi_data.weightage - 100}%\n\n"
                        f"Current KPIs:\n{kpi_breakdown}\n\n"
                        f"Available weightage: {100 - employee_weightage['total_weightage']}%"
                    )
                )

        # Create new KPI
        new_kpi = KPI(
            title=kpi_data.title,
            description=kpi_data.description,
            weightage=kpi_data.weightage,
            type=kpi_data.type,
            target_role_id=kpi_data.target_role_id,
            target_employee_id=kpi_data.target_employee_id,
            status=kpi_data.status,
            created_by=current_user.id,
            manager_id=manager_id,
            is_technical=kpi_data.is_technical if kpi_data.is_technical is not None else True
        )

        db.add(new_kpi)
        db.commit()
        db.refresh(new_kpi)
        return new_kpi

    @staticmethod
    def update_kpi(db: Session, kpi_id: int, kpi_data: KPIUpdate, current_user: User) -> KPI:
        """
        Update a KPI with weightage validation
        
        Validation rules:
        1. Total KPI weightage for an employee cannot exceed 100%
        2. Detailed validation feedback is provided when limits would be exceeded
        3. Technical/Administrative KPI categorization is maintained
        """
        # Get the KPI
        kpi = db.query(KPI).filter(KPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"KPI with ID {kpi_id} not found")

        # Check if user is authorized to update this KPI
        if kpi.created_by != current_user.id and kpi.manager_id != current_user.id and current_user.role.name != "Admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this KPI")

        # Store original values for validation
        original_weightage = kpi.weightage
        original_type = kpi.type
        original_target_role_id = kpi.target_role_id
        original_target_employee_id = kpi.target_employee_id

        # Calculate weightage difference if being updated
        weightage_diff = 0
        if kpi_data.weightage is not None:
            weightage_diff = kpi_data.weightage - original_weightage

        # Only perform weightage validation if weightage is being increased
        if weightage_diff > 0:
            # Check if user is admin or manager
            is_admin = current_user.role.name.lower() == "admin"
            is_manager = current_user.role.name.lower() == "manager"

            # Determine the type and targets for validation
            kpi_type = kpi_data.type if kpi_data.type is not None else original_type
            target_role_id = kpi_data.target_role_id if kpi_data.target_role_id is not None else original_target_role_id
            target_employee_id = kpi_data.target_employee_id if kpi_data.target_employee_id is not None else original_target_employee_id

            # Perform 100% total weightage validation based on KPI type
            if kpi_type == "global":
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
                    
                    # Subtract the original weightage of this KPI from the total if applicable
                    adjusted_total = employee_weightage["total_weightage"]
                    if original_type == "global":
                        adjusted_total -= original_weightage
                    
                    if adjusted_total + kpi_data.weightage > 100:
                        # Provide detailed error message with KPI breakdown
                        kpi_breakdown = "\n".join([
                            f"- {kpi_info['title']} ({kpi_info['weightage']}%, created by {kpi_info['creator_name']})"
                            for kpi_info in employee_weightage["kpis"] if kpi_info['id'] != kpi_id
                        ])

                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=(
                                f"Updating this KPI would exceed the 100% limit for employee {employee.name}.\n"
                                f"Current total: {adjusted_total}% (after removing original weightage of {original_weightage}%)\n"
                                f"New KPI weightage: {kpi_data.weightage}%\n"
                                f"Would exceed by: {adjusted_total + kpi_data.weightage - 100}%\n\n"
                                f"Current KPIs:\n{kpi_breakdown}\n\n"
                                f"Available weightage: {100 - adjusted_total}%"
                            )
                        )

            elif kpi_type == "role-based":
                # For role-based KPIs, check all employees with this role
                employees_with_role = db.query(User).filter(
                    User.role_id == target_role_id,
                    User.is_active == True
                ).all()

                if not employees_with_role:
                    # No validation needed if no employees have this role
                    pass
                else:
                    # Check each affected employee
                    for employee in employees_with_role:
                        employee_weightage = KPIService.get_total_kpi_weightage(db, employee.id)
                        
                        # Subtract the original weightage of this KPI from the total if applicable
                        adjusted_total = employee_weightage["total_weightage"]
                        if original_type == "role-based" and original_target_role_id == target_role_id:
                            adjusted_total -= original_weightage
                        
                        if adjusted_total + kpi_data.weightage > 100:
                            # Provide detailed error message with KPI breakdown
                            kpi_breakdown = "\n".join([
                                f"- {kpi_info['title']} ({kpi_info['weightage']}%, created by {kpi_info['creator_name']})"
                                for kpi_info in employee_weightage["kpis"] if kpi_info['id'] != kpi_id
                            ])

                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=(
                                    f"Updating this KPI would exceed the 100% limit for employee {employee.name}.\n"
                                    f"Current total: {adjusted_total}% (after removing original weightage of {original_weightage}%)\n"
                                    f"New KPI weightage: {kpi_data.weightage}%\n"
                                    f"Would exceed by: {adjusted_total + kpi_data.weightage - 100}%\n\n"
                                    f"Current KPIs:\n{kpi_breakdown}\n\n"
                                    f"Available weightage: {100 - adjusted_total}%"
                                )
                            )

            elif kpi_type == "employee-specific":
                # For employee-specific KPIs, check only the target employee
                employee_weightage = KPIService.get_total_kpi_weightage(db, target_employee_id)
                
                # Subtract the original weightage of this KPI from the total if applicable
                adjusted_total = employee_weightage["total_weightage"]
                if original_type == "employee-specific" and original_target_employee_id == target_employee_id:
                    adjusted_total -= original_weightage
                
                if adjusted_total + kpi_data.weightage > 100:
                    # Provide detailed error message with KPI breakdown
                    kpi_breakdown = "\n".join([
                        f"- {kpi_info['title']} ({kpi_info['weightage']}%, created by {kpi_info['creator_name']})"
                        for kpi_info in employee_weightage["kpis"] if kpi_info['id'] != kpi_id
                    ])

                    # Get employee name
                    employee = db.query(User).filter(User.id == target_employee_id).first()
                    employee_name = employee.name if employee else "Unknown"

                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Updating this KPI would exceed the 100% limit for employee {employee_name}.\n"
                            f"Current total: {adjusted_total}% (after removing original weightage of {original_weightage}%)\n"
                            f"New KPI weightage: {kpi_data.weightage}%\n"
                            f"Would exceed by: {adjusted_total + kpi_data.weightage - 100}%\n\n"
                            f"Current KPIs:\n{kpi_breakdown}\n\n"
                            f"Available weightage: {100 - adjusted_total}%"
                        )
                    )

        # Update KPI fields
        if kpi_data.title is not None:
            kpi.title = kpi_data.title
        if kpi_data.description is not None:
            kpi.description = kpi_data.description
        if kpi_data.weightage is not None:
            kpi.weightage = kpi_data.weightage
        if kpi_data.type is not None:
            kpi.type = kpi_data.type
        if kpi_data.target_role_id is not None:
            kpi.target_role_id = kpi_data.target_role_id
        if kpi_data.target_employee_id is not None:
            kpi.target_employee_id = kpi_data.target_employee_id
        if kpi_data.status is not None:
            kpi.status = kpi_data.status
        if kpi_data.is_technical is not None:
            kpi.is_technical = kpi_data.is_technical

        db.commit()
        db.refresh(kpi)
        return kpi

    @staticmethod
    def delete_kpi(db: Session, kpi_id: int, current_user: User) -> KPI:
        """
        Delete a KPI
        """
        # Get the KPI
        kpi = db.query(KPI).filter(KPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"KPI with ID {kpi_id} not found")

        # Check if user is authorized to delete this KPI
        if kpi.created_by != current_user.id and kpi.manager_id != current_user.id and current_user.role.name != "Admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this KPI")

        # Delete the KPI
        db.delete(kpi)
        db.commit()
        return kpi
