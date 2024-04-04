import express from 'express';
import fetch from 'node-fetch';
import moment from 'moment';
import { ethers } from 'ethers';
import * as utilities from './utilities.js';

const router = express.Router();
const chains = ['eth', 'polygon', 'bsc', 'optimism', 'base', 'gnosis', 'fantom', 'avalanche', 'arbitrum', 'cronos'];
const API_KEY = "HsPkTtNaTcNOj8TWnAG2ZvcjOIzW82gUZMATjQ4tOcHa30wES5GkHgbWAq5pG3Fu";
const baseURL = "https://deep-index.moralis.io/api/v2.2";
const randomAddresses = []
router.get('/api', async function(req,res,next) {
    try {
      res.json({ message: 'Hello from the backend!' });
    } catch(e) {
      next(e);
    }
});  

router.post('/api/streams', async function(req,res,next) {
  try {
    console.log('Streams received')
    console.log(req.body)
    return res.status(200).json(200);
  } catch(e) {
    next(e);
  }
});

router.get('/api/market-data', async function(req,res,next) {
  try {
    const urls = [
      `${baseURL}/market-data/global/market-cap`,
      `${baseURL}/market-data/global/volume`,
      `${baseURL}/market-data/erc20s/top-tokens`,
      `${baseURL}/market-data/erc20s/top-movers`,
      `${baseURL}/market-data/nfts/top-collections`,
      `${baseURL}/market-data/nfts/hottest-collections`
    ];

    const fetchPromises = urls.map(url =>
      fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': API_KEY
        }
      }).then(response => response.json())
    );

    const [
      market_cap,
      trading_volume,
      top_tokens,
      token_movers,
      nft_market_cap,
      nft_volume
    ] = await Promise.all(fetchPromises);

    return res.status(200).json({
      market_cap,
      trading_volume,
      top_tokens,
      token_movers,
      nft_market_cap,
      nft_volume
    });

  } catch(e) {
    next(e);
  }
});
  
router.post('/api/wallet', async function(req,res,next) {
    try {
      let address = req.body.address;
    let ens;
    let unstoppable;

    // Prepare a list of promises for parallel execution
    let promises = [];
    let isENSAddress = address.indexOf(".eth") > -1;

    if (isENSAddress) {
      promises.push(fetch(`${baseURL}/resolve/ens/${address}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': API_KEY
        }
      }));
    } else {
      promises.push(fetch(`${baseURL}/resolve/${address}/reverse`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': API_KEY
        }
      }));
    }

    promises.push(fetch(`${baseURL}/resolve/${address}/domain`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': API_KEY
      }
    }));

    const [ensOrReverseResponse, udResponse] = await Promise.all(promises);

    if (isENSAddress) {
      let domain = await ensOrReverseResponse.json();
      address = domain.address;
      ens = req.body.address;
    } else {
      let ens_domain = await ensOrReverseResponse.json();
      ens = ens_domain.address;
    }

    let ud_domain = await udResponse.json();
    unstoppable = ud_domain.name;

    // Fetching wallet chains and balance in parallel
    const queryString = chains.map(chain => `chains=${chain}`).join('&');
    const walletChainsPromise = fetch(`${baseURL}/wallets/${address}/chains?${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': API_KEY
      }
    });

    const balancePromise = fetch(`${baseURL}/${address}/balance?chain=${req.chain}`, {
      method: 'get',
      headers: {
        accept: 'application/json',
        'X-API-Key': API_KEY
      }
    });

    const [response, get_balance] = await Promise.all([walletChainsPromise, balancePromise]);

    if (!response.ok) {
      throw new Error(`Error fetching chains: ${response.statusText}`);
    }
    const active_chains = await response.json();
    const balance = await get_balance.json();

    const activeChains = active_chains.active_chains.map(chain => `chains=${chain.chain}`).join('&');
    const fetch_networth = await fetch(`${baseURL}/wallets/${address}/net-worth?${activeChains}`,{
      method: 'get',
      headers: {accept: 'application/json', 'X-API-Key': `${API_KEY}`}
    });

    let networth = 0;
    if (!fetch_networth.ok) {
      console.log(`Error fetching net-worth: ${fetch_networth.statusText}`);
    }

    networth = await fetch_networth.json();

    let networthDataLabels = [];
    let networthDatasets = [];

    networth.chains.forEach(function(item) {
      networthDataLabels.push(item.chain);
      networthDatasets.push(Number(item.networth_usd));
    });

    let isWhale = false;
    let earlyAdopter = false;
    let multiChainer = false;
    let speculator = false;
    let isFresh = false;

      //100 eth
      if(balance.balance > 100000000000000000000) isWhale = true;
  
      let wallet_chains = [];
      let earlyAdopterDate = new Date("2016-01-01");

  
      for(const chain of active_chains.active_chains) {
          if(chain.first_transaction) {
              wallet_chains.push(chain);
  
              if(chain.first_transaction) {
                  if(new Date(chain.first_transaction.block_timestamp) < earlyAdopterDate)
                  earlyAdopter = true;
              }
          }
      }
      const one_day_ago = moment().subtract(1, 'days');
      let firstSeenDate = utilities.findEarliestAndLatestTimestamps(active_chains.active_chains).earliest;
      let lastSeenDate = utilities.findEarliestAndLatestTimestamps(active_chains.active_chains).latest;
  
      
  
      wallet_chains.forEach(item => {
        item.label = utilities.getChainName(item.chain);
        if (new Date(item.first_transaction.block_timestamp) < new Date(firstSeenDate.block_timestamp)) {
          firstSeenDate = item.first_transaction.block_timestamp
        }
        if (new Date(item.last_transaction.block_timestamp) > new Date(lastSeenDate.block_timestamp)) {
          lastSeenDate = item.last_transaction.block_timestamp
        }
      });
  
      let walletAge = utilities.calcAge(firstSeenDate);

      if(new Date(firstSeenDate) > new Date(one_day_ago)) isFresh = true;
  
  
      if(wallet_chains.length > 1) multiChainer = true;
      
      return res.status(200).json({address,networth:networth.total_networth_usd,networthDataLabels,
        networthDatasets,
        active_chains:wallet_chains, walletAge, firstSeenDate, lastSeenDate, ens,unstoppable,
        isWhale, earlyAdopter,multiChainer,speculator,balance:balance.balance, moment, isFresh
      });
    } catch(e) {
      next(e);
    }
  });
  
  router.get('/api/wallet/profile', async function(req, res, next) {
  try {
    const address = req.query.wallet;
    const chain = req.chain ? req.chain : 'eth';

    // Asynchronously fetch wallet stats, tokens, and net worth in parallel
    const statsPromise = fetch(`${baseURL}/wallets/${address}/stats?chain=${chain}`, {
      method: 'get',
      headers: { accept: 'application/json', 'X-API-Key': API_KEY }
    });

    const tokensPromise = fetch(`${baseURL}/wallets/${address}/tokens?chain=${chain}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': API_KEY
      }
    });

    // Initialize chart data for the last 90 days
    let chart_data = [];
    // Start from today
    let currentDate = new Date();

    for (let i = 0; i < 90; i++) {
        let formattedDate = currentDate.toISOString().split('T')[0];
        chart_data.push({ x: formattedDate, y: 0 });

        // Subtract a day for the next iteration
        currentDate.setDate(currentDate.getDate() - 1);
    }

    const days = moment().subtract(90, 'days').format('YYYY-MM-DD');
    let cursor = null;
    let all_txs = [];

    // Fetch transactions within the last 90 days
    do {

      const response = await fetch(`${baseURL}/${address}?${cursor ? `cursor=${cursor}&`:''}`+ new URLSearchParams({
          from_date: days,
          chain:chain
      }),{
        method: 'get',
        headers: {accept: 'application/json', 'X-API-Key': `${API_KEY}`}
      });

      const txs = await response.json();
      cursor = txs.cursor;
      
      if(txs.result) {
          for(let item of txs.result) {
              all_txs.push(item)
          }
      }

  } while (cursor !== "" && cursor !== null);

    // Process transaction data for chart
    if(all_txs.length > 0) {
      all_txs.forEach(function(data) {
          let blockDate = data.block_timestamp.split('T')[0];
          // Find the corresponding date in the chartArray
          let chartItem = chart_data.find(item => item.x === blockDate);

          if (chartItem) {
            chartItem.y += 1;
          }
      })
  }

  let chartArray = utilities.generateWeekArray(9);

  utilities.updateChartArrayByWeek(chartArray, all_txs);
  chartArray = chartArray.reverse()

    // Resolve promises for wallet stats, tokens, and net worth
    const [statsResponse, tokensResponse] = await Promise.all([statsPromise, tokensPromise]);
    const stats = await statsResponse.json();
    const tokens = await tokensResponse.json();

    let collector = false;
    if (Number(stats.nfts) > 20) {
      collector = true;
    }

    // Construct and return the response
    return res.status(200).json({
      addressOccurrences: utilities.findAddressOccurrences(all_txs, address),
      chartArray,
      stats,
      tokens: tokens.result,
      collector
    });

  } catch (e) {
    next(e);
  }
});
  
router.get('/api/wallet/networth', async function(req,res,next) {
  try {
    // const address = req.query.wallet;
    // const chain = req.chain ? req.chain : 'eth';

    // const fetch_networth = await fetch(`${baseURL}/wallets/${address}/net-worth?`+ new URLSearchParams({
    //   chain:chain
    // }),{
    //   method: 'get',
    //   headers: {accept: 'application/json', 'X-API-Key': `${API_KEY}`}
    // });

    // if (!fetch_networth.ok) {
    //   throw new Error(`Error fetching net-worth: ${fetch_networth.statusText}`);
    // }

    // let networth = await fetch_networth.json();
    // console.log(networth);
    // networth.total_networth_usd = utilities.formatPrice(networth.total_networth_usd);
    
    return res.status(200).json(200);
  } catch(e) {
    next(e);
  }
});

router.get('/api/wallets/:address/tokens/output', async function(req,res,next) {
  try {
    const address = req.params.address;
    const chain = req.query.chain ? req.query.chain : 'eth';

    const response = await fetch(`${baseURL}/wallets/${address}/tokens?chain=${chain}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
    });

    const tokens = await response.json()

    let markdownTable = `| Token | Chain | Price | Liquidity | Last price change |\n`;
    markdownTable += `|-------|-------|-------|-----------|-------------------|\n`;
    let new_tokens = [];

    for(let token of tokens.result) {
      const get_price = await fetch(`${baseURL}/erc20/${token.token_address}/price?chain=${chain}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
      });
      const price = await get_price.json();
      token.block = null;
      if(price && price.priceLastChangedAtBlock) {
        token.block = price.priceLastChangedAtBlock;

        const get_block = await fetch(`${baseURL}/block/${price.priceLastChangedAtBlock}?chain=${chain}`, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
              'X-API-Key': `${API_KEY}`
          }
        });
        const block = await get_block.json();
        token.last_updated = block.timestamp;
      }

      new_tokens.push(token)
    }

    new_tokens.forEach(token => {
      // Add row to markdown table. Empty strings for Liquidity and Last price change since not provided
      markdownTable += `| ${token.token_address} | ${chain} | ${token.usd_price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} | | ${token.last_updated}|\n`;
    });
    console.log(markdownTable);

    return res.status(200).json(markdownTable);
  } catch(e) {
    next(e);
  }
});

router.get('/api/wallets/:address/tokens/output/tx', async function(req,res,next) {
  try {
    const address = req.params.address;
    const chain = req.query.chain ? req.query.chain : 'eth';

    const response = await fetch(`${baseURL}/wallets/${address}/tokens?chain=${chain}&limit=30`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
    });

    const tokens = await response.json()

    let markdownTable = `| Token | Chain | Price |\n`;
    markdownTable += `|-------|-------|-------|\n`;
    let new_tokens = [];

    for(let token of tokens.result) {
      const get_price = await fetch(`${baseURL}/erc20/${token.token_address}/price?chain=${chain}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
      });
      const price = await get_price.json();
      token.block = null;

      const get_txs = await fetch(`${baseURL}/erc20/${token.token_address}/transfers?chain=${chain}&limit=1`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
      });
      const tx = await get_txs.json();
      token.last_tx = tx.result ? tx.result[0].block_timestamp : null;

      new_tokens.push(token)
    }

    new_tokens.forEach(token => {
      // Add row to markdown table. Empty strings for Liquidity and Last price change since not provided
      markdownTable += `| ${token.token_address} | ${chain} | ${token.usd_price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} | \n`;
    });
    console.log(markdownTable);

    return res.status(200).json(markdownTable);
  } catch(e) {
    next(e);
  }
});

router.get('/api/tokens/:address/check-price', async function(req,res,next) {
  try {
    const address = req.params.address;
    const chain = req.query.chain ? req.query.chain : 'eth';

    let block = 18585693;

    for (let index = 0; index < array.length; index++) {
      const element = array[index];
      
    }

    const response = await fetch(`${baseURL}/wallets/${address}/tokens?chain=${chain}&limit=30`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
    });

    const tokens = await response.json()

    let markdownTable = `| Token | Chain | Price |\n`;
    markdownTable += `|-------|-------|-------|\n`;
    let new_tokens = [];

    for(let token of tokens.result) {
      const get_price = await fetch(`${baseURL}/erc20/${token.token_address}/price?chain=${chain}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
      });
      const price = await get_price.json();
      token.block = null;

      const get_txs = await fetch(`${baseURL}/erc20/${token.token_address}/transfers?chain=${chain}&limit=1`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
      });
      const tx = await get_txs.json();
      token.last_tx = tx.result ? tx.result[0].block_timestamp : null;

      new_tokens.push(token)
    }

    new_tokens.forEach(token => {
      // Add row to markdown table. Empty strings for Liquidity and Last price change since not provided
      markdownTable += `| ${token.token_address} | ${chain} | ${token.usd_price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} | \n`;
    });
    console.log(markdownTable);

    return res.status(200).json(markdownTable);
  } catch(e) {
    next(e);
  }
});


router.get('/api/wallets/:address/check-prices', async function(req,res,next) {
  try {
    const address = req.params.address;
    const chain = req.query.chain ? req.query.chain : 'eth';

    let manual_networth = 0;
    let api_networth = 0;
    let cursor = null;

    do {

      const response = await fetch(`${baseURL}/wallets/${address}/tokens?chain=${chain}&exclude_spam=true&exclude_unverified_contracts=true&${cursor ? `cursor=${cursor}&`:''}`,{
        method: 'get',
        headers: {accept: 'application/json', 'X-API-Key': `${API_KEY}`}
      });

      const prices = await response.json();
      cursor = prices.cursor;
      
      if(prices.result) {
          for(let item of prices.result) {
            console.log(`Plus ${item.usd_value}`)
              manual_networth += item.usd_value;
          }
      }

  } while (cursor !== "" && cursor !== null);


  const networth_response = await fetch(`${baseURL}/wallets/${address}/net-worth?chains=${chain}&exclude_spam=true&exclude_unverified_contracts=true`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
    });
    console.log(networth_response)

  const networth = await networth_response.json()
  console.log(networth)
  api_networth = networth.total_networth_usd;

  console.log(`Wallet ${address}, token balances total: ${manual_networth.toFixed(2)}; networth endpoint: ${api_networth}`);

    return res.status(200).send(`Wallet ${address}, token balances total: ${manual_networth.toFixed(2)}; networth endpoint: ${api_networth}`);
  } catch(e) {
    next(e);
  }
});



import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to chunk the addresses array into smaller arrays of size n
function chunkArray(array, size) {
  const chunkedArr = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
}

// Function to post a chunk of addresses
async function postAddresses(chunk,chainId,count) {
  try {
    const response = await fetch(`https://${chainId}-erc20-contract-api.aws-prod-api-usecases-1-vpn.moralis.io/spamAddresses`, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addresses: chunk }),
    });

    if (response.status === 201) {
        console.log(`Chunk ${count} processed successfully.`);
        return; // Exit the function as processing was successful
    } else if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }


    const data = await response.json();
    console.log(data); // Process your response data here
  } catch (error) {
    console.error('Error posting address chunk:', error);
  }
}

router.get('/api/spam/:chainId/erc20', async function(req,res,next) {
  const chainId = req.params.chainId;
  const csvFilePath = path.join(__dirname, '..', `${chainId}-erc20-spam.csv`);
  let count = 1;
  fs.readFile(csvFilePath, 'utf8', async (err, fileContent) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading the CSV file' });
    }

    try {
      const fileContent = await fsPromises.readFile(csvFilePath, 'utf8');
      const parsed = Papa.parse(fileContent, { header: false });
      let addresses = parsed.data.flat();
      addresses = addresses.filter(address => address.trim() !== "");
      const chunks = chunkArray(addresses, 500);

      for (const chunk of chunks) {
        await postAddresses(chunk,chainId,count);
        count++;
      }

      res.status(200).json({ message: 'All address chunks processed.' });
    } catch (error) {
      next(error)
    }
  });

});




function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        Papa.parse(data, {
          header: true, // Assumes the first row of CSV are headers
          dynamicTyping: true, // Automatically converts strings to numbers, booleans, etc.
          complete: (results) => resolve(results.data),
          error: (error) => reject(error),
        });
      }
    });
  });
}

function findDifferences(original, updated) {
  // Create a set of composite keys for updated rows
  const updatedSet = new Set(updated.map(row => `${row.ChainId},${row.CoinAddress}`));
  
  // Filter original rows that do not exist in updated rows based on composite key
  return original.filter(row => !updatedSet.has(`${row.ChainId},${row.CoinAddress}`));
}




router.get('/api/spam/compare', async function(req,res,next) {
  const originalCsvPath = path.join(__dirname, '..', `moralisScoreEqZero-original.csv`);
  const updatedCsvPath = path.join(__dirname, '..', `moralisScoreEqZero-updated.csv`);
  Promise.all([readCsv(originalCsvPath), readCsv(updatedCsvPath)])
  .then(([originalRows, updatedRows]) => {
    const differences = findDifferences(originalRows, updatedRows);
    console.log('Rows in the original file but not in the updated file:', differences);
  })
  .catch(error => console.error('Error processing CSV files:', error));

});

const tokens = [
  "0x6329ad1587aa86ae5f0dd9c72802aa2ce5397492",
  "0x3b85ae7095648660f94a70f4896a258e310096db",
  "0x3be2ac9a84a7468fe2857f45d1706c107f34a881",
  "0x3dffbbf286ac6e0a0385ab5c273fb948e78bf9d2",
  "0xa47e1a9fe103b0bcb7e7c8404d0c1242d0244205",
  "0xfc993276e9b5301ee7b4f1a921250149e8894eb5",
  "0x40313648aa45c673cfc852dceb31be203dd96d8a",
  "0xa34d0838467b19e0f6eb2451aa64b819cd296157",
  "0x69c0b2d2f02792c5b80cbc50ac0a2c46753c9d5a",
  "0xf36f6e4c768395a8cdb160da3895c89586d526bd",
  "0x5c8c33ccfb1105ff9376d10c3de793c073d127ef",
  "0x9fbe0641482a35d50689bb915f459b08fc2ed7f3",
  "0x72d32ba47a880dec08f7047d0ed7d3b170aa71c7",
  "0xefb21abe4e41e1645d492017960140d3e6ed1e6c",
  "0x242e2469a0f2d3df84190125e03313d941779818",
  "0xb7c62a4a1cbd880f7d33d1e60414e7ea8308725f",
  "0x817d3d95664de7ea5daf200f9d14bf651a44ef7d",
  "0x2e6f1150a822efc4a12a89ad32df647804a3c89e",
  "0x984166513543e322c30d733c2a774708d45698b7",
  "0x872b00181998c7ce289af6c71a091a5cd903ff85",
  "0x678137ae738480bda7a190b1be2c6ab932228eb5",
  "0x96b5bc1cd7adff6802ed811da4bd0fb6110a10b8",
  "0x5557c0a2b80ad1ee7902fbb065687c8bd694e41d",
  "0xb54e3f9273efea6eaa67744b30f68640df30ad21",
  "0x4a82dae2d7731470449f0321a0e8c5439973c464"
]
router.get('/api/token-checker/:chain', async function(req,res,next) {
  try {
    const chain = req.params.chain;
    let spam = [];
    for(const address of tokens) {
      const response = await fetch(`${baseURL}/erc20/metadata?addresses=${address}&chain=${chain}`, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
              'X-API-Key': `${API_KEY}`
          }
      });
      
      if (!response.ok) {
        console.log(response.statusText)
        const message = await response.json();
        throw new Error(message);
      }
      let token = await response.json();
      console.log(`${token[0].possible_spam ? 'SPAM' : 'NOT SPAM'}: ${token[0].name}`);
      if(token[0].possible_spam) {
        spam.push(address)
      }
    }

    console.log('----')
    console.log(`${spam.length} spam contracts:`)
    console.log(spam);
    return res.status(200).json(spam);
  } catch(e) {
    next(e);
  }

});

export default router;