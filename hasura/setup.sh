#!/bin/bash
set -e

echo "=== Fineract Hasura Backend Setup ==="
echo ""
echo "This script will set up the complete Hasura backend for Fineract"
echo "It will perform the following steps:"
echo "1. Start the Docker containers"
echo "2. Ensure extensions are properly loaded"
echo "3. Apply migrations"
echo "4. Apply Hasura metadata"
echo "5. Seed the database with initial data"
echo ""
echo "Press ENTER to continue or CTRL+C to cancel"
read

# Step 1: Start Docker containers
echo ""
echo "=== Step 1: Starting Docker containers ==="
docker-compose down
docker-compose up -d postgres hasura actions-server
echo "Waiting for services to be fully up..."
sleep 10

# Step 2: Ensure extensions
echo ""
echo "=== Step 2: Ensuring extensions are properly loaded ==="
./scripts/ensure_extensions.sh

# Step 3: Apply migrations
echo ""
echo "=== Step 3: Applying migrations ==="

# Create the database if it doesn't exist
echo "Creating fineract database if it doesn't exist..."
docker exec -i hasura-postgres-1 psql -U postgres -c "CREATE DATABASE fineract WITH OWNER = postgres ENCODING = 'UTF8' LC_COLLATE = 'en_US.utf8' LC_CTYPE = 'en_US.utf8';" || echo "Database already exists"

# Apply the migrations in order
echo "Applying migrations in the correct order..."
for f in ./migrations/00000*.up.sql; do
  echo "Applying migration: $f"
  docker exec -i hasura-postgres-1 psql -U postgres -d fineract -f - < "$f"
done

# Step 4: Apply Hasura metadata
echo ""
echo "=== Step 4: Applying Hasura metadata ==="
echo "Applying Hasura metadata..."
hasura metadata apply --endpoint http://localhost:8080 --admin-secret myadminsecretkey || echo "Metadata application failed, but continuing..."

# Step 5: Seed the database
echo ""
echo "=== Step 5: Seeding the database ==="
echo "Running seed scripts..."
DB_USER=postgres DB_PASSWORD=postgrespassword DB_NAME=fineract ./load_seeds.sh

echo ""
echo "=== Setup Complete ==="
echo ""
echo "The Hasura backend is now running:"
echo "- Hasura Console: http://localhost:8080/console"
echo "- Hasura Admin Secret: myadminsecretkey"
echo "- GraphQL Endpoint: http://localhost:8080/v1/graphql"
echo ""
echo "Default admin credentials:"
echo "- Username: admin"
echo "- Password: password"
echo ""