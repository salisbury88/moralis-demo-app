import moment from 'moment';
import fetch from 'node-fetch';
const API_KEY = "HsPkTtNaTcNOj8TWnAG2ZvcjOIzW82gUZMATjQ4tOcHa30wES5GkHgbWAq5pG3Fu";
const baseURL = "https://deep-index.moralis.io/api/v2.2";

export const networkData = [{"name":"Ethereum","id":"eth","wrappedTokenAddress":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"},{"name":"Polygon","id":"polygon","wrappedTokenAddress":"0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"},{"name":"Binance","id":"binance","wrappedTokenAddress":"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"},{"name":"Avalanche","id":"avalanche","wrappedTokenAddress":"0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"},{"name":"Fantom","id":"fantom","wrappedTokenAddress":"0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"},{"name":"Cronos","id":"cronos","wrappedTokenAddress":"0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23"}];

export const chains = [{
  chain:"eth",
  id:"0x1"
}, {
  chain: "polygon",
  id: "0x89"
}, {
  chain: "bsc",
  id: "0x38"
}, {
  chain: "fantom",
  id: "0xfa"
}, {
  chain: "avalanche",
  id: "0xa86a"
}, {
  chain: "arbitrum",
  id: "0xa4b1"
}, {
  chain: "cronos",
  id: "0x19"
}, {
  chain: "palm",
  id: "0x2a15c308d"
}];

export const calcAge = (dob) => {
    const age = moment.duration(moment().diff(moment(dob)))
    const ageInYears = Math.floor(age.asYears())
    const ageInMonths = Math.floor(age.asMonths())
    const ageInDays = Math.floor(age.asDays())
  
    if (age < 0)
      throw 'DOB is in the future!'
  
    let pluralYears = pluralize('year', ageInYears)
    let pluralDays = pluralize('day', age.days())
  
    if (ageInYears < 18) {
      if (ageInYears >= 1) {
        return `${pluralYears} ${pluralize('month', age.months())}`
      } else if (ageInYears < 1 && ageInMonths >= 1) {
        return `${pluralize('month', ageInMonths)} ${pluralDays}`
      } else {
        return pluralDays
      }
    } else {
      return pluralYears
    }
  
  }
  
  
  export const pluralize = (str, n) => n > 1 ? `${n} ${str.concat('s')}` : n == 0 ? '' :`${n} ${str}`

  export const getChainName = (chain) => {
    switch (chain) {
        case 'eth':
            return 'Ethereum';
        case 'polygon':
            return 'Polygon';
        case 'bsc':
            return 'Binance';
        case 'avalanche':
            return 'Avalanche';
        case 'fantom':
            return 'Fantom';
        case 'palm':
            return 'Palm';
        case 'cronos':
            return 'Cronos';
        case 'arbitrum':
            return 'Arbitrum';
        default:
            return '';
    }
}

export const findUniqueAddresses = (dataArray) => {
    const uniqueAddresses = new Set();

    dataArray.forEach(item => {
        uniqueAddresses.add(item.from_address);
        uniqueAddresses.add(item.to_address);
    });

    return [...uniqueAddresses];
}

export const findAddressOccurrences = (transactions, currentUserAddress) => {
    const normalizedUserAddress = currentUserAddress.toLowerCase();
  
    const addressCounts = {
      total: {},
      from: {},
      to: {}
    };
  
    const uniqueSentToAddresses = new Set();
    const uniqueReceivedFromAddresses = new Set();
  
    transactions.forEach(transaction => {
      const fromAddress = transaction.from_address_label || transaction.from_address;
      const toAddress = transaction.to_address_label || transaction.to_address;
    
      const normalizedFrom = transaction.from_address_label ? fromAddress : fromAddress.toLowerCase();
      const normalizedTo = transaction.to_address_label ? toAddress : toAddress.toLowerCase();
    
      // Count occurrences for 'from' addresses
      if (normalizedFrom !== normalizedUserAddress) {
        addressCounts.total[normalizedFrom] = (addressCounts.total[normalizedFrom] || 0) + 1;
        addressCounts.from[normalizedFrom] = (addressCounts.from[normalizedFrom] || 0) + 1;
        
        uniqueReceivedFromAddresses.add(normalizedFrom);
      }
    
      // Count occurrences for 'to' addresses
      if (normalizedTo !== normalizedUserAddress) {
        addressCounts.total[normalizedTo] = (addressCounts.total[normalizedTo] || 0) + 1;
        addressCounts.to[normalizedTo] = (addressCounts.to[normalizedTo] || 0) + 1;
    
        uniqueSentToAddresses.add(normalizedTo);
      }
    });
  
    const sortedTotal = Object.entries(addressCounts.total).sort(([, countA], [, countB]) => countB - countA);
    const sortedFrom = Object.entries(addressCounts.from).sort(([, countA], [, countB]) => countB - countA);
    const sortedTo = Object.entries(addressCounts.to).sort(([, countA], [, countB]) => countB - countA);
  
    return {
      total: sortedTotal,
      from: sortedFrom,
      to: sortedTo,
      uniqueSentToCount: uniqueSentToAddresses.size,
      uniqueReceivedFromCount: uniqueReceivedFromAddresses.size
    };
  }

  export const generateWeekArray = (weeksAgo) => {
  let result = [];
  let currentDate = new Date();

  // If today isn't Sunday, set the date to the last Monday
  if (currentDate.getDay() !== 0) {
  let daysToLastMonday = currentDate.getDay() - 1;
  currentDate.setDate(currentDate.getDate() - daysToLastMonday);
  } else {
  // Otherwise, set the date to the Monday of the previous week
  currentDate.setDate(currentDate.getDate() - 6);
  }

  for (let i = 0; i < weeksAgo; i++) {
  let endOfWeek = new Date(currentDate);
  endOfWeek.setDate(endOfWeek.getDate() + 6);  // The end is 6 days after the start
  endOfWeek.setHours(23, 59, 59, 999);

  let startOfWeek = new Date(endOfWeek);
  startOfWeek.setDate(endOfWeek.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  let formattedStart = startOfWeek.toISOString().split('T')[0];
  let formattedEnd = endOfWeek.toISOString().split('T')[0];

  result.push({ x: `${formattedStart} to ${formattedEnd}`, y: 0 });

  // Move to the previous week.
  currentDate.setDate(currentDate.getDate() - 7);
}

return result;
}

export const updateChartArrayByWeek = (chartArray, dataArray) => {
  dataArray.forEach(data => {
  let blockDate = new Date(data.block_timestamp);

  for (let i = 0; i < chartArray.length; i++) {
      let [start, end] = chartArray[i].x.split(' to ');
      let startDate = new Date(start);
      let endDate = new Date(end);

      if (blockDate >= startDate && blockDate <= endDate) {
          chartArray[i].y++;
          break;
      }
  }
  });
}

export const chunkArray = (array, chunkSize) => {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
  }
  return results;
};

export const fetchPricesForChunk = async (tokensChunk, chain) => {
  try {

    console.log("Sending request with data:", JSON.stringify({
      tokens: tokensChunk.map(token => ({ token_address: token.token_address }))
    }));

    let addresses = [];
    tokensChunk.forEach(function(item) {
      addresses.push({
        token_address: item.token_address,
        exchange: chain === "eth" ? 'uniswapv2' : null
      });
    });

    console.log(addresses)

      const response = await fetch(`${baseURL}/erc20/prices?include=percent_change&chain=${chain}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-API-Key': `${API_KEY}`
          },
          body: JSON.stringify({
            "tokens": addresses
          })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error response body:', errorBody);
        throw new Error(`Error fetching prices: ${response.statusText}`);
      }

      const pricesData = await response.json();
      return pricesData.filter(price => price !== null);

  } catch (error) {
      console.error("Error fetching token prices:", error);
      return [];
  }
};

export async function enrichTransfersWithPrices(erc20_transfers, chain) {
  // Step 1: Fetch current prices for up to 25 tokens
  const uniqueTokenAddresses = Array.from(new Set(erc20_transfers.map(t => t.address)))
    .map(token_address => ({ token_address }));

  const tokenChunks = chunkArray(uniqueTokenAddresses, 25); // Implement this function to split the array into chunks of 25
  let currentPrices = {};


  for (const chunk of tokenChunks) {
    const pricesChunk = await fetchPricesForChunk(chunk, chain); // Assumes this function is implemented correctly
    pricesChunk.forEach(priceInfo => {
      currentPrices[priceInfo.tokenAddress.toLowerCase()] = priceInfo.usdPriceFormatted;
    });
  }

  // Step 2: Iterate over each erc20_transfer to enrich with prices
  for (const transfer of erc20_transfers) {
    // Add current_price
    transfer.current_price = currentPrices[transfer.address.toLowerCase()];

    // Fetch transacted_price
    const historicalPrice = await fetchHistoricalPrice(transfer.address, transfer.block_number, chain); // Implement this function
    transfer.transacted_price = historicalPrice;
  }

  return erc20_transfers;
}

const fetchHistoricalPrice = async (tokenAddress, blockNumber, chain) => {
  try {
    const response = await fetch(`${baseURL}/erc20/${tokenAddress}/price?chain=${chain}&to_block=${blockNumber}
    `, {
      method: 'GET',
      headers: {
          'Content-Type': 'application/json',
          'X-API-Key': `${API_KEY}`
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error response body:', errorBody);
      throw new Error(`Error fetching historical price: ${response.statusText}`);
    }

    const pricesData = await response.json();

    // Check if usdPriceFormatted exists in the response and return it
    if(pricesData && pricesData.usdPriceFormatted !== undefined) {
      return pricesData.usdPriceFormatted;
    } else {
      console.error("USD price formatted not found in the response");
      return null;
    }

  } catch (error) {
    console.error("Error fetching historical token price:", error);
    return null; // Return null or a default value if there's an error
  }
};


export const fetchSinglePrice = async (tokenAddress, chain) => {
  try {
    const response = await fetch(`${baseURL}/erc20/${tokenAddress}/price?exchange=uniswapv2&chain=${chain}&include=percent_change`, {
      method: 'GET',
      headers: {
          'Content-Type': 'application/json',
          'X-API-Key': `${API_KEY}`
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error response body:', errorBody);
      throw new Error(`Error fetching historical price: ${response.statusText}`);
    }

    const pricesData = await response.json();

    // Check if usdPriceFormatted exists in the response and return it
    if(pricesData && pricesData.usdPriceFormatted !== undefined) {
      let price = {
        price: pricesData.usdPriceFormatted,
        change: pricesData["24hrPercentChange"]
      }
      console.log(price)
      return price;
    } else {
      console.error("USD price formatted not found in the response");
      return null;
    }

  } catch (error) {
    console.error("Error fetching historical token price:", error);
    return null; // Return null or a default value if there's an error
  }
};


export async function enrichNFTTransactionsWithUSDValue(transactions, networkData) {
  // Step 1: Filter the transactions for "NFT Sale" and "NFT Purchase".
  const nftTransactions = transactions.filter(tx => 
    tx.category === "NFT Sale" || tx.category === "NFT Purchase");

  // Step 2: Prepare data for fetching prices.
  const priceQueries = nftTransactions.map(tx => {
    const nativeToken = networkData.find(net => net.id === tx.chain).wrappedTokenAddress;
    return { token_address: nativeToken, to_block: tx.block_number };
  });

  // Fetch historical prices in chunks to avoid hitting API limits
  // Assuming fetchPricesForChunk is modified to handle 'to_block' parameter
  let historicalPrices = [];
  for (const chunk of chunkArray(priceQueries, 25)) {
    // Assuming all transactions within a chunk belong to the same chain
    // If they don't, your `fetchPricesForChunk` function needs to handle different chains within a single chunk
    const chain = chunk[0].chain; // Assuming 'chain' is a property of the price query object
    const prices = await fetchPricesForChunk(chunk, chain);
    historicalPrices = [...historicalPrices, ...prices];
  }

  // Step 3: Map historical prices back to transactions.
  nftTransactions.forEach(tx => {
    const priceData = historicalPrices.find(price => 
      price.to_block === tx.block_number &&
      price.token_address === networkData.find(net => net.id === tx.chain).wrappedTokenAddress
    );
    tx.historical_price = priceData ? priceData.usdPrice : null;
  });

  // Step 4: Calculate USD value for each transaction.
  nftTransactions.forEach(tx => {
    if (tx.historical_price) {
      // Assumes 'transaction.value' is already in the standard unit
      tx.value_usd = ethers.utils.formatUnits(tx.value, 18) * tx.historical_price;
    } else {
      tx.value_usd = null;
    }
  });

  return nftTransactions;
}

export function formatPrice(price, precision = 2) {
  const roundedPrice = Number(Math.round(parseFloat(price + 'e' + precision)) + 'e-' + precision);
  return roundedPrice.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision });
}

export function extractMetadataInfo(metadata) {
  // Extract feeTier using regular expression
  const feeTierMatch = metadata.description.match(/Fee Tier: ([0-9.]+%)/);
  const feeTier = feeTierMatch ? parseFloat(feeTierMatch[1]) : null;

  // Extract pairName using regular expression
  const pairNameMatch = metadata.name.match(/Uniswap - ([0-9.]+%) - (.+?) -/);
  const pairName = pairNameMatch ? pairNameMatch[2] : null;

  // Extract poolAddress, token symbols, and token addresses using regular expressions
  const poolAddressMatch = metadata.description.match(/Pool Address: ([0-9a-fA-Fx]+)/);
  const poolAddress = poolAddressMatch ? poolAddressMatch[1] : null;

  const tokenAddressesMatch = metadata.description.match(/([a-zA-Z0-9]+) Address: ([0-9a-fA-Fx]+)/g);
  const tokenInfo = [];
  if (tokenAddressesMatch) {
    for (const match of tokenAddressesMatch) {
      const parts = match.match(/([a-zA-Z0-9]+) Address: ([0-9a-fA-Fx]+)/);
      if (parts && parts.length === 3) {
        const symbol = parts[1];
        const address = parts[2];
        tokenInfo.push({ symbol, address });
      }
    }
  }

  return {
    feeTier,
    pairName,
    poolAddress,
    tokenInfo,
  };
}

export function findEarliestAndLatestTimestamps(data) {
  let earliestTimestamp = Infinity;
  let latestTimestamp = 0;

  data.forEach(item => {
    if (item.last_transaction && item.last_transaction.block_timestamp) {
      const timestamp = new Date(item.last_transaction.block_timestamp).getTime();

      if (timestamp < earliestTimestamp) {
        earliestTimestamp = timestamp;
      }

      if (timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
      }
    }
  });

  // Check if both earliest and latest timestamps are still at their initial values
  if (earliestTimestamp === Infinity && latestTimestamp === 0) {
    return {
      earliest: null,
      latest: null,
    };
  }

  return {
    earliest: earliestTimestamp !== Infinity ? new Date(earliestTimestamp).toISOString() : null,
    latest: latestTimestamp !== 0 ? new Date(latestTimestamp).toISOString() : null,
  };
}