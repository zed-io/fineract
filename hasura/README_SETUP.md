# Setting Up the Fineract Hasura Backend

This document provides detailed instructions for setting up the Fineract Hasura backend locally.

## Prerequisites

- Docker and Docker Compose
- Hasura CLI (`npm install -g hasura-cli` or other installation method)
- PostgreSQL client (psql)
- Bash shell

## Quick Setup

For a quick setup, we've provided a setup script that handles all the steps automatically:

```bash
./setup.sh
```

This script will:
1. Start all required Docker services
2. Ensure PostgreSQL extensions are properly loaded
3. Apply migrations in the correct order
4. Apply Hasura metadata
5. Seed the database with initial data

## Manual Setup

If you prefer to run the steps manually or if the automated script fails:

### 1. Start the services

```bash
docker-compose up -d postgres hasura actions-server
```

### 2. Ensure extensions are loaded

```bash
./scripts/ensure_extensions.sh
```

### 3. Apply migrations manually

```bash
# Create the database
docker exec -i hasura-postgres-1 psql -U postgres -c "CREATE DATABASE fineract WITH OWNER = postgres ENCODING = 'UTF8';"

# Apply migrations in order
for f in ./migrations/00000*.up.sql; do
  docker exec -i hasura-postgres-1 psql -U postgres -d fineract -f - < "$f"
done
```

### 4. Apply Hasura metadata

```bash
hasura metadata apply --endpoint http://localhost:8080 --admin-secret myadminsecretkey
```

### 5. Seed the database

```bash
DB_USER=postgres DB_PASSWORD=postgrespassword DB_NAME=fineract ./load_seeds.sh
```

## Troubleshooting

### Extension Issues

If you encounter issues with PostgreSQL extensions:

```bash
# Verify extensions
docker exec -i hasura-postgres-1 psql -U postgres -d fineract -c "SELECT * FROM pg_extension;"

# Manually create extensions if needed
docker exec -i hasura-postgres-1 psql -U postgres -d fineract -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
docker exec -i hasura-postgres-1 psql -U postgres -d fineract -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
```

### Migration Order Issues

The migrations must be applied in the correct order due to dependencies. The recommended order is:

1. `000000_init_extensions.up.sql` - Sets up required extensions
2. `000001_core_schema.up.sql` - Creates core tables and types
3. Other domain-specific migrations

### Hasura Console Access

If you have trouble accessing the Hasura console:

1. Verify the Hasura service is running: `docker ps | grep hasura`
2. Check Hasura logs: `docker logs hasura-hasura-1`
3. Ensure you're using the correct admin secret: `myadminsecretkey`

## Accessing the System

- **Hasura Console**: http://localhost:8080/console (Admin Secret: `myadminsecretkey`)
- **GraphQL Endpoint**: http://localhost:8080/v1/graphql
- **Default Admin Account**: Username: `admin`, Password: `password`

## Data Schema

The system uses a multi-schema approach:

- `fineract_tenants` schema for tenant management
- `fineract_default` schema for the default tenant data

## Next Steps

Once the system is set up, you can:

1. Access the Hasura console to explore the schema
2. Use the GraphQL API for development
3. Set up a client application to connect to the backend