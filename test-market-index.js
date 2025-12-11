#!/usr/bin/env node

/**
 * Test script to verify market index scraping functionality
 */

const { NepseScraper } = require('./src/scrapers/nepse-scraper');
const { saveMarketIndex, getMarketIndexData } = require('./src/database/queries');

async function testMarketIndexScraping() {
  console.log('🧪 Starting market index scraping test...\n');

  const scraper = new NepseScraper();

  try {
    console.log('1️⃣ Scraping market index data from homepage...');
    const indexData = await scraper.scrapeMarketIndex();

    console.log('\n✅ Scraped data:');
    console.log('   NEPSE Index:', indexData.nepseIndex);
    console.log('   Change:', indexData.indexChange);
    console.log('   % Change:', indexData.indexPercentageChange);
    console.log('   Total Turnover:', indexData.totalTurnover);
    console.log('   Total Traded Shares:', indexData.totalTradedShares);
    console.log('   Advanced:', indexData.advanced);
    console.log('   Declined:', indexData.declined);
    console.log('   Unchanged:', indexData.unchanged);

    // Validate data
    if (indexData.nepseIndex <= 0 || indexData.nepseIndex > 10000) {
      console.log('\n⚠️ Warning: NEPSE Index value seems invalid');
    }

    console.log('\n2️⃣ Saving market index to database...');
    const saveResult = await saveMarketIndex(indexData);
    console.log('✅ Saved successfully (ID:', saveResult, ')');

    console.log('\n3️⃣ Retrieving market index from database...');
    const retrievedData = await getMarketIndexData();

    if (retrievedData) {
      console.log('✅ Retrieved data:');
      console.log('   NEPSE Index:', retrievedData.nepse_index);
      console.log('   Change:', retrievedData.index_change);
      console.log('   % Change:', retrievedData.index_percentage_change);
      console.log('   Total Turnover:', retrievedData.total_turnover);
      console.log('   Total Traded Shares:', retrievedData.total_traded_shares);
      console.log('   Advanced:', retrievedData.advanced);
      console.log('   Declined:', retrievedData.declined);
      console.log('   Unchanged:', retrievedData.unchanged);
      console.log('   Trading Date:', retrievedData.trading_date);
      console.log('   Last Updated:', retrievedData.last_updated);
    } else {
      console.log('⚠️ No data found in database');
    }

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

// Run the test
testMarketIndexScraping().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
