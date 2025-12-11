const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../nepse.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initSchema();
  }
});

function initSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS stock_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_date TEXT NOT NULL,
        security_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        security_name TEXT,
        open_price REAL,
        high_price REAL,
        low_price REAL,
        close_price REAL,
        total_traded_quantity INTEGER,
        total_traded_value REAL,
        previous_close REAL,
        change REAL,
        percentage_change REAL,
        last_traded_price REAL,
        fifty_two_week_high REAL,
        fifty_two_week_low REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol)
    );
    CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices(symbol);

    CREATE TABLE IF NOT EXISTS company_details (
        security_id INTEGER PRIMARY KEY, 
        symbol TEXT NOT NULL,
        company_name TEXT,
        sector_name TEXT,
        instrument_type TEXT,
        issue_manager TEXT,
        share_registrar TEXT,
        listing_date TEXT,
        total_listed_shares REAL,
        paid_up_capital REAL,
        total_paid_up_value REAL,
        email TEXT,
        website TEXT,
        status TEXT,
        permitted_to_trade TEXT,
        promoter_shares REAL,
        public_shares REAL,
        market_capitalization REAL,
        logo_url TEXT,
        is_logo_placeholder BOOLEAN DEFAULT 1,
        last_traded_price REAL,
        open_price REAL,
        close_price REAL,
        high_price REAL,
        low_price REAL,
        previous_close REAL,
        fifty_two_week_high REAL,
        fifty_two_week_low REAL,
        total_traded_quantity INTEGER,
        total_trades INTEGER,
        average_traded_price REAL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_company_details_symbol ON company_details(symbol);

    CREATE TABLE IF NOT EXISTS market_status (
        id INTEGER PRIMARY KEY,
        is_open BOOLEAN DEFAULT 0,
        trading_date TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_market_status_date ON market_status(trading_date);

    CREATE TABLE IF NOT EXISTS market_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trading_date TEXT NOT NULL,
        market_status_date TEXT,
        market_status_time TEXT,
        nepse_index REAL,
        index_change REAL,
        index_percentage_change REAL,
        total_turnover REAL,
        total_traded_shares INTEGER,
        advanced INTEGER,
        declined INTEGER,
        unchanged INTEGER,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(trading_date)
    );
    CREATE INDEX IF NOT EXISTS idx_market_index_date ON market_index(trading_date);
    `;

  db.exec(schema, (err) => {
    if (err) {
      console.error('Failed to create schema:', err.message);
    } else {
      console.log('Schema initialized successfully.');
    }
  });
}

function savePrices(prices) {
  if (!prices || prices.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO stock_prices (
        business_date, security_id, symbol, security_name,
        open_price, high_price, low_price, close_price,
        total_traded_quantity, total_traded_value, previous_close,
        change, percentage_change, last_traded_price,
        fifty_two_week_high, fifty_two_week_low, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      prices.forEach(p => {
        stmt.run(
          p.businessDate, p.securityId, p.symbol, p.securityName,
          p.openPrice, p.highPrice, p.lowPrice, p.closePrice,
          p.totalTradedQuantity, p.totalTradedValue, p.previousClose,
          p.change, p.percentageChange, p.lastTradedPrice,
          p.fiftyTwoWeekHigh, p.fiftyTwoWeekLow
        );
      });

      db.run("COMMIT", (err) => {
        stmt.finalize();
        if (err) reject(err);
        else {
          console.log(`Saved ${prices.length} price records.`);
          resolve();
        }
      });
    });
  });
}

function saveCompanyDetails(detailsArray) {
  if (!detailsArray || detailsArray.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO company_details (
        security_id, symbol, company_name, sector_name, 
        instrument_type, issue_manager, share_registrar, 
        listing_date, total_listed_shares, paid_up_capital, 
        total_paid_up_value, email, website, status, permitted_to_trade,
        promoter_shares, public_shares, market_capitalization,
        logo_url, is_logo_placeholder, last_traded_price,
        open_price, close_price, high_price, low_price, previous_close,
        fifty_two_week_high, fifty_two_week_low, total_traded_quantity,
        total_trades, average_traded_price, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      detailsArray.forEach(d => {
        stmt.run(
          d.securityId, d.symbol, d.companyName, d.sectorName,
          d.instrumentType, d.issueManager, d.shareRegistrar,
          d.listingDate, d.totalListedShares, d.paidUpCapital,
          d.totalPaidUpValue || null, d.email, d.website, d.status || null, d.permittedToTrade || null,
          d.promoterShares || null, d.publicShares || null, d.marketCapitalization || null,
          d.logoUrl || null, d.isLogoPlaceholder ? 1 : 0, d.lastTradedPrice || null,
          d.openPrice || null, d.closePrice || null, d.highPrice || null, d.lowPrice || null, d.previousClose || null,
          d.fiftyTwoWeekHigh || null, d.fiftyTwoWeekLow || null, d.totalTradedQuantity || null,
          d.totalTrades || null, d.averageTradedPrice || null
        );
      });

      db.run("COMMIT", (err) => {
        stmt.finalize();
        if (err) reject(err);
        else {
          console.log(`Saved/Updated ${detailsArray.length} company details.`);
          resolve();
        }
      });
    });
  });
}

module.exports = {
  db,
  savePrices,
  saveCompanyDetails
};