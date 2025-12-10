# NEPSE Portfolio API

A comprehensive Node.js API for scraping and serving Nepal Stock Exchange (NEPSE) data, including real-time stock prices, company details, logos, and market analytics.

## Features

- **Real-time Stock Data**: Scrape daily stock prices from NEPSE
- **Company Details**: Extract comprehensive company information including logos, financial metrics, and trading data  
- **Market Analytics**: Statistics, sector analysis, and top performers
- **RESTful API**: Clean endpoints for accessing all data
- **Automated Scheduling**: Cron-based scraping during market hours
- **Database Storage**: SQLite database with 30+ fields per company

## Quick Start

```bash
# Install dependencies
npm install

# Start the API server
npm start

# Run scraper manually
npm run scraper

# Run tests
npm test
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scripts` | Get all companies with pagination |
| GET | `/api/scripts/SYMBOL` | Get detailed company information |
| GET | `/api/companies/sector/SECTOR` | Filter companies by sector |
| GET | `/api/companies/top/N` | Top N companies by market cap |
| GET | `/api/market/stats` | Market statistics and insights |
| GET | `/api/search?q=QUERY` | Search stocks by symbol or name |
| POST | `/api/prices` | Get latest prices for multiple symbols |

## Scripts

```bash
# Development
npm run dev              # Start server with nodemon
npm run scheduler        # Start automated scraper

# Data Collection  
npm run scraper          # Force run price scraper
npm run scraper:details  # Scrape company details

# Testing
npm run test:scraper     # Test scraper functionality
npm run test:api         # Test API endpoints

# Maintenance
npm run clean           # Remove database and temp files
```

## Project Structure

```
src/
├── database/
│   ├── database.js      # Database connection and core operations
│   └── queries.js       # Database query functions
├── scrapers/
│   └── nepse-scraper.js # Web scraping logic
├── utils/
│   └── formatter.js     # Response formatting utilities
├── index.js             # Scheduler and automation
└── server.js            # Express API server

tests/
├── scraper.test.js      # Scraper functionality tests
└── api.test.js          # API endpoint tests

nepse.js                 # Main CLI entry point
package.json
README.md
```

## Requirements

- Node.js >= 16.0.0
- SQLite3
- Chrome/Chromium (for Puppeteer)
