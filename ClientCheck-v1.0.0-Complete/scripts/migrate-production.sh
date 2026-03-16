#!/bin/bash

# ClientCheck Production Database Migration Script
# This script sets up the MySQL database and runs all migrations

set -e

echo "🚀 ClientCheck Production Migration Script"
echo "=========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo ""
    echo "Set it with:"
    echo "  export DATABASE_URL='mysql://user:password@host:port/database'"
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install

echo "🔧 Step 2: Generating migration files..."
npm run db:generate

echo "📊 Step 3: Applying migrations to database..."
npm run db:migrate

echo "✅ Step 4: Validating schema..."
mysql -u clientcheck -pclientcheck clientcheck -e "
SELECT 
    TABLE_NAME,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'clientcheck' AND TABLE_NAME = t.TABLE_NAME) as COLUMN_COUNT
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_SCHEMA = 'clientcheck'
ORDER BY TABLE_NAME;
"

echo ""
echo "✅ Migration Complete!"
echo ""
echo "📋 Summary:"
echo "  - Database: clientcheck"
echo "  - User: clientcheck"
echo "  - Tables created: $(mysql -u clientcheck -pclientcheck clientcheck -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'clientcheck';" | tail -1)"
echo ""
echo "🔐 Next Steps:"
echo "  1. Backup the database: mysqldump -u clientcheck -pclientcheck clientcheck > backup.sql"
echo "  2. Start the backend: npm run dev:server"
echo "  3. Run tests: npm test"
echo "  4. Deploy to production"
