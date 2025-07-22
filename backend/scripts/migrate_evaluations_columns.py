import os
import sqlite3
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DATA_DIR = "data"
EMPLOYEE_DB = os.path.join(DATA_DIR, "employee_eval.db")

def migrate_evaluations_columns():
    """
    Apply database migrations for evaluations table:
    1. Backup current data
    2. Remove old submitted_by column and its constraints
    3. Add new drafted_by and submitted_by columns with proper constraints
    4. Migrate data if needed
    5. Add indices for better performance
    """
    try:
        # Ensure data directory exists
        os.makedirs(DATA_DIR, exist_ok=True)

        # Connect to the database
        conn = sqlite3.connect(EMPLOYEE_DB)
        cursor = conn.cursor()
        
        # Start transaction
        conn.execute("BEGIN TRANSACTION")
        
        logger.info("Starting evaluations table migration")
        
        # 1. Backup current data
        logger.info("Creating backup of evaluations data")
        cursor.execute("DROP TABLE IF EXISTS temp_evaluations")
        cursor.execute("CREATE TABLE temp_evaluations AS SELECT * FROM evaluations")
        logger.info("Backup created successfully")
        
        # 2. Remove old column and its constraints
        # SQLite doesn't support DROP COLUMN directly in older versions, so we need to recreate the table
        
        # Get the current table schema
        cursor.execute("PRAGMA table_info(evaluations)")
        columns = cursor.fetchall()
        
        # Create a new table without the submitted_by column
        create_table_sql = "CREATE TABLE new_evaluations (\n"
        column_defs = []
        column_names_added = set()  # Track column names to avoid duplicates
        
        for col in columns:
            col_id, col_name, col_type, col_notnull, col_default, col_pk = col
            
            # Skip the submitted_by and drafted_by columns as we'll add them back properly
            if col_name in ['submitted_by', 'drafted_by']:
                continue
                
            # Skip if column name already added (avoid duplicates)
            if col_name in column_names_added:
                continue
                
            column_names_added.add(col_name)
                
            # Build column definition
            col_def = f"{col_name} {col_type}"
            
            if col_pk:
                col_def += " PRIMARY KEY"
            if col_notnull:
                col_def += " NOT NULL"
            if col_default is not None:
                col_def += f" DEFAULT {col_default}"
                
            column_defs.append(col_def)
        
        create_table_sql += ",\n".join(column_defs)
        
        # Add foreign key constraints (except for submitted_by which we're removing)
        cursor.execute("PRAGMA foreign_key_list(evaluations)")
        fk_constraints = cursor.fetchall()
        
        fk_defs = []
        fk_added = set()  # Track foreign keys to avoid duplicates
        
        for fk in fk_constraints:
            fk_id, seq, table, from_col, to_col, on_update, on_delete, match = fk
            
            # Skip constraints for submitted_by and drafted_by
            if from_col in ['submitted_by', 'drafted_by']:
                continue
                
            # Skip if foreign key already added (avoid duplicates)
            fk_key = f"{from_col}_{table}_{to_col}"
            if fk_key in fk_added:
                continue
                
            fk_added.add(fk_key)
            
            fk_defs.append(f"FOREIGN KEY ({from_col}) REFERENCES {table}({to_col})")
        
        if fk_defs:
            create_table_sql += ",\n" + ",\n".join(fk_defs)
        
        create_table_sql += "\n)"
        
        # Create the new table
        cursor.execute("DROP TABLE IF EXISTS new_evaluations")
        cursor.execute(create_table_sql)
        logger.info("Created new table structure")
        
        # Copy data from old table to new table
        old_columns = [col[1] for col in columns if col[1] not in ['submitted_by', 'drafted_by']]
        old_columns_str = ", ".join(old_columns)
        
        cursor.execute(f"INSERT INTO new_evaluations ({old_columns_str}) SELECT {old_columns_str} FROM evaluations")
        logger.info("Copied data to new table")
        
        # Replace old table with new table
        cursor.execute("DROP TABLE evaluations")
        cursor.execute("ALTER TABLE new_evaluations RENAME TO evaluations")
        logger.info("Replaced old table with new table")
        
        # 3. Add new columns with proper constraints
        logger.info("Adding drafted_by and submitted_by columns with proper constraints")
        cursor.execute("ALTER TABLE evaluations ADD COLUMN drafted_by INTEGER DEFAULT NULL")
        cursor.execute("ALTER TABLE evaluations ADD COLUMN submitted_by INTEGER DEFAULT NULL")
        
        # Add foreign key constraints
        # Note: SQLite doesn't support adding constraints to existing tables directly
        # We would need to recreate the table again to add these constraints
        # For now, we'll rely on application-level enforcement and document this limitation
        logger.info("Foreign key constraints will be enforced at the application level")
        
        # 4. Migrate data if needed
        logger.info("Migrating data from backup")
        
        # SQLite doesn't support table aliases in UPDATE statements in this way
        # Get all evaluations with status 'submitted' from the backup
        cursor.execute("SELECT id, submitted_by FROM temp_evaluations WHERE status = 'submitted'")
        submitted_evaluations = cursor.fetchall()
        
        # Update each evaluation individually
        for eval_id, submitted_by in submitted_evaluations:
            if submitted_by is not None:
                cursor.execute(
                    "UPDATE evaluations SET submitted_by = ? WHERE id = ?",
                    (submitted_by, eval_id)
                )
        logger.info("Data migration completed")
        
        # 5. Add indices for better performance
        logger.info("Creating indices for better performance")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_drafted_by ON evaluations(drafted_by)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_submitted_by ON evaluations(submitted_by)")
        logger.info("Indices created successfully")
        
        # Clean up
        cursor.execute("DROP TABLE temp_evaluations")
        logger.info("Temporary backup table removed")
        
        # Commit transaction
        conn.commit()
        conn.close()
        logger.info("Evaluations table migration completed successfully")
        
    except Exception as e:
        logger.error(f"Error during evaluations table migration: {e}")
        # Rollback transaction in case of error
        if conn:
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    migrate_evaluations_columns()