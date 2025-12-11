const cron = require('node-cron');
const { NepseScraper } = require('./scrapers/nepse-scraper');
const { insertTodayPrices, updateMarketStatus, saveMarketIndex, getSecurityIdsWithoutDetails, insertCompanyDetails } = require('./database/queries');
const { formatPricesForDatabase } = require('./utils/formatter');

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.scraper = new NepseScraper();
    this.isRunning = false;
    this.isJobRunning = new Map(); // Track if a specific job is currently executing
    this.stats = {
      priceUpdate: { lastRun: null, lastSuccess: null, successCount: 0, failCount: 0 },
      closeUpdate: { lastRun: null, lastSuccess: null, successCount: 0, failCount: 0 },
      companyDetailsUpdate: { lastRun: null, lastSuccess: null, successCount: 0, failCount: 0 }
    };
  }

  // Get scheduler health/stats
  getHealth() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.getActiveJobs(),
      currentlyExecuting: Array.from(this.isJobRunning.entries()).filter(([, v]) => v).map(([k]) => k),
      stats: this.stats
    };
  }

  async startPriceUpdateSchedule() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Starting price update scheduler...');

    // Price updates every 2 minutes during market hours (10 AM - 3 PM)
    const priceJob = cron.schedule('*/2 10-15 * * 1-5', async () => {
      await this.updatePricesAndStatus('DURING_HOURS');
    }, {
      scheduled: false,
      timezone: 'Asia/Kathmandu'
    });

    // Market close status update (2 minutes after 3 PM)
    const closeJob = cron.schedule('2 15 * * 1-5', async () => {
      await this.updatePricesAndStatus('AFTER_CLOSE');
    }, {
      scheduled: false,
      timezone: 'Asia/Kathmandu'
    });

    // Company details update at 11:03 AM on market days (Sun-Thu = 0,1,2,3,4)
    const companyDetailsJob = cron.schedule('3 11 * * 0-4', async () => {
      await this.updateCompanyDetails();
    }, {
      scheduled: false,
      timezone: 'Asia/Kathmandu'
    });

    this.jobs.set('priceUpdate', priceJob);
    this.jobs.set('closeUpdate', closeJob);
    this.jobs.set('companyDetailsUpdate', companyDetailsJob);

    priceJob.start();
    closeJob.start();
    companyDetailsJob.start();

    this.isRunning = true;
    console.log('📅 Price update schedule started (every 2 min during hours + close update + company details at 11:03)');
  }

  async updatePricesAndStatus(phase) {
    const jobKey = phase === 'AFTER_CLOSE' ? 'closeUpdate' : 'priceUpdate';

    // Prevent overlapping runs
    if (this.isJobRunning.get(jobKey)) {
      console.log(`⚠️ ${jobKey} is already running, skipping...`);
      return;
    }

    this.isJobRunning.set(jobKey, true);
    this.stats[jobKey].lastRun = new Date().toISOString();

    console.log(`🕐 Scheduled ${phase === 'AFTER_CLOSE' ? 'close' : 'price'} update started...`);

    try {
      const isOpen = await this.scraper.scrapeMarketStatus();

      // Always update market status
      await updateMarketStatus(isOpen);
      console.log(`📊 Market status updated: ${isOpen ? 'OPEN' : 'CLOSED'}`);

      // Scrape and save market index data
      try {
        const indexData = await this.scraper.scrapeMarketIndex();
        await saveMarketIndex(indexData);
        console.log(`📈 Market index updated: ${indexData.nepseIndex} (${indexData.indexChange})`);
      } catch (indexError) {
        console.warn('⚠️ Failed to update market index:', indexError.message);
      }

      if (phase === 'DURING_HOURS' && isOpen) {
        console.log('✅ Market is open, updating prices...');
        const prices = await this.scraper.scrapeTodayPrices();
        if (prices && prices.length > 0) {
          const formattedPrices = formatPricesForDatabase(prices);
          await insertTodayPrices(formattedPrices);
          console.log(`✅ Updated ${prices.length} stock prices`);
        } else {
          console.log('⚠️ No price data received');
        }
      } else if (phase === 'AFTER_CLOSE') {
        console.log('🔒 Post-market close status update completed');
      } else {
        console.log('🔒 Market is closed, skipping price update');
      }

      this.stats[jobKey].lastSuccess = new Date().toISOString();
      this.stats[jobKey].successCount++;
    } catch (error) {
      console.error('❌ Scheduled update failed:', error.message);
      this.stats[jobKey].failCount++;
    } finally {
      this.isJobRunning.set(jobKey, false);
    }
  }

  async updateCompanyDetails() {
    const jobKey = 'companyDetailsUpdate';

    // Prevent overlapping runs
    if (this.isJobRunning.get(jobKey)) {
      console.log(`⚠️ ${jobKey} is already running, skipping...`);
      return;
    }

    this.isJobRunning.set(jobKey, true);
    this.stats[jobKey].lastRun = new Date().toISOString();

    console.log('🏢 Scheduled company details update started...');

    try {
      // Get security IDs that don't have company details yet
      const missingCompanies = await getSecurityIdsWithoutDetails();

      if (!missingCompanies || missingCompanies.length === 0) {
        console.log('✅ All companies already have details');
        return;
      }

      console.log(`📊 Found ${missingCompanies.length} companies missing details, scraping...`);

      // Scrape details only for companies without them
      const details = await this.scraper.scrapeAllCompanyDetails(
        missingCompanies,
        insertCompanyDetails
      );

      console.log(`✅ Scraped and saved details for ${details.length} companies`);

      this.stats[jobKey].lastSuccess = new Date().toISOString();
      this.stats[jobKey].successCount++;
    } catch (error) {
      console.error('❌ Company details update failed:', error.message);
      this.stats[jobKey].failCount++;
    } finally {
      this.isJobRunning.set(jobKey, false);
    }
  }

  async stopPriceUpdateSchedule() {
    const job = this.jobs.get('priceUpdate');
    if (job) {
      job.stop();
      this.jobs.delete('priceUpdate');
      console.log('🛑 Price update schedule stopped');
    }
  }

  async stopAllSchedules() {
    console.log('🛑 Stopping all scheduled jobs...');

    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`🛑 Stopped schedule: ${name}`);
    }
    this.jobs.clear();

    if (this.scraper) {
      await this.scraper.close();
      console.log('🛑 Scraper resources cleaned up');
    }

    this.isRunning = false;
  }

  getActiveJobs() {
    return Array.from(this.jobs.keys());
  }

  isSchedulerRunning() {
    return this.isRunning;
  }
}

module.exports = Scheduler;