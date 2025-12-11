const { db, savePrices, saveCompanyDetails } = require('./database');

// Wrapper functions for database operations
function insertTodayPrices(prices) {
  return savePrices(prices);
}

function insertCompanyDetails(details) {
  return saveCompanyDetails(details);
}

function getAllSecurityIds() {
  return new Promise((resolve, reject) => {
    db.all("SELECT DISTINCT security_id, symbol FROM stock_prices WHERE security_id > 0", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getSecurityIdsWithoutDetails() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT DISTINCT sp.security_id, sp.symbol 
      FROM stock_prices sp
      LEFT JOIN company_details cd ON sp.symbol = cd.symbol
      WHERE sp.security_id > 0 AND cd.symbol IS NULL
      ORDER BY sp.symbol
    `;

    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function searchStocks(query) {
  return new Promise((resolve, reject) => {
    const pattern = `%${query}%`;
    db.all(
      `SELECT DISTINCT symbol, security_name, security_id FROM stock_prices 
       WHERE symbol LIKE ? OR security_name LIKE ? 
       ORDER BY symbol LIMIT 20`,
      [pattern, pattern],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getScriptDetails(symbol) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        cd.*,
        sp.business_date
      FROM company_details cd
      LEFT JOIN stock_prices sp ON cd.symbol = sp.symbol
      WHERE cd.symbol = ?
    `;

    db.get(sql, [symbol], (err, row) => {
      if (err) reject(err);
      else if (row) {
        resolve(row);
      } else {
        db.get("SELECT * FROM stock_prices WHERE symbol = ?", [symbol], (err, priceRow) => {
          if (err) reject(err);
          else resolve(priceRow);
        });
      }
    });
  });
}

function getLatestPrices(symbols, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      limit = 100,
      offset = 0,
      sortBy = 'symbol',
      order = 'ASC',
      filter = null
    } = options;

    // If symbols array is provided, use the original logic
    if (symbols && Array.isArray(symbols) && symbols.length > 0) {
      const placeholders = symbols.map(() => '?').join(',');
      const sql = `
        SELECT sp.*, cd.company_name, cd.sector_name 
        FROM stock_prices sp
        LEFT JOIN company_details cd ON sp.symbol = cd.symbol
        WHERE sp.symbol IN (${placeholders})
        ORDER BY sp.symbol
      `;

      db.all(sql, symbols, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
      return;
    }

    // Enhanced query for getting all latest prices with options
    let sql = `
      SELECT 
        sp.*,
        cd.company_name,
        cd.sector_name,
        cd.market_capitalization as company_market_cap
      FROM stock_prices sp
      LEFT JOIN company_details cd ON sp.symbol = cd.symbol
      WHERE sp.business_date = (
        SELECT MAX(business_date) FROM stock_prices sp2 WHERE sp2.symbol = sp.symbol
      )
    `;

    // Add filter conditions
    if (filter === 'gainers') {
      sql += ' AND sp.change > 0';
    } else if (filter === 'losers') {
      sql += ' AND sp.change < 0';
    }

    // Add sorting
    const allowedSortColumns = ['symbol', 'close_price', 'change', 'percentage_change', 'volume', 'turnover', 'market_capitalization'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'symbol';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    sql += ` ORDER BY sp.${sortColumn} ${sortOrder}`;

    // Add pagination
    sql += ` LIMIT ? OFFSET ?`;

    db.all(sql, [limit, offset], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAllCompanies(limit = 100, offset = 0) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM company_details 
      ORDER BY company_name 
      LIMIT ? OFFSET ?
    `;

    db.all(sql, [limit, offset], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getCompaniesBySector(sector, limit = 50) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM company_details 
      WHERE sector_name LIKE ?
      ORDER BY market_capitalization DESC NULLS LAST, company_name
      LIMIT ?
    `;

    db.all(sql, [`%${sector}%`, limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getTopCompaniesByMarketCap(limit = 20) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM company_details 
      WHERE market_capitalization IS NOT NULL AND market_capitalization > 0
      ORDER BY market_capitalization DESC
      LIMIT ?
    `;

    db.all(sql, [limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getCompanyStats() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        COUNT(*) as total_companies,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_companies,
        COUNT(CASE WHEN logo_url IS NOT NULL AND is_logo_placeholder = 0 THEN 1 END) as companies_with_real_logos,
        COUNT(DISTINCT sector_name) as total_sectors,
        SUM(market_capitalization) as total_market_cap,
        AVG(market_capitalization) as avg_market_cap,
        MAX(market_capitalization) as max_market_cap
      FROM company_details
    `;

    db.get(sql, [], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Market status functions
function insertMarketStatus(status, tradingDate, openTime = null, closeTime = null, additionalInfo = null) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO market_status (
        status, trading_date, market_open_time, market_close_time, 
        is_trading_day, additional_info, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const isTradingDay = status !== 'CLOSED' || (openTime && closeTime) ? 1 : 0;

    db.run(sql, [status, tradingDate, openTime, closeTime, isTradingDay, additionalInfo], function (err) {
      if (err) {
        console.error('Error inserting market status:', err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function getCurrentMarketStatus() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM market_status 
      WHERE trading_date = date('now', '+5:45 hours') 
      ORDER BY last_updated DESC 
      LIMIT 1
    `;

    db.get(sql, [], (err, row) => {
      if (err) {
        console.error('Error getting current market status:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function getMarketStatusHistory(days = 7) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        trading_date,
        status,
        market_open_time,
        market_close_time,
        is_trading_day,
        last_updated,
        additional_info
      FROM market_status 
      WHERE trading_date >= date('now', '+5:45 hours', '-' || ? || ' days')
      ORDER BY trading_date DESC, last_updated DESC
    `;

    db.all(sql, [days], (err, rows) => {
      if (err) {
        console.error('Error getting market status history:', err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

// Market status functions
function updateMarketStatus(isOpen) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const nepaliDate = new Date(now.getTime() + (5.75 * 60 * 60 * 1000));
    const tradingDate = nepaliDate.toISOString().split('T')[0];

    const sql = `
      INSERT OR REPLACE INTO market_status (id, is_open, trading_date, last_updated)
      VALUES (
        1, ?, ?, CURRENT_TIMESTAMP
      )
    `;

    db.run(sql, [isOpen ? 1 : 0, tradingDate], function (err) {
      if (err) {
        console.error('Error updating market status:', err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function getCurrentMarketStatus() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT is_open, last_updated, trading_date FROM market_status WHERE id = 1`;

    db.get(sql, [], (err, row) => {
      if (err) {
        console.error('Error getting current market status:', err);
        reject(err);
      } else {
        resolve(row ? {
          isOpen: Boolean(row.is_open),
          lastUpdated: row.last_updated,
          tradingDate: row.trading_date
        } : null);
      }
    });
  });
}

// Market index functions
function saveMarketIndex(indexData) {
  return new Promise((resolve, reject) => {
    const {
      nepseIndex,
      indexChange,
      indexPercentageChange,
      totalTurnover,
      totalTradedShares,
      advanced,
      declined,
      unchanged,
      tradingDate = null
    } = indexData;

    // Get today's date in Nepal timezone if not provided
    const date = tradingDate || (() => {
      const now = new Date();
      const nepaliDate = new Date(now.getTime() + (5.75 * 60 * 60 * 1000));
      return nepaliDate.toISOString().split('T')[0];
    })();

    const sql = `
      INSERT OR REPLACE INTO market_index (
        trading_date, nepse_index, index_change, index_percentage_change,
        total_turnover, total_traded_shares, advanced, declined, unchanged,
        last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    db.run(
      sql,
      [date, nepseIndex, indexChange, indexPercentageChange, totalTurnover, totalTradedShares, advanced, declined, unchanged],
      function (err) {
        if (err) {
          console.error('Error saving market index:', err);
          reject(err);
        } else {
          console.log('✅ Market index saved successfully');
          resolve(this.lastID);
        }
      }
    );
  });
}

function getMarketIndexData(tradingDate = null) {
  return new Promise((resolve, reject) => {
    // Get today's date in Nepal timezone if not provided
    const date = tradingDate || (() => {
      const now = new Date();
      const nepaliDate = new Date(now.getTime() + (5.75 * 60 * 60 * 1000));
      return nepaliDate.toISOString().split('T')[0];
    })();

    const sql = `
      SELECT 
        nepse_index,
        index_change,
        index_percentage_change,
        total_turnover,
        total_traded_shares,
        advanced,
        declined,
        unchanged,
        trading_date,
        last_updated
      FROM market_index 
      WHERE trading_date = ?
      ORDER BY last_updated DESC
      LIMIT 1
    `;

    db.get(sql, [date], (err, row) => {
      if (err) {
        console.error('Error getting market index data:', err);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

function getMarketIndexHistory(days = 7) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        nepse_index,
        index_change,
        index_percentage_change,
        total_turnover,
        total_traded_shares,
        advanced,
        declined,
        unchanged,
        trading_date,
        last_updated
      FROM market_index 
      WHERE trading_date >= date('now', '+5:45 hours', '-' || ? || ' days')
      ORDER BY trading_date DESC, last_updated DESC
    `;

    db.all(sql, [days], (err, rows) => {
      if (err) {
        console.error('Error getting market index history:', err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

module.exports = {
  searchStocks,
  getScriptDetails,
  getLatestPrices,
  getAllCompanies,
  getCompaniesBySector,
  getTopCompaniesByMarketCap,
  getCompanyStats,
  getAllSecurityIds,
  getSecurityIdsWithoutDetails,
  insertTodayPrices,
  insertCompanyDetails,
  updateMarketStatus,
  getCurrentMarketStatus,
  saveMarketIndex,
  getMarketIndexData,
  getMarketIndexHistory
};