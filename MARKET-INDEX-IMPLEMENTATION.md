# Market Index Data Implementation Summary

## Overview

Successfully implemented comprehensive market index data scraping and API integration for the NEPSE Portfolio API. The implementation now captures and serves detailed market information including the NEPSE Index value, changes, turnover, traded shares, and stock movement statistics.

## Changes Made

### 1. Database Schema Extension (`src/database/database.js`)

Added a new `market_index` table to store market index data:

- `id` - Auto-incrementing primary key
- `trading_date` - Date of trading (unique per day)
- `nepse_index` - Current NEPSE Index value
- `index_change` - Point change from previous close
- `index_percentage_change` - Percentage change from previous close
- `total_turnover` - Total market turnover in Rs
- `total_traded_shares` - Total shares traded
- `advanced` - Number of stocks that advanced
- `declined` - Number of stocks that declined
- `unchanged` - Number of stocks with no change
- `last_updated` - Timestamp of last update

### 2. Market Index Scraper (`src/scrapers/nepse-scraper.js`)

Added new method: `scrapeMarketIndex()`

- Navigates to the NEPSE homepage
- Extracts market index information using multiple selector patterns
- Parses the following data:
  - NEPSE Index value (primary and fallback patterns)
  - Index change (point change)
  - Percentage change
  - Total Turnover (Rs)
  - Total Traded Shares
  - Advanced/Declined/Unchanged stock counts
- Includes robust error handling and logging

**Key Features:**

- Multiple selector patterns for resilience
- Fallback text parsing if DOM selectors fail
- Comprehensive logging for debugging
- Proper number parsing with comma removal

### 3. Database Query Functions (`src/database/queries.js`)

Added three new functions:

#### `saveMarketIndex(indexData)`

- Saves market index data to the database
- Handles date conversion for Nepal timezone
- Uses INSERT OR REPLACE for idempotency
- Parameters:
  - `nepseIndex` - Index value
  - `indexChange` - Point change
  - `indexPercentageChange` - Percentage change
  - `totalTurnover` - Total turnover amount
  - `totalTradedShares` - Shares traded
  - `advanced` - Advanced stocks count
  - `declined` - Declined stocks count
  - `unchanged` - Unchanged stocks count
  - `tradingDate` (optional) - Specific trading date

#### `getMarketIndexData(tradingDate)`

- Retrieves current day's market index data
- Returns formatted data with snake_case field names
- Handles Nepal timezone automatically

#### `getMarketIndexHistory(days)`

- Retrieves historical market index data
- Default: last 7 days
- Useful for trend analysis

### 4. API Endpoint Update (`src/server.js`)

Enhanced `/api/market/status` endpoint:

- Now includes market index data in the response
- Supports refresh parameter for live data
- Returns:

```json
{
  "isOpen": true,
  "status": "OPEN",
  "marketIndex": {
    "nepseIndex": 2609.03,
    "change": -5.03,
    "percentageChange": -0.19,
    "totalTurnover": 3738772373.24,
    "totalTradedShares": 8647948,
    "advanced": 80,
    "declined": 169,
    "unchanged": 9
  },
  "source": "LIVE_SCRAPER|DATABASE_CACHE",
  "lastUpdated": "2024-12-10T15:00:00Z",
  "tradingDate": "2024-12-10"
}
```

### 5. Scheduler Integration (`src/scheduler.js`)

Updated the price update scheduler to:

- Call `scrapeMarketIndex()` alongside status and price updates
- Save index data to database via `saveMarketIndex()`
- Run during market hours (10 AM - 3 PM) and post-close
- Handle errors gracefully without stopping other updates

**Update Flow:**

```
✓ Scrape market status
✓ Save market status
✓ Scrape market index (NEW)
✓ Save market index (NEW)
✓ If market open:
  - Scrape today's prices
  - Save prices to DB
```

## API Response Examples

### Example 1: Live Data (with refresh parameter)

```bash
GET /api/market/status?refresh=true
```

```json
{
  "success": true,
  "data": {
    "isOpen": true,
    "status": "OPEN",
    "marketIndex": {
      "nepseIndex": 2609.03,
      "change": -5.03,
      "percentageChange": -0.19,
      "totalTurnover": 3738772373.24,
      "totalTradedShares": 8647948,
      "advanced": 80,
      "declined": 169,
      "unchanged": 9
    },
    "source": "LIVE_SCRAPER",
    "lastUpdated": "2024-12-10T15:00:00Z"
  }
}
```

### Example 2: Cached Data (default)

```bash
GET /api/market/status
```

```json
{
  "success": true,
  "data": {
    "isOpen": false,
    "status": "CLOSED",
    "marketIndex": {
      "nepseIndex": 2609.03,
      "change": -5.03,
      "percentageChange": -0.19,
      "totalTurnover": 3738772373.24,
      "totalTradedShares": 8647948,
      "advanced": 80,
      "declined": 169,
      "unchanged": 9
    },
    "source": "DATABASE_CACHE",
    "lastUpdated": "2024-12-10T15:00:00Z",
    "tradingDate": "2024-12-10"
  }
}
```

## Data Flow

```
Homepage ↓
NEPSE Website
    ↓ (scrapeMarketIndex)
NepseScraper
    ↓ (saveMarketIndex)
market_index table (SQLite)
    ↓ (getMarketIndexData)
/api/market/status endpoint
    ↓
API Response
```

## Testing

A test script has been created: `test-market-index.js`

**Run the test:**

```bash
node test-market-index.js
```

**Test Steps:**

1. Scrapes market index from the homepage
2. Validates scraped data
3. Saves data to database
4. Retrieves data from database
5. Verifies data integrity

## Usage Examples

### Get Current Market Status with Index

```bash
curl http://localhost:3000/api/market/status
```

### Force Refresh from Homepage

```bash
curl http://localhost:3000/api/market/status?refresh=true
```

### Check Market Index in Summary

The market index data will automatically be included in:

```bash
curl http://localhost:3000/api/market/summary
```

## Benefits

1. **Comprehensive Market Data** - Now provides complete market overview
2. **Better Analytics** - Track market trends with advanced/declined/unchanged data
3. **Turnover Tracking** - Monitor market activity through turnover metrics
4. **Automatic Updates** - Scheduler keeps data fresh during market hours
5. **Flexible API** - Cache with live refresh option

## Error Handling

- Multiple selector patterns for resilience
- Fallback text parsing if DOM selection fails
- Graceful error handling in scheduler (doesn't block other updates)
- Comprehensive logging for debugging
- Validation of scraped values

## Future Enhancements

1. Historical trend analysis endpoint
2. Market index alerts based on thresholds
3. Intraday index movement tracking
4. Market index predictions
5. Export market index data (CSV, JSON)

## Dependencies

No new packages were added. The implementation uses:

- `puppeteer` - for web scraping (already in use)
- `sqlite3` - for database (already in use)
- `luxon` - for timezone handling (already in use)

## Backward Compatibility

All changes are backward compatible:

- Existing endpoints work as before
- Market index data is optional in API responses
- No changes to existing database tables
- No changes to existing scraper methods (only additions)
