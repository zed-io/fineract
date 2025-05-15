#!/bin/bash
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements. See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership. The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License. You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied. See the License for the
# specific language governing permissions and limitations
# under the License.
#

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-mysql}"
TENANTS_DB_NAME="${TENANTS_DB_NAME:-fineract_tenants}"
DEFAULT_DB_NAME="${DEFAULT_DB_NAME:-fineract_default}"

echo "Setting up MySQL database for integration tests..."

# Check if mysql client is available
if ! command -v mysql &> /dev/null; then
    echo "Error: mysql client is not installed or not in PATH"
    exit 1
fi

# Create tenants database if it doesn't exist
echo "Creating tenants database if it doesn't exist..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --password="$DB_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS $TENANTS_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL

if [ $? -ne 0 ]; then
    echo "Error: Failed to create tenants database"
    exit 1
fi

# Create default tenant database if it doesn't exist
echo "Creating default tenant database if it doesn't exist..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --password="$DB_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS $DEFAULT_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL

if [ $? -ne 0 ]; then
    echo "Error: Failed to create default tenant database"
    exit 1
fi

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"

# Initialize schema using Fineract SQL files
echo "Initializing database schema..."

# Set up tenants database
if [ -f "$PROJECT_ROOT/fineract-db/mifospltaform-tenants-first-time-install.sql" ]; then
    echo "Setting up tenants database schema..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --password="$DB_PASSWORD" "$TENANTS_DB_NAME" < "$PROJECT_ROOT/fineract-db/mifospltaform-tenants-first-time-install.sql"
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to initialize tenants database schema"
        exit 1
    fi
else
    echo "Warning: Could not find tenants schema file"
fi

# Add default tenant entry if it doesn't exist
echo "Ensuring default tenant entry exists..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --password="$DB_PASSWORD" "$TENANTS_DB_NAME" <<SQL
INSERT IGNORE INTO tenants (identifier, name, schema_name, schema_server, schema_server_port, schema_username, schema_password, auto_update, schema_connection_parameters)
VALUES ('default', 'Default Tenant', '$DEFAULT_DB_NAME', '$DB_HOST', '$DB_PORT', '$DB_USER', '$DB_PASSWORD', true, null);
SQL

if [ $? -ne 0 ]; then
    echo "Error: Failed to add default tenant entry"
    exit 1
fi

# Load demo data for the default tenant if available
if [ -f "$PROJECT_ROOT/fineract-db/multi-tenant-demo-backups/default-demo/bk_mifostenant-default.sql" ]; then
    echo "Loading demo data for default tenant..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --password="$DB_PASSWORD" "$DEFAULT_DB_NAME" < "$PROJECT_ROOT/fineract-db/multi-tenant-demo-backups/default-demo/bk_mifostenant-default.sql"
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to load demo data for default tenant"
        exit 1
    fi
else
    echo "Warning: Could not find default tenant demo data file"
fi

echo "MySQL database setup completed successfully"
exit 0