#!/bin/bash
# Script to update Hasura metadata to use the new schema structure
# This script updates all references from fineract_* schemas to the new schema names

# Set the base directory for Hasura metadata
METADATA_DIR="/Users/markp/wam/fineract/hasura/metadata"

# Create backup directory
BACKUP_DIR="/Users/markp/wam/fineract/hasura/metadata_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

echo "Creating backups of original metadata files..."
cp -r $METADATA_DIR/* $BACKUP_DIR/

echo "Updating schema references in Hasura metadata files..."

# Function to update schema references in a file
update_schema_references() {
  local file=$1
  echo "Updating $file"
  
  # Create a temporary file for sed operations
  temp_file=$(mktemp)
  
  # Replace fineract_tenants with tenants
  sed 's/fineract_tenants/tenants/g' "$file" > "$temp_file"
  
  # Replace fineract_default with default, but ensure proper JSON quoting
  sed 's/"schema": "fineract_default"/"schema": "default"/g' "$temp_file" > "$file"
  sed 's/"fineract_default"/"default"/g' "$file" > "$temp_file"
  
  # Fix any remaining references
  sed 's/fineract_default/default/g' "$temp_file" > "$file"
  
  # Clean up temp file
  rm "$temp_file"
}

# Process all JSON files in the metadata directory and subdirectories
find $METADATA_DIR -type f -name "*.json" | while read file; do
  update_schema_references "$file"
done

# Process all YAML files in the metadata directory and subdirectories
find $METADATA_DIR -type f -name "*.yaml" | while read file; do
  update_schema_references "$file"
done

# Process all GraphQL files for schema references
find $METADATA_DIR -type f -name "*.graphql" | while read file; do
  update_schema_references "$file"
done

echo "Updating Hasura metadata.json file..."
update_schema_references "$METADATA_DIR/metadata.json"

echo "Updating Hasura hasura_metadata.json file..."
update_schema_references "$METADATA_DIR/hasura_metadata.json"

# Handle special cases with more complex replacements
echo "Handling special cases..."

# Update remote relationship configurations
find $METADATA_DIR/relationships -type f -name "*.json" | while read file; do
  echo "Updating relationship file: $file"
  
  # Create a temporary file for JSON manipulation
  temp_file=$(mktemp)
  
  # Process schema references within remote_table definitions
  sed 's/"schema": "fineract_default"/"schema": "default"/g' "$file" > "$temp_file"
  
  # Process any remaining schema references
  sed 's/"fineract_default"/"default"/g' "$temp_file" > "$file"
  sed 's/fineract_default/default/g' "$file" > "$temp_file"
  
  # Update the original file
  cp "$temp_file" "$file"
  
  # Clean up temp file
  rm "$temp_file"
done

echo "Metadata schema references have been updated."
echo "Original metadata files have been backed up to $BACKUP_DIR"
echo "Please verify the changes before applying the updated metadata to Hasura."

# Instructions for applying updated metadata
echo "-------------------------------------------------------------------------"
echo "To apply the updated metadata to Hasura, run:"
echo "cd /Users/markp/wam/fineract/hasura && hasura metadata apply"
echo "-------------------------------------------------------------------------"