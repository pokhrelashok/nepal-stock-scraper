const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {
  searchStocks,
  getScriptDetails,
  getLatestPrices,
  getAllCompanies,
  getCompaniesBySector,
  getTopCompaniesByMarketCap,
  getCompanyStats
} = require('./database/queries');
const { formatResponse, formatError } = require('./utils/formatter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) {
      return res.status(400).json(formatError("Query 'q' must be at least 2 chars", 400));
    }
    const results = await searchStocks(query);
    res.json(formatResponse(results));
  } catch (e) {
    console.error('API Search Error:', e);
    res.status(500).json(formatError("Internal Server Error"));
  }
});

app.get('/api/scripts/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const details = await getScriptDetails(symbol);

    if (!details) {
      return res.status(404).json(formatError(`Script '${symbol}' not found`, 404));
    }
    res.json(formatResponse(details));
  } catch (e) {
    console.error('API Detail Error:', e);
    res.status(500).json(formatError("Internal Server Error"));
  }
});

app.get('/api/scripts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    if (limit > 1000) {
      return res.status(400).json(formatError("Limit cannot exceed 1000", 400));
    }

    const companies = await getAllCompanies(limit, offset);
    res.json(formatResponse(companies));
  } catch (e) {
    console.error('API Scripts Error:', e);
    res.status(500).json(formatError("Internal Server Error"));
  }
});

app.post('/api/prices', async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json(formatError("Invalid body. Expected { symbols: ['SYM', ...] }", 400));
    }

    const data = await getLatestPrices(symbols);
    res.json(formatResponse(data));
  } catch (e) {
    console.error('API Prices Error:', e);
    res.status(500).json(formatError("Internal Server Error"));
  }
});

app.get('/api/companies', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    if (limit > 1000) {
      return res.status(400).json(formatError("Limit cannot exceed 1000", 400));
    }

    const companies = await getAllCompanies(limit, offset);
    res.json(formatResponse(companies));
  } catch (e) {
    console.error('API Companies Error:', e);
    res.status(500).json(formatError("Internal Server Error"));
  }
});

app.get('/api/companies/sector/:sector', async (req, res) => {
  try {
    const sector = req.params.sector;
    const limit = parseInt(req.query.limit) || 50;

    const companies = await getCompaniesBySector(sector, limit);
    res.json(formatResponse(companies));
  } catch (e) {
    console.error('API Sector Error:', e);
    res.status(500).json(formatError("Internal Server Error"));
  }
});

app.get('/api/companies/top/:limit', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 20;
    const companies = await getTopCompaniesByMarketCap(limit);
    res.json(formatResponse(companies));
  } catch (e) {
    console.error('API Top Companies Error:', e);
    res.status(500).json(formatError("Internal Server Error"));
  }
});

app.get('/api/market/stats', async (req, res) => {
  try {
    const stats = await getCompanyStats();
    res.json(formatResponse(stats));
  } catch (e) {
    console.error('API Stats Error:', e);
    res.status(500).json(formatError("Internal Server Error"));
  }
});

app.get('/api', (req, res) => {
  const endpoints = [
    { method: 'GET', path: '/api/search?q=QUERY', description: 'Search for stocks by symbol or name' },
    { method: 'GET', path: '/api/scripts', description: 'Get all scripts/companies with pagination' },
    { method: 'GET', path: '/api/scripts/SYMBOL', description: 'Get detailed information for a specific stock' },
    { method: 'POST', path: '/api/prices', description: 'Get latest prices for multiple symbols', body: '{ "symbols": ["NABIL", "SHIVM"] }' },
    { method: 'GET', path: '/api/companies?limit=100&offset=0', description: 'Get paginated list of all companies' },
    { method: 'GET', path: '/api/companies/sector/SECTOR_NAME?limit=50', description: 'Get companies by sector' },
    { method: 'GET', path: '/api/companies/top/20', description: 'Get top companies by market capitalization' },
    { method: 'GET', path: '/api/market/stats', description: 'Get market statistics and summary' }
  ];

  res.json(formatResponse({
    title: 'NEPSE Portfolio API',
    version: '2.0.0',
    description: 'Enhanced API with comprehensive company data including logos, financial metrics, and market statistics',
    endpoints
  }));
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});

module.exports = app;