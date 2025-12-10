const cron = require('node-cron');
const { fetchTodaysPrices, scrapeMarketStatus, scrapeAllCompanyDetails } = require('./scrapers/nepse-scraper');
const { savePrices, saveCompanyDetails } = require('./database/database');
const { getAllSecurityIds } = require('./database/queries');

const FORCE_RUN = process.argv.includes('--force');
const SCRAPE_DETAILS = process.argv.includes('--scrape-details');

async function runScraper() {
  console.log(`[${new Date().toISOString()}] Starting scheduled scrape...`);

  const isOpen = await scrapeMarketStatus();
  console.log(`Market Open Status: ${isOpen}`);

  if (!isOpen && !FORCE_RUN) {
    console.log('Market is CLOSED. Skipping scrape.');
    return;
  }

  if (!isOpen && FORCE_RUN) {
    console.log('Market is CLOSED but Force Run is active. Attempting scrape anyway...');
  }

  try {
    const prices = await fetchTodaysPrices();
    if (prices.length > 0) {
      console.log(`Fetched ${prices.length} prices.`);
      await savePrices(prices);
    } else {
      console.log('No prices scraped (Table might be empty).');
    }
  } catch (err) {
    console.error('Failed to scrape:', err);
  }
}

async function runDetailScraper() {
  console.log(`[${new Date().toISOString()}] Starting Company Details Scrape...`);
  try {
    const ids = await getAllSecurityIds();
    if (ids.length === 0) {
      console.log('No securities found in DB to scrape details for.');
      return;
    }

    await scrapeAllCompanyDetails(ids, async (batch) => {
      const today = new Date().toISOString().split('T')[0];
      batch.forEach(item => {
        if (!item.businessDate) item.businessDate = today;
      });

      await saveCompanyDetails(batch);
      await savePrices(batch);
    });
    console.log('Detail Scrape Completed.');
  } catch (err) {
    console.error('Detail Scrape Failed:', err);
  }
}

if (FORCE_RUN) {
  console.log('Force run initiated...');
  runScraper();
}

if (SCRAPE_DETAILS) {
  console.log('Detail Scraping initiated...');
  runDetailScraper();
}

cron.schedule('*/5 10-15 * * 0-4', () => {
  runScraper();
}, { timezone: "Asia/Kathmandu" });

cron.schedule('0 10 * * 0-4', () => {
  runDetailScraper();
}, { timezone: "Asia/Kathmandu" });

console.log('Scheduler Service started.');
console.log(' - Price Scrape: */5 10-15 * * 0-4');
console.log(' - Detail Scrape: 0 10 * * 0-4');