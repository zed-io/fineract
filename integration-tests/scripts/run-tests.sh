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

# Default values
DB_TYPE="mysql"
LOG_LEVEL="info"
TESTS_PATH=""
REPORT=true
CATEGORIES=""
TAGS=""
CLEANUP=true
TIMEOUT=300

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --db-type)
      DB_TYPE="$2"
      shift 2
      ;;
    --log-level)
      LOG_LEVEL="$2"
      shift 2
      ;;
    --tests)
      TESTS_PATH="$2"
      shift 2
      ;;
    --no-report)
      REPORT=false
      shift
      ;;
    --categories)
      CATEGORIES="$2"
      shift 2
      ;;
    --tags)
      TAGS="$2"
      shift 2
      ;;
    --no-cleanup)
      CLEANUP=false
      shift
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --db-type <type>     Database type (mysql, postgresql, mariadb) [default: mysql]"
      echo "  --log-level <level>  Logging level (info, debug, warn, error) [default: info]"
      echo "  --tests <path>       Path to specific test or package to run [default: all tests]"
      echo "  --no-report          Don't generate test reports"
      echo "  --categories <list>  Comma-separated list of test categories to run"
      echo "  --tags <list>        Comma-separated list of tags to include"
      echo "  --no-cleanup         Don't clean up test environment after tests"
      echo "  --timeout <seconds>  Test timeout in seconds [default: 300]"
      echo "  --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Configuration
GRADLE_CMD="./gradlew"
TEST_TASK="integration-tests:test"
REPORT_DIR="$PROJECT_ROOT/integration-tests/build/reports"
RESULTS_DIR="$PROJECT_ROOT/integration-tests/build/test-results"

# Create temp environment properties file
TEMP_ENV_PROPS=$(mktemp)
cat <<EOF > "$TEMP_ENV_PROPS"
setup.database=true
database.type=$DB_TYPE
server.timeout.seconds=$TIMEOUT
EOF

# Export environment variables
export FINERACT_TEST_DB_TYPE="$DB_TYPE"
export FINERACT_TEST_LOG_LEVEL="$LOG_LEVEL"

# Build test command
TEST_CMD="$GRADLE_CMD $TEST_TASK"

# Add test filtering if specified
if [ -n "$TESTS_PATH" ]; then
  TEST_CMD="$TEST_CMD --tests $TESTS_PATH"
fi

# Add test categories if specified
if [ -n "$CATEGORIES" ]; then
  CATEGORIES_PROP="-Dcategories=$CATEGORIES"
  TEST_CMD="$TEST_CMD $CATEGORIES_PROP"
fi

# Add tags if specified
if [ -n "$TAGS" ]; then
  TAGS_PROP="-Dtags=$TAGS"
  TEST_CMD="$TEST_CMD $TAGS_PROP"
fi

# Add environment properties
TEST_CMD="$TEST_CMD -Dtest.environment.props=$TEMP_ENV_PROPS"

# Execute the tests
echo "Running tests with command: $TEST_CMD"
$TEST_CMD
TEST_EXIT_CODE=$?

# Generate Allure report if enabled
if [ "$REPORT" = true ]; then
  echo "Generating Allure report..."
  $GRADLE_CMD allureReport
  
  # Open the report if not in CI environment
  if [ -z "$CI" ]; then
    $GRADLE_CMD allureServe
  else
    echo "Allure report generated at: $REPORT_DIR/allure-report"
  fi
fi

# Clean up
if [ "$CLEANUP" = true ]; then
  echo "Cleaning up test environment..."
  # Add your cleanup steps here
fi

# Remove temporary files
rm -f "$TEMP_ENV_PROPS"

# Exit with the test exit code
exit $TEST_EXIT_CODE