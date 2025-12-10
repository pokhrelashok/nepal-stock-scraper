const formatResponse = (data, message = 'Success') => {
  return {
    status: 'success',
    message: message,
    data: data
  };
};

const formatError = (message = 'Error', statusCode = 500) => {
  return {
    status: 'error',
    message: message,
    code: statusCode
  };
};

const formatPricesForDatabase = (prices) => {
  // If prices is a single object, convert to array
  const pricesArray = Array.isArray(prices) ? prices : [prices];

  return pricesArray.map(price => ({
    symbol: price.symbol,
    securityName: price.securityName,
    securityId: price.securityId,
    businessDate: price.businessDate,
    openPrice: price.openPrice || 0,
    highPrice: price.highPrice || 0,
    lowPrice: price.lowPrice || 0,
    closePrice: price.closePrice || 0,
    previousClose: price.previousClose || 0,
    change: price.change || 0,
    percentageChange: price.percentageChange || 0,
    totalTradedQuantity: price.totalTradedQuantity || 0,
    totalTradedValue: price.totalTradedValue || 0,
    totalTrades: price.totalTrades || 0,
    averageTradedPrice: price.averageTradedPrice || 0,
    marketCapitalization: price.marketCapitalization || 0,
    fiftyTwoWeekHigh: price.fiftyTwoWeekHigh || 0,
    fiftyTwoWeekLow: price.fiftyTwoWeekLow || 0,
    lastUpdatedTime: price.lastUpdatedTime,
    lastTradedPrice: price.lastTradedPrice || 0,
    volume: price.volume || 0,
    turnover: price.turnover || 0,
    maxPrice: price.maxPrice || 0,
    minPrice: price.minPrice || 0
  }));
};

const formatCompanyDetailsForDatabase = (details) => {
  // If details is a single object, convert to array
  const detailsArray = Array.isArray(details) ? details : [details];

  return detailsArray.map(detail => ({
    securityId: detail.securityId,
    symbol: detail.symbol,
    companyName: detail.companyName,
    sectorName: detail.sectorName,
    instrumentType: detail.instrumentType,
    issueManager: detail.issueManager,
    shareRegistrar: detail.shareRegistrar,
    listingDate: detail.listingDate,
    totalListedShares: detail.totalListedShares,
    paidUpCapital: detail.paidUpCapital,
    totalPaidUpValue: detail.totalPaidUpValue,
    email: detail.email,
    website: detail.website,
    status: detail.status,
    permittedToTrade: detail.permittedToTrade,
    promoterShares: detail.promoterShares,
    publicShares: detail.publicShares,
    marketCapitalization: detail.marketCapitalization,
    logoUrl: detail.logoUrl,
    isLogoPlaceholder: detail.isLogoPlaceholder,
    lastTradedPrice: detail.lastTradedPrice,
    openPrice: detail.openPrice,
    closePrice: detail.closePrice,
    highPrice: detail.highPrice,
    lowPrice: detail.lowPrice,
    previousClose: detail.previousClose,
    fiftyTwoWeekHigh: detail.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: detail.fiftyTwoWeekLow,
    totalTradedQuantity: detail.totalTradedQuantity,
    totalTrades: detail.totalTrades,
    averageTradedPrice: detail.averageTradedPrice
  }));
};

module.exports = { formatResponse, formatError, formatPricesForDatabase, formatCompanyDetailsForDatabase };