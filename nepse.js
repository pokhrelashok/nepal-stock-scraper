#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('NEPSE Portfolio API');
  console.log('Usage:');
  console.log('  npm start                 - Start the API server');
  console.log('  npm run scraper           - Run the price scraper');
  console.log('  npm run scraper:details   - Scrape company details');
  console.log('  npm run scheduler         - Start the scheduled scraper');
  console.log('  npm test                  - Run all tests');
  console.log('  npm run test:api          - Test API endpoints');
  console.log('  npm run test:scraper      - Test scraper functionality');
  process.exit(0);
}

const command = args[0];

switch (command) {
  case 'server':
    require('./src/server');
    break;
  case 'scheduler':
    require('./src/index');
    break;
  case 'scraper':
    process.argv.push('--force');
    require('./src/index');
    break;
  case 'scraper:details':
    process.argv.push('--scrape-details');
    require('./src/index');
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}