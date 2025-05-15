#!/bin/bash
# Script to manually run the recurring deposit installment tracking job
# This is useful for testing or running outside the regular schedule

# Default values
APPLY_PENALTIES=true
SEND_NOTIFICATIONS=true
TEST_MODE=false
AS_OF_DATE=$(date +%Y-%m-%d)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --no-penalties)
      APPLY_PENALTIES=false
      shift
      ;;
    --no-notifications)
      SEND_NOTIFICATIONS=false
      shift
      ;;
    --test-mode)
      TEST_MODE=true
      shift
      ;;
    --date)
      AS_OF_DATE="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --no-penalties       Disable penalty application"
      echo "  --no-notifications   Disable sending notifications"
      echo "  --test-mode          Run in test mode (no actual penalties or notifications)"
      echo "  --date YYYY-MM-DD    Specify a date (default: today)"
      echo "  --help               Display this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Base URL of the scheduled jobs service
JOBS_SERVICE_URL="${JOBS_SERVICE_URL:-http://localhost:3100}"

# Find the job ID
echo "Finding recurring deposit installment tracking job..."
JOB_ID=$(curl -s "${JOBS_SERVICE_URL}/api/jobs" | grep -o '"name":"Recurring Deposit Installment Tracking","description".*?"id":"[^"]*"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "Error: Could not find the job."
  exit 1
fi

echo "Found job with ID: $JOB_ID"

# Execute the job with specified parameters
echo "Executing job with the following parameters:"
echo "  Apply penalties: $APPLY_PENALTIES"
echo "  Send notifications: $SEND_NOTIFICATIONS"
echo "  Test mode: $TEST_MODE"
echo "  As of date: $AS_OF_DATE"

curl -s -X POST "${JOBS_SERVICE_URL}/api/jobs/execute/${JOB_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"parameters\": {
      \"applyPenalties\": ${APPLY_PENALTIES},
      \"sendNotifications\": ${SEND_NOTIFICATIONS},
      \"testMode\": ${TEST_MODE},
      \"asOfDate\": \"${AS_OF_DATE}\"
    }
  }" | jq .

echo "Job execution request sent."
echo "Check the logs for results."