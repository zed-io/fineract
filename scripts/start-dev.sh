#!/bin/bash

echo "Starting Fineract Development Environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env file with your configuration before continuing."
    echo "Press any key to continue once configured..."
    read -n 1
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
docker-compose -f docker-compose-hasura.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker-compose -f docker-compose-hasura.yml exec postgres pg_isready -U postgres; do
    sleep 1
done

# Start Hasura
echo "Starting Hasura..."
docker-compose -f docker-compose-hasura.yml up -d hasura

# Wait for Hasura to be ready
echo "Waiting for Hasura to be ready..."
until curl -s http://localhost:8080/healthz > /dev/null; do
    sleep 1
done

# Apply migrations and metadata
echo "Applying Hasura migrations and metadata..."
cd hasura
hasura migrate apply --admin-secret myadminsecretkey --endpoint http://localhost:8080 --database-name default
hasura metadata apply --admin-secret myadminsecretkey --endpoint http://localhost:8080
cd ..

# Start frontend
echo "Starting frontend development server..."
cd front-ends/credit-cloud-admin
npm run dev &

echo ""
echo "Development environment is ready!"
echo ""
echo "Access points:"
echo "  - Frontend: http://localhost:3000"
echo "  - Hasura Console: http://localhost:8080/console"
echo "  - GraphQL Endpoint: http://localhost:8080/v1/graphql"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait