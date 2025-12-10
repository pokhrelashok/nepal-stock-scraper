async function testApiEndpoints() {
  console.log('Testing API Endpoints');
  console.log('═'.repeat(40));

  const baseUrl = 'http://localhost:3000';

  const endpoints = [
    { path: '/api/scripts', name: 'All Scripts' },
    { path: '/api/scripts/NABIL', name: 'Script Details (NABIL)' },
    { path: '/api/companies', name: 'All Companies' },
    { path: '/api/companies/sector/Commercial Banks', name: 'Banks Sector' },
    { path: '/api/companies/top/5', name: 'Top 5 Companies' },
    { path: '/api/market/stats', name: 'Market Statistics' }
  ];

  let passedTests = 0;
  let totalTests = endpoints.length;

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting ${endpoint.name}...`);
      console.log(`   URL: ${baseUrl}${endpoint.path}`);

      const response = await fetch(`${baseUrl}${endpoint.path}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Status: ${response.status}`);

        if (Array.isArray(data)) {
          console.log(`   Data: Array with ${data.length} items`);
        } else if (typeof data === 'object') {
          console.log(`   Data: Object with keys: ${Object.keys(data).join(', ')}`);
        }
        passedTests++;
      } else {
        console.log(`   ❌ Status: ${response.status}`);
        console.log(`   ❌ Error: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\nTest Results: ${passedTests}/${totalTests} endpoints passed`);
  return passedTests === totalTests;
}

async function testSpecificFeatures() {
  console.log('\nTesting Specific Features');
  console.log('═'.repeat(40));

  try {
    console.log('\nMarket Statistics:');
    const statsResponse = await fetch('http://localhost:3000/api/market/stats');
    if (statsResponse.ok) {
      const response = await statsResponse.json();
      const stats = response.data || response;
      console.log(`   Total Companies: ${stats.total_companies}`);
      console.log(`   Active Companies: ${stats.active_companies}`);
      console.log(`   Companies with Real Logos: ${stats.companies_with_real_logos}`);
      console.log(`   Total Market Cap: ${stats.total_market_cap ? stats.total_market_cap.toLocaleString() : 'N/A'}`);
    }

    console.log('\nTop Companies by Market Cap:');
    const topResponse = await fetch('http://localhost:3000/api/companies/top/3');
    if (topResponse.ok) {
      const response = await topResponse.json();
      const topCompanies = response.data || response;
      if (Array.isArray(topCompanies) && topCompanies.length > 0) {
        topCompanies.forEach((company, index) => {
          console.log(`   ${index + 1}. ${company.company_name || company.symbol} - Market Cap: ${company.market_capitalization ? company.market_capitalization.toLocaleString() : 'N/A'}`);
        });
      }
    }

    console.log('\nCommercial Banks Sector:');
    const sectorResponse = await fetch('http://localhost:3000/api/companies/sector/Commercial%20Banks');
    if (sectorResponse.ok) {
      const response = await sectorResponse.json();
      const sectorCompanies = response.data || response;
      if (Array.isArray(sectorCompanies)) {
        console.log(`   Found ${sectorCompanies.length} companies in Commercial Banks sector`);
      }
    }

    return true;
  } catch (error) {
    console.error('Error testing specific features:', error);
    return false;
  }
}

async function runApiTests() {
  console.log('NEPSE Portfolio API Tests');
  console.log('═'.repeat(50));

  await new Promise(resolve => setTimeout(resolve, 2000));

  const endpointsTest = await testApiEndpoints();
  const featuresTest = await testSpecificFeatures();

  console.log('\nFinal Results:');
  console.log(`   API Endpoints: ${endpointsTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Specific Features: ${featuresTest ? '✅ PASS' : '❌ FAIL'}`);

  const overallPass = endpointsTest && featuresTest;
  console.log(`   Overall: ${overallPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  return overallPass;
}

if (require.main === module) {
  runApiTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = { testApiEndpoints, testSpecificFeatures, runApiTests };