#!/usr/bin/env python
# Migration script to update admin-created KPIs
# This script updates all KPIs created by admin users to have manager_id = 0

import os
import sys
import logging
import sqlite3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """
    Main function to update admin-created KPIs
    """
    logger.info("Starting migration to update admin-created KPIs")
    
    # Database path
    db_path = os.path.join("data", "employee_eval.db")
    
    if not os.path.exists(db_path):
        logger.error(f"Database file not found at {db_path}")
        return
    
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # List all tables in the database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"Tables in database: {tables}")
        
        # Find all admin users (role_id = 1)
        cursor.execute("SELECT id FROM users WHERE role_id = 1")
        admin_ids = [row[0] for row in cursor.fetchall()]
        
        if not admin_ids:
            logger.warning("No admin users found. Migration not needed.")
            return
        
        logger.info(f"Found {len(admin_ids)} admin users: {admin_ids}")
        
        # Check if KPI table exists
        kpi_table = None
        for table in tables:
            if table.lower() == "kpi" or table.lower() == "kpis":
                kpi_table = table
                break
        
        if not kpi_table:
            logger.error("KPI table not found in database")
            return
        
        logger.info(f"Found KPI table: {kpi_table}")
        
        # Update all KPIs created by admin users to have manager_id = 0
        admin_ids_str = ", ".join(str(id) for id in admin_ids)
        update_query = f"""
            UPDATE {kpi_table}
            SET manager_id = 0
            WHERE created_by IN ({admin_ids_str})
        """
        
        cursor.execute(update_query)
        conn.commit()
        
        logger.info(f"Updated {cursor.rowcount} KPIs created by admin users to have manager_id = 0")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating admin-created KPIs: {str(e)}")
        raise
    finally:
        conn.close()
    
    logger.info("Migration completed successfully")

if __name__ == "__main__":
    main()