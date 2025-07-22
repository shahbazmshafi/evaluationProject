FROM python:3.11-slim

WORKDIR /app

# Install SQLite tools
RUN apt-get update && apt-get install -y sqlite3 curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Make scripts executable
RUN chmod +x /app/scripts/entrypoint.sh
RUN chmod +x /app/scripts/verify_db.py

# Create data directory with proper permissions
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 8000

# Use entrypoint script to initialize database at runtime
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
