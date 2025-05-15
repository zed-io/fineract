#!/bin/bash
set -e

echo "Loading seed data for Fineract Hasura integration..."

# Database connection parameters - these should match your docker-compose or local setup
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-fineract}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgrespassword}

# Load the seed data
echo "Loading loan application seed data..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f ./seeds/loan_application_seed.sql

echo "Seed data loaded successfully!"