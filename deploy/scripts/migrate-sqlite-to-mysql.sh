#!/bin/bash

# SQLite to MySQL Migration Script for NEPSE Portfolio API
# This script helps migrate data from SQLite to MySQL

set -e

echo "🔄 NEPSE API - SQLite to MySQL Migration Script"
echo "================================================"
echo ""

# Check for required tools
command -v sqlite3 >/dev/null 2>&1 || { echo "❌ sqlite3 is required but not installed."; exit 1; }
command -v mysql >/dev/null 2>&1 || { echo "❌ mysql client is required but not installed."; exit 1; }

# Configuration
SQLITE_DB="${1:-nepse.db}"
MYSQL_HOST="${DB_HOST:-localhost}"
MYSQL_PORT="${DB_PORT:-3306}"
MYSQL_USER="${DB_USER:-nepse}"
MYSQL_PASSWORD="${DB_PASSWORD:-nepse_password}"
MYSQL_DATABASE="${DB_NAME:-nepse_db}"

echo "📦 Configuration:"
echo "   SQLite DB: $SQLITE_DB"
echo "   MySQL Host: $MYSQL_HOST:$MYSQL_PORT"
echo "   MySQL Database: $MYSQL_DATABASE"
echo ""

# Check if SQLite database exists
if [ ! -f "$SQLITE_DB" ]; then
    echo "❌ SQLite database not found: $SQLITE_DB"
    echo "Usage: $0 [path/to/nepse.db]"
    exit 1
fi

# Function to run MySQL commands
run_mysql() {
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "$1"
}

# Test MySQL connection
echo "🔍 Testing MySQL connection..."
if run_mysql "SELECT 1" >/dev/null 2>&1; then
    echo "✅ MySQL connection successful"
else
    echo "❌ Failed to connect to MySQL"
    echo "Please ensure MySQL is running and credentials are correct."
    echo ""
    echo "Environment variables to set:"
    echo "  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

# Count records in SQLite
STOCK_COUNT=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM stock_prices;" 2>/dev/null || echo "0")
COMPANY_COUNT=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM company_details;" 2>/dev/null || echo "0")
INDEX_COUNT=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM market_index;" 2>/dev/null || echo "0")

echo ""
echo "📊 SQLite data summary:"
echo "   Stock prices: $STOCK_COUNT records"
echo "   Company details: $COMPANY_COUNT records"
echo "   Market index: $INDEX_COUNT records"
echo ""

read -p "⚠️ This will migrate data to MySQL. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🚀 Starting migration..."

# Export and import stock_prices
echo "📊 Migrating stock_prices..."
sqlite3 -header -csv "$SQLITE_DB" "SELECT 
    business_date, security_id, symbol, security_name,
    open_price, high_price, low_price, close_price,
    total_traded_quantity, total_traded_value, previous_close,
    change, percentage_change, last_traded_price,
    fifty_two_week_high, fifty_two_week_low, created_at
FROM stock_prices;" > /tmp/stock_prices.csv

if [ -s /tmp/stock_prices.csv ]; then
    run_mysql "LOAD DATA LOCAL INFILE '/tmp/stock_prices.csv'
    INTO TABLE stock_prices
    FIELDS TERMINATED BY ',' 
    ENCLOSED BY '\"'
    LINES TERMINATED BY '\n'
    IGNORE 1 ROWS
    (business_date, security_id, symbol, security_name,
     open_price, high_price, low_price, close_price,
     total_traded_quantity, total_traded_value, previous_close,
     \`change\`, percentage_change, last_traded_price,
     fifty_two_week_high, fifty_two_week_low, created_at);"
    echo "✅ Stock prices migrated"
else
    echo "⚠️ No stock prices to migrate"
fi

# Export and import company_details
echo "🏢 Migrating company_details..."
sqlite3 -header -csv "$SQLITE_DB" "SELECT 
    security_id, symbol, company_name, sector_name,
    instrument_type, issue_manager, share_registrar,
    listing_date, total_listed_shares, paid_up_capital,
    total_paid_up_value, email, website, status, permitted_to_trade,
    promoter_shares, public_shares, market_capitalization,
    logo_url, is_logo_placeholder, last_traded_price,
    open_price, close_price, high_price, low_price, previous_close,
    fifty_two_week_high, fifty_two_week_low, total_traded_quantity,
    total_trades, average_traded_price, updated_at
FROM company_details;" > /tmp/company_details.csv

if [ -s /tmp/company_details.csv ]; then
    run_mysql "LOAD DATA LOCAL INFILE '/tmp/company_details.csv'
    INTO TABLE company_details
    FIELDS TERMINATED BY ',' 
    ENCLOSED BY '\"'
    LINES TERMINATED BY '\n'
    IGNORE 1 ROWS
    (security_id, symbol, company_name, sector_name,
     instrument_type, issue_manager, share_registrar,
     listing_date, total_listed_shares, paid_up_capital,
     total_paid_up_value, email, website, status, permitted_to_trade,
     promoter_shares, public_shares, market_capitalization,
     logo_url, is_logo_placeholder, last_traded_price,
     open_price, close_price, high_price, low_price, previous_close,
     fifty_two_week_high, fifty_two_week_low, total_traded_quantity,
     total_trades, average_traded_price, updated_at);"
    echo "✅ Company details migrated"
else
    echo "⚠️ No company details to migrate"
fi

# Export and import market_index
echo "📈 Migrating market_index..."
sqlite3 -header -csv "$SQLITE_DB" "SELECT 
    trading_date, market_status_date, market_status_time,
    nepse_index, index_change, index_percentage_change,
    total_turnover, total_traded_shares, advanced, declined, unchanged, last_updated
FROM market_index;" > /tmp/market_index.csv

if [ -s /tmp/market_index.csv ]; then
    run_mysql "LOAD DATA LOCAL INFILE '/tmp/market_index.csv'
    INTO TABLE market_index
    FIELDS TERMINATED BY ',' 
    ENCLOSED BY '\"'
    LINES TERMINATED BY '\n'
    IGNORE 1 ROWS
    (trading_date, market_status_date, market_status_time,
     nepse_index, index_change, index_percentage_change,
     total_turnover, total_traded_shares, advanced, declined, unchanged, last_updated);"
    echo "✅ Market index migrated"
else
    echo "⚠️ No market index data to migrate"
fi

# Cleanup
rm -f /tmp/stock_prices.csv /tmp/company_details.csv /tmp/market_index.csv

# Verify migration
echo ""
echo "🔍 Verifying migration..."
MYSQL_STOCK=$(run_mysql "SELECT COUNT(*) FROM stock_prices;" 2>/dev/null | tail -1)
MYSQL_COMPANY=$(run_mysql "SELECT COUNT(*) FROM company_details;" 2>/dev/null | tail -1)
MYSQL_INDEX=$(run_mysql "SELECT COUNT(*) FROM market_index;" 2>/dev/null | tail -1)

echo ""
echo "📊 Migration results:"
echo "   Stock prices: $STOCK_COUNT (SQLite) → $MYSQL_STOCK (MySQL)"
echo "   Company details: $COMPANY_COUNT (SQLite) → $MYSQL_COMPANY (MySQL)"
echo "   Market index: $INDEX_COUNT (SQLite) → $MYSQL_INDEX (MySQL)"
echo ""
echo "✅ Migration completed!"
echo ""
echo "⚠️ Next steps:"
echo "   1. Update your .env file with MySQL credentials"
echo "   2. Restart the application: pm2 restart all"
echo "   3. Verify the API is working: curl http://localhost:3000/health"
echo "   4. Once verified, you can safely remove the old SQLite database"
