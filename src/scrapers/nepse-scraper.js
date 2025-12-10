const puppeteer = require('puppeteer');

const NEPSE_URL = 'https://www.nepalstock.com';
const TODAY_PRICE_URL = 'https://www.nepalstock.com/today-price';

async function launchBrowser() {
  return await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });
}

async function optimizePage(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['media', 'font'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
}

async function scrapeMarketStatus() {
  console.log('Checking market status via HTML...');
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await optimizePage(page);

    await page.goto(NEPSE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForSelector('body');
      const bodyText = await page.evaluate(() => document.body.innerText);

      const isOpen = bodyText.includes('Market Open') || bodyText.match(/Market Status[:\s]*OPEN/i);
      const isClosed = bodyText.includes('Market Closed') || bodyText.match(/Market Status[:\s]*CLOSED/i);

      if (isOpen) return true;
      if (isClosed) return false;

      console.log('Market status ambiguous from HTML text. Assuming closed.');
      return false;

    } catch (e) {
      console.error('Failed to scrape market status elements:', e.message);
      return false;
    }
  } catch (e) {
    console.error('Error checking status:', e.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function fetchTodaysPrices() {
  console.log('Starting HTML scraping for prices...');

  const browser = await launchBrowser();
  const allPrices = [];

  try {
    const page = await browser.newPage();
    await optimizePage(page);

    console.log('Navigating to price page...');
    await page.goto(TODAY_PRICE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    try {
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
    } catch (e) {
      console.log('No table found or loading took too long.');
      return [];
    }

    let hasNextPage = true;
    let pageNum = 1;
    const maxPages = 50;

    try {
      const selectSelector = 'select[name^="per_page"], select.items-per-page';
      const options = await page.$$eval(`${selectSelector} option`, opts => opts.map(o => o.value));
      if (options.length > 0) {
        const maxVal = options.sort((a, b) => b - a)[0];
        console.log(`Setting items per page to ${maxVal}...`);
        await page.select(selectSelector, maxVal);
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
      }
    } catch (e) { }

    while (hasNextPage && pageNum <= maxPages) {
      console.log(`Scraping page ${pageNum}...`);

      const pageData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(tr => {
          const tds = Array.from(tr.querySelectorAll('td'));
          const cells = tds.map(td => td.innerText.trim());

          if (cells.length < 5) return null;

          const symbolCol = tds[1];
          const symbolLink = symbolCol ? symbolCol.querySelector('a') : null;
          let securityId = 0;

          if (symbolLink) {
            const href = symbolLink.getAttribute('href');
            const match = href.match(/(\d+)/);
            if (match) securityId = parseInt(match[1], 10);
          }

          return {
            symbol: cells[1] || "",
            securityId: securityId,
            openPrice: parseFloat(cells[3]) || 0,
            highPrice: parseFloat(cells[4]) || 0,
            lowPrice: parseFloat(cells[5]) || 0,
            closePrice: parseFloat(cells[6]) || 0,
            totalTradedQuantity: parseFloat(cells[7]) || 0,
            totalTradedValue: parseFloat(cells[8]) || 0,
            previousClose: parseFloat(cells[9]) || 0,
            securityName: cells[1] || "",
            businessDate: new Date().toISOString().split('T')[0]
          };
        }).filter(x => x && x.symbol);
      });

      console.log(`Found ${pageData.length} rows on page ${pageNum}. Sample ID: ${pageData[0]?.securityId}`);
      allPrices.push(...pageData);

      const nextBtn = await page.$('li.pagination-next:not(.disabled) a, a[aria-label="Next"], button.next');

      if (nextBtn) {
        await Promise.all([
          nextBtn.click(),
          new Promise(r => setTimeout(r, 2000))
        ]);
        pageNum++;
      } else {
        console.log('No Next button found or it is disabled. Reaching end.');
        hasNextPage = false;
      }
    }

  } catch (e) {
    console.error('Error scraping prices:', e);
  } finally {
    await browser.close();
  }

  return allPrices;
}

async function scrapeAllCompanyDetails(securityIds, batchCallback = null) {
  if (!securityIds || securityIds.length === 0) return [];

  console.log(`Starting company details scrape for ${securityIds.length} companies...`);
  const browser = await launchBrowser();
  const details = [];
  let currentBatch = [];

  try {
    const page = await browser.newPage();
    await optimizePage(page);

    let count = 0;
    const BATCH_SIZE = 10;
    for (const sec of securityIds) {
      count++;
      const { security_id, symbol } = sec;
      const url = `https://www.nepalstock.com/company/detail/${security_id}`;

      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        try {
          await page.waitForSelector('.company__title--details', { timeout: 5000 });
        } catch (e) { }

        try {
          const profileTab = await page.$('#profileTab');
          if (profileTab) {
            await profileTab.click();
            await page.waitForSelector('#profile_section', { timeout: 3000 }).catch(() => { });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (e) { }

        const data = await page.evaluate(() => {
          const info = {};

          const clean = (text) => text ? text.replace(/\s+/g, ' ').trim() : '';
          const parseNumber = (text) => {
            if (!text) return 0;
            return parseFloat(text.replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;
          };

          let logoImg = document.querySelector('#profile_section .team-member img');

          if (!logoImg || logoImg.getAttribute('src').includes('placeholder')) {
            logoImg = document.querySelector('.company__title--logo img');
          }

          info.logoUrl = logoImg ? logoImg.getAttribute('src') : '';

          if (info.logoUrl && info.logoUrl.startsWith('assets/')) {
            info.logoUrl = `https://www.nepalstock.com/${info.logoUrl}`;
          }

          info.isLogoPlaceholder = info.logoUrl.includes('placeholder');

          const companyNameEl = document.querySelector('.company__title--details h1');
          info.companyName = companyNameEl ? clean(companyNameEl.innerText) : '';

          const metaItems = document.querySelectorAll('.company__title--metas li');
          metaItems.forEach(li => {
            const text = li.innerText;
            if (text.includes('Sector:')) {
              info.sectorName = clean(text.split('Sector:')[1]);
            } else if (text.includes('Email Address:')) {
              info.email = clean(text.split('Email Address:')[1]);
            } else if (text.includes('Status:')) {
              info.status = clean(text.split('Status:')[1]);
            } else if (text.includes('Permitted to Trade:')) {
              info.permittedToTrade = clean(text.split('Permitted to Trade:')[1]);
            }
          });

          const getTableValue = (label) => {
            const rows = Array.from(document.querySelectorAll('table tr'));
            for (const row of rows) {
              const th = row.querySelector('th');
              const td = row.querySelector('td');
              if (th && td && th.innerText.trim().includes(label)) {
                return clean(td.innerText);
              }
            }
            return null;
          };

          info.instrumentType = getTableValue('Instrument Type') || '';
          info.listingDate = getTableValue('Listing Date') || '';

          const lastTradedPriceCell = getTableValue('Last Traded Price');
          if (lastTradedPriceCell) {
            const priceMatch = lastTradedPriceCell.match(/([0-9,]+\.?[0-9]*)/);
            info.lastTradedPrice = priceMatch ? parseNumber(priceMatch[1]) : 0;
          } else {
            info.lastTradedPrice = 0;
          }

          info.totalTradedQuantity = parseNumber(getTableValue('Total Traded Quantity'));
          info.totalTrades = parseInt(parseNumber(getTableValue('Total Trades')), 10);
          info.previousClose = parseNumber(getTableValue('Previous Day Close Price'));

          const highLowText = getTableValue('High Price / Low Price');
          if (highLowText) {
            const parts = highLowText.split('/');
            info.highPrice = parts[0] ? parseNumber(parts[0]) : 0;
            info.lowPrice = parts[1] ? parseNumber(parts[1]) : 0;
          } else {
            info.highPrice = 0;
            info.lowPrice = 0;
          }

          const fiftyTwoWeekText = getTableValue('52 Week High / 52 Week Low');
          if (fiftyTwoWeekText) {
            const parts = fiftyTwoWeekText.split('/');
            info.fiftyTwoWeekHigh = parts[0] ? parseNumber(parts[0]) : 0;
            info.fiftyTwoWeekLow = parts[1] ? parseNumber(parts[1]) : 0;
          } else {
            info.fiftyTwoWeekHigh = 0;
            info.fiftyTwoWeekLow = 0;
          }

          info.openPrice = parseNumber(getTableValue('Open Price'));

          const closePriceText = getTableValue('Close Price');
          info.closePrice = parseNumber(closePriceText ? closePriceText.replace('*', '') : '0');

          info.totalListedShares = parseNumber(getTableValue('Total Listed Shares'));
          info.totalPaidUpValue = parseNumber(getTableValue('Total Paid up Value'));
          info.marketCapitalization = parseNumber(getTableValue('Market Capitalization'));

          info.paidUpCapital = info.totalPaidUpValue || parseNumber(getTableValue('Paid Up Capital'));

          info.issueManager = getTableValue('Issue Manager') || '';
          info.shareRegistrar = getTableValue('Share Registrar') || '';
          info.website = getTableValue('Website') || '';

          info.promoterShares = parseNumber(getTableValue('Promoter Shares'));
          info.publicShares = parseNumber(getTableValue('Public Shares'));

          info.averageTradedPrice = parseNumber(getTableValue('Average Traded Price'));

          return info;
        });

        const item = {
          securityId: security_id,
          symbol: symbol,
          ...data
        };
        details.push(item);
        if (currentBatch) currentBatch.push(item);

      } catch (err) {
        console.error(`Failed to scrape details for ${symbol}:`, err.message);
      }

      if (count % 10 === 0) {
        console.log(`Progress: ${count}/${securityIds.length}`);
        if (batchCallback && currentBatch && currentBatch.length > 0) {
          await batchCallback(currentBatch);
          currentBatch = [];
        }
      }
    }

    if (batchCallback && currentBatch && currentBatch.length > 0) {
      await batchCallback(currentBatch);
    }

  } catch (e) {
    console.error('Error in company details loop:', e);
  } finally {
    await browser.close();
  }

  return details;
}

module.exports = {
  fetchTodaysPrices,
  scrapeMarketStatus,
  scrapeAllCompanyDetails
};