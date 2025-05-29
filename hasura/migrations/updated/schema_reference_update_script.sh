#!/bin/bash
# Script to update schema references across migration files
# This script performs bulk search and replace to update fineract_ prefixes

# Set the base directory for migrations
MIGRATIONS_DIR="../"

# Create backup directory
BACKUP_DIR="./backup"
mkdir -p $BACKUP_DIR

echo "Creating backups of original migration files..."
cp -r $MIGRATIONS_DIR/*.sql $BACKUP_DIR/

echo "Updating schema references in migration files..."

# Update fineract_tenants to tenants
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/fineract_tenants/tenants/g' {} \;

# Update fineract_default to default with proper quoting
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/fineract_default/"default"/g' {} \;
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/SET search_path TO "default"/SET search_path TO "default"/g' {} \;

# Fix table references that need schema qualification
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/"default"\./"default"\./g' {} \;

# Update other specific references
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/REFERENCES fineract_/REFERENCES /g' {} \;

# Update function calls
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/fineract_tenants\./tenants\./g' {} \;
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/fineract_default\./"default"\./g' {} \;

# Update attrelid references in functions
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/attrelid = '"'"'fineract_default\./attrelid = '"'"'"default"\./g' {} \;

# Update regclass references
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/fineract_default::"default"/g' {} \;

# Update INSERT statements
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/INSERT INTO fineract_tenants\./INSERT INTO tenants\./g' {} \;
find $MIGRATIONS_DIR -name "*.sql" -type f -exec sed -i'.bak' 's/INSERT INTO fineract_default\./INSERT INTO "default"\./g' {} \;

# Clean up backup files created by sed
find $MIGRATIONS_DIR -name "*.bak" -type f -delete

echo "Updating Hasura metadata files..."

# Update metadata files (adjust path as needed)
METADATA_DIR="../../metadata"

if [ -d "$METADATA_DIR" ]; then
  # Backup metadata
  mkdir -p $BACKUP_DIR/metadata
  cp -r $METADATA_DIR/* $BACKUP_DIR/metadata/
  
  # Update schema references in metadata JSON files
  find $METADATA_DIR -name "*.yaml" -o -name "*.json" -type f -exec sed -i'.bak' 's/fineract_tenants/tenants/g' {} \;
  find $METADATA_DIR -name "*.yaml" -o -name "*.json" -type f -exec sed -i'.bak' 's/fineract_default/default/g' {} \;
  
  # Clean up backup files
  find $METADATA_DIR -name "*.bak" -type f -delete
  
  echo "Metadata files updated."
else
  echo "Metadata directory not found at $METADATA_DIR. Skipping metadata updates."
fi

echo "Schema reference updates completed."
echo "Please review the changes to ensure correctness."
echo "Backups of original files are stored in $BACKUP_DIR"