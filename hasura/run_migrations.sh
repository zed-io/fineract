#!/bin/bash
set -e

echo "=== Running Database Migrations ==="

# Database connection parameters
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgrespassword"
DB_NAME="postgres"

# Function to run migration
run_migration() {
  local migration=$1
  local migration_name=$(basename "$migration")
  
  echo "Running migration: $migration_name..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration"
  
  if [ $? -eq 0 ]; then
    echo "✅ Successfully ran $migration_name"
  else
    echo "❌ Failed to run $migration_name"
    exit 1
  fi
}

# Run migrations in order
MIGRATIONS_DIR="/Users/markp/wam/fineract/hasura/migrations"

for migration in $(ls $MIGRATIONS_DIR/*.up.sql | sort); do
  if [[ $(basename $migration) == *.up.sql ]]; then
    run_migration "$migration"
  fi
done

echo "=== All migrations completed successfully! ==="