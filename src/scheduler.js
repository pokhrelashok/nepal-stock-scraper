const cron = require('node-cron');
const { NepseScraper } = require('./scrapers/nepse-scraper');
const { insertTodayPrices } = require('./database/queries');
const { formatPricesForDatabase } = require('./utils/formatter');

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.scraper = new NepseScraper();
    this.isRunning = false;
  }

  async startPriceUpdateSchedule() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Starting price update scheduler...');

    const job = cron.schedule('*/15 10-15 * * 1-5', async () => {
      console.log('🕐 Scheduled price update started...');
      try {
        const isOpen = await this.scraper.scrapeMarketStatus();
        if (isOpen) {
          console.log('✅ Market is open, updating prices...');
          const prices = await this.scraper.scrapeTodayPrices();
          if (prices && prices.length > 0) {
            const formattedPrices = formatPricesForDatabase(prices);
            await insertTodayPrices(formattedPrices);
            console.log(`✅ Updated ${prices.length} stock prices`);
          } else {
            console.log('⚠️ No price data received');
          }
        } else {
          console.log('🔒 Market is closed, skipping price update');
        }
      } catch (error) {
        console.error('❌ Scheduled price update failed:', error.message);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kathmandu'
    });

    this.jobs.set('priceUpdate', job);
    job.start();
    this.isRunning = true;
    console.log('📅 Price update schedule started (every 15 minutes during trading hours)');
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