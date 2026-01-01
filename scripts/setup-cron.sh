#!/bin/bash
# Setup cron job to call the /api/cron endpoint every hour
# Run this script once on your VPS after first deployment

CRON_JOB="0 * * * * curl -s https://pricewise.mohamedaleya.dev/api/cron?key=${CRON_SECRET} > /dev/null"

# Remove existing pricewise cron entries and add new one
(crontab -l 2>/dev/null | grep -v "/api/cron"; echo "$CRON_JOB") | crontab -

echo "Cron job installed. Verifying..."
crontab -l | grep "/api/cron"
echo "Done! The scraper will run every hour."
