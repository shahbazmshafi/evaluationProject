#!/bin/sh
set -e

# Ensure correct permissions for the data directory
mkdir -p /app/data
chmod 777 /app/data

# Wait for any dependent services (if needed)
echo "Initializing database..."
python /app/scripts/init_db.py

# Apply database migrations
echo "Applying database migrations..."
python /app/scripts/migrate_db.py

# Start the application
echo "Starting the application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
