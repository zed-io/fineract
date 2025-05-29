#!/bin/bash

# Track tables in Hasura
HASURA_ENDPOINT="http://localhost:8090"
HASURA_ADMIN_SECRET="myadminsecretkey"

# Track clients table
curl -X POST \
  $HASURA_ENDPOINT/v1/metadata \
  -H "X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_track_table",
    "args": {
      "source": "default",
      "schema": "fineract",
      "name": "clients"
    }
  }'

# Track savings_accounts table
curl -X POST \
  $HASURA_ENDPOINT/v1/metadata \
  -H "X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_track_table",
    "args": {
      "source": "default",
      "schema": "fineract",
      "name": "savings_accounts"
    }
  }'

# Track loans table
curl -X POST \
  $HASURA_ENDPOINT/v1/metadata \
  -H "X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_track_table",
    "args": {
      "source": "default",
      "schema": "fineract",
      "name": "loans"
    }
  }'

# Track transactions table
curl -X POST \
  $HASURA_ENDPOINT/v1/metadata \
  -H "X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_track_table",
    "args": {
      "source": "default",
      "schema": "fineract",
      "name": "transactions"
    }
  }'

# Create relationships
# savings_accounts -> clients
curl -X POST \
  $HASURA_ENDPOINT/v1/metadata \
  -H "X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_object_relationship",
    "args": {
      "source": "default",
      "table": {
        "schema": "fineract",
        "name": "savings_accounts"
      },
      "name": "client",
      "using": {
        "foreign_key_constraint_on": "client_id"
      }
    }
  }'

# loans -> clients
curl -X POST \
  $HASURA_ENDPOINT/v1/metadata \
  -H "X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_object_relationship",
    "args": {
      "source": "default",
      "table": {
        "schema": "fineract",
        "name": "loans"
      },
      "name": "client",
      "using": {
        "foreign_key_constraint_on": "client_id"
      }
    }
  }'

# clients -> savings_accounts (array relationship)
curl -X POST \
  $HASURA_ENDPOINT/v1/metadata \
  -H "X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {
        "schema": "fineract",
        "name": "clients"
      },
      "name": "savings_accounts",
      "using": {
        "foreign_key_constraint_on": {
          "table": {
            "schema": "fineract",
            "name": "savings_accounts"
          },
          "column": "client_id"
        }
      }
    }
  }'

# clients -> loans (array relationship)
curl -X POST \
  $HASURA_ENDPOINT/v1/metadata \
  -H "X-Hasura-Admin-Secret: $HASURA_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {
        "schema": "fineract",
        "name": "clients"
      },
      "name": "loans",
      "using": {
        "foreign_key_constraint_on": {
          "table": {
            "schema": "fineract",
            "name": "loans"
          },
          "column": "client_id"
        }
      }
    }
  }'

echo "Tables tracked and relationships created!"