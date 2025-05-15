#!/bin/bash
set -e

echo "=== Loading Trinidad and Tobago Seed Data ==="

# Database connection parameters
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="fineract"

# Ensure the scripts exist
SCRIPTS=(
  "/Users/markp/wam/fineract/hasura/seeds/trinidad_seed_data.sql"
  "/Users/markp/wam/fineract/hasura/seeds/trinidad_accounting_seed.sql"
  "/Users/markp/wam/fineract/hasura/seeds/trinidad_savings_seed.sql"
  "/Users/markp/wam/fineract/hasura/seeds/trinidad_fixed_deposit_schema.sql"
  "/Users/markp/wam/fineract/hasura/seeds/trinidad_recurring_deposit_schema.sql"
  "/Users/markp/wam/fineract/hasura/seeds/trinidad_reporting_seed.sql"
  "/Users/markp/wam/fineract/hasura/seeds/trinidad_integration_seed.sql"
)

for script in "${SCRIPTS[@]}"; do
  if [ ! -f "$script" ]; then
    echo "Error: Script $script does not exist."
    exit 1
  fi
done

# Function to run SQL script
run_script() {
  local script=$1
  local script_name=$(basename "$script")
  
  echo "Loading $script_name..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$script"
  
  if [ $? -eq 0 ]; then
    echo "✅ Successfully loaded $script_name"
  else
    echo "❌ Failed to load $script_name"
    exit 1
  fi
}

# Load seeds in the correct order
echo "Step 1: Loading core data (offices, staff, clients, products)..."
run_script "/Users/markp/wam/fineract/hasura/seeds/trinidad_seed_data.sql"

echo "Step 2: Loading accounting data (GL accounts, transactions)..."
run_script "/Users/markp/wam/fineract/hasura/seeds/trinidad_accounting_seed.sql"

echo "Step 3: Loading savings data (accounts, transactions)..."
run_script "/Users/markp/wam/fineract/hasura/seeds/trinidad_savings_seed.sql"

echo "Step 4: Loading fixed deposit data (schema, products, accounts)..."
run_script "/Users/markp/wam/fineract/hasura/seeds/trinidad_fixed_deposit_schema.sql"

echo "Step 5: Loading recurring deposit data (schema, products, accounts)..."
run_script "/Users/markp/wam/fineract/hasura/seeds/trinidad_recurring_deposit_schema.sql"

echo "Step 6: Loading reporting data (templates, executions, results)..."
run_script "/Users/markp/wam/fineract/hasura/seeds/trinidad_reporting_seed.sql"

echo "Step 7: Loading integration data (APIs, webhooks, data exchange)..."
run_script "/Users/markp/wam/fineract/hasura/seeds/trinidad_integration_seed.sql"

echo "=== All Trinidad and Tobago seed data loaded successfully! ==="
echo ""
echo "You now have a complete mock dataset for Trinidad and Tobago operations including:"
echo "• Branch offices across Trinidad and Tobago regions"
echo "• Staff and client data with local names and contexts"
echo "• Loan products configured for the Trinidad market"
echo "• Savings accounts with TTD currency and local product structures"
echo "• Fixed deposit products with Trinidad-specific terms and rates"
echo "• Recurring deposit products including 'Carnival Saver' for local context"
echo "• Chart of accounts referencing local banks (First Citizens, RBC)"
echo "• Comprehensive reporting data with Trinidad-specific metrics"
echo "• Integration configurations with Trinidad financial institutions"
echo ""
echo "To verify the data, run: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'SELECT * FROM trinidad_reporting_summary;'"