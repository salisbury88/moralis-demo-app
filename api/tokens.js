import express from 'express';
import fetch from 'node-fetch';
import moment from 'moment';
import { ethers } from 'ethers';
import * as utilities from './utilities.js';
import * as defiTokens from './defiTokens.js';

const router = express.Router();
const API_KEY = "HsPkTtNaTcNOj8TWnAG2ZvcjOIzW82gUZMATjQ4tOcHa30wES5GkHgbWAq5pG3Fu";
const baseURL = "https://deep-index.moralis.io/api/v2.2";
const uniswapV3Positions = "0xc36442b4a4522e871399cd717abdd847ab11fe88";
const lidoAddress = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";

router.get('/api/wallet/tokens', async function(req,res,next) {
    try {
      const address = req.query.wallet;
      const chain = req.query.chain ? req.query.chain : 'eth';
      const response = await fetch(`${baseURL}/${address}/erc20?chain=${chain}`, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
              'X-API-Key': `${API_KEY}`
          }
      });
      
      if (!response.ok) {
        console.log(response.statusText)
        const message = await response.json();
        if(message && message.message === "Cannot fetch token balances as wallet contains over 2000 tokens. Please contact support for further assistance.")
        return res.status(200).json({verified_tokens:[],unsupported:true});
      }
      const data = await response.json();

      let verified_tokens = [];
      let spam_tokens = [];

      const foundChain = utilities.chains.find(item => item.chain === chain);
      for(const token of data) {
        token.amount = ethers.formatUnits(token.balance, token.decimals);
       
        if(!token.logo) {
            token.logo = `https://d23exngyjlavgo.cloudfront.net/${foundChain.id}_${token.token_address}`;

        }
        if(!token.possible_spam) {
            verified_tokens.push(token);
        } else {
            spam_tokens.push(token);
        }
      }

    const chunkedTokens = utilities.chunkArray([...verified_tokens], 25);
    const pricesResults = await Promise.all(chunkedTokens.map(chunk => utilities.fetchPricesForChunk(chunk, chain)));
    
    // Merge price data into the verified_tokens
    for (let i = 0; i < verified_tokens.length; i++) {
        // Here, assuming that both your token and price data can be matched by a unique 'id'
        const matchingPrice = pricesResults.flat().find(priceData => priceData.tokenAddress === verified_tokens[i].token_address);
        if (matchingPrice) {
            verified_tokens[i].price = utilities.formatPrice(matchingPrice.usdPriceFormatted);
            verified_tokens[i].percentChange = matchingPrice["24hrPercentChange"];
            verified_tokens[i].value = parseFloat(verified_tokens[i].amount) * parseFloat(matchingPrice.usdPriceFormatted);
            verified_tokens[i].value = utilities.formatPrice(verified_tokens[i].value);
            verified_tokens[i].valueChange = parseFloat(verified_tokens[i].value) * parseFloat(matchingPrice["24hrPercentChange"] / 100);
        }
    }

    
    verified_tokens = verified_tokens.sort(customSortDescending);
    const verified_tokens_sorted = [
        ...verified_tokens.filter(obj => obj.value !== undefined),
        ...verified_tokens.filter(obj => obj.value === undefined)
      ];



      const get_balance = await fetch(`${baseURL}/${address}/balance?chain=${req.chain}`,{
        method: 'get',
        headers: {accept: 'application/json', 'X-API-Key': `${API_KEY}`}
      });
  
      const balance = await get_balance.json();
      console.log(balance)

      const nativePrice = await utilities.getNativePrice(req.chain);
      const nativeValue = nativePrice.usdPrice * Number(ethers.formatEther(balance.balance));

      let indexToInsert = 1; // Inserting at index 1
      verified_tokens_sorted.splice(0, 0, {
        token_address: String(foundChain.wrappedTokenAddress).toLowerCase(),
        symbol: nativePrice.nativePrice.symbol,
        name: nativePrice.nativePrice.name,
        logo: `/images/${chain}-icon.png`,
        decimals: 18,
        amount: ethers.formatEther(balance.balance),
        balance: balance.balance,
        possible_spam: false,
        price: utilities.formatPrice(nativePrice.usdPrice),
        percentChange: 0,
        value: utilities.formatPrice(nativeValue),
        valueChange: 0,
      });

      console.log(foundChain.wrappedTokenAddress)


    return res.status(200).json({
        verified_tokens:verified_tokens_sorted,
        spam_tokens
    });

    } catch(e) {
      next(e);
    }
});
const customSortDescending = (a, b) => {
    const numA = parseFloat((a.value || "0").replace(/,/g, ""));
    const numB = parseFloat((b.value || "0").replace(/,/g, ""));
  
    // If 'value' is undefined in one of the objects, place it at the bottom
    if (isNaN(numA) && isNaN(numB)) return 0; // No change in position
    if (isNaN(numA)) return 1; // a is placed after b (bottom)
    if (isNaN(numB)) return -1; // b is placed after a (bottom)
  
    return numB - numA; // Sort in descending order (highest to lowest)
  };

router.get('/api/wallet/tokens/:address', async function(req,res,next) {
    try {
      const address = req.params.address;
      const chain = req.query.chain ? req.query.chain : 'eth';
      
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
      token = token[0];
    
    const get_block = await fetch(`${baseURL}/dateToBlock?chain=${chain}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
    });
    
    if (!get_block.ok) {
      console.log(get_block.statusText)
      const message = await get_block.json();
      throw new Error(message);
    }

    let block = await get_block.json();

    let tokens = [{
        token_address:address,
        to_block:block.block
    }];


    const date = new Date(new Date().getTime() - 60000);
    let date_blocks = [{
        block:block.block,
        date: date.toISOString()
    }];

    for (let i = 1; i <= 6; i++) {
        
        date.setDate(date.getDate() - 1);
        date.setHours(0, 0, 0, 0); // Reset time to midnight (00:00:00.000)
        const dateString = date.toISOString();
        const get_specific_block = await fetch(`${baseURL}/dateToBlock?chain=${chain}&date=${dateString}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-API-Key': `${API_KEY}`
            }
        });

        let specific_block = await get_specific_block.json();
        tokens.push({
            token_address:address,
            to_block:specific_block.block
        });

        date_blocks.push({
            block: specific_block.block,
            date: dateString
        });

    }

    const get_prices = await fetch(`${baseURL}/erc20/prices?include=percent_change&chain=${chain}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': `${API_KEY}`
        },
        body: JSON.stringify({
          "tokens": tokens
        })
    });

    const prices = await get_prices.json();

    let price_data = [];

    let exchange = {};
    if(prices[0]) {
        exchange = {
            name: prices[0].exchangeName,
            address: prices[0].exchangeAddress
        }
    }

    for(const price of prices) {
        if(price) {
            price_data.push({
                x: date_blocks.find(item => String(item.block) === price.toBlock).date,
                y: price.usdPriceFormatted
            });
        }
    }

    const currentPrice = prices.at(0)?.usdPriceFormatted;
    const lastPrice = Number(price_data.at(0)?.y);
    const firstPrice = Number(price_data.at(-1)?.y);
    const threshold = 0.0001;
    
    
    let direction = firstPrice <= lastPrice ? "up" : "down";

    let percentageChange = ((lastPrice - firstPrice) / firstPrice) * 100;
    if (Math.abs(percentageChange) < threshold) {
        percentageChange = 0;
    }
    percentageChange = percentageChange.toFixed(2);

            
    let usdChange = lastPrice - firstPrice;
    usdChange = utilities.formatPrice(usdChange);

    console.log(price_data);
    console.log(`First price: ${firstPrice}`)
    console.log(`Last price: ${lastPrice}`)
    console.log(`$ Change: ${usdChange}`)


    console.log(`Direction: ${direction}`); 
    console.log(`Price Change: ${percentageChange}%`);

    price_data.reverse();
    console.log(direction)
    if(!token.logo) {
        const foundChain = utilities.chains.find(item => item.chain === chain);
        console.log(foundChain)
        token.logo = `https://d23exngyjlavgo.cloudfront.net/${foundChain.id}_${token.address}`;
    }

    //Get block minted
    const get_block_minted = await fetch(`${baseURL}/block/${token.block_number}?chain=${chain}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
    });
    
    if (!get_block_minted.ok) {
      console.log(get_block_minted.statusText)
      const message = await get_block_minted.json();
      throw new Error(message);
    }

    const block_minted = await get_block_minted.json();

    let block_created = {
        timestamp: block_minted.timestamp,
        timestamp_label: moment(block_minted.timestamp).fromNow(),
        block_number: block_minted.number
    }

    // Get recent transfers
    const get_token_transfers = await fetch(`${baseURL}/erc20/${token.address}/transfers?chain=${chain}&limit=10`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
    });
    
    if (!get_token_transfers.ok) {
      console.log(get_token_transfers.statusText)
      const message = await get_token_transfers.json();
      throw new Error(message);
    }

    let token_transfers = await get_token_transfers.json();
    token_transfers = token_transfers.result;
    
    return res.status(200).json({
        token, block_minted:block_created, price_data, token_transfers, direction, exchange, currentPrice:utilities.formatPrice(currentPrice), percentageChange, usdChange,
    });

    } catch(e) {
      next(e);
    }
});


router.get('/api/wallet/defi', async function(req,res,next) {
    try {
        let defiPositions = [{
            protocol: "Aave v2",
            protocolId: "aave-v2",
            protocolUrl: "https://app.aave.com/",
            protocolLogo: "https://protocol-icons.s3.amazonaws.com/icons/aave.jpg",
            positions:[],
            totalUsd: 0
        },{
            protocol: "Aave v3",
            protocolId: "aave-v3",
            protocolUrl: "https://app.aave.com/",
            protocolLogo: "https://protocol-icons.s3.amazonaws.com/icons/aave-pool-v3.jpg",
            positions: [],
            totalUsd: 0
        },{
            protocol: "Lido",
            protocolId: "lido",
            protocolUrl: "https://stake.lido.fi/",
            protocolLogo: "https://protocol-icons.s3.amazonaws.com/icons/lido.jpg",
            positions: [],
            totalUsd: 0
        },{
            protocol: "Uniswap v2",
            protocolId: "uniswap-v2",
            protocolUrl: "https://v2.info.uniswap.org/home",
            protocolLogo: "https://protocol-icons.s3.amazonaws.com/icons/uniswap-v2.jpg",
            positions: [],
            totalUsd: 0
        },{
            protocol: "Uniswap v3",
            protocolId: "uniswap-v3",
            protocolUrl: "https://info.uniswap.org/#/",
            protocolLogo: "https://protocol-icons.s3.amazonaws.com/icons/uniswap-v3.jpg",
            positions: [],
            totalUsd: 0
        }];
      const address = req.query.wallet;
      const chain = req.query.chain ? req.query.chain : 'eth';
      const response = await fetch(`${baseURL}/${address}/erc20?chain=${chain}`, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
              'X-API-Key': `${API_KEY}`
          }
      });
      
      if (!response.ok) {
        console.log(response.statusText)
        const message = await response.json();
        if(message && message.message === "Cannot fetch token balances as wallet contains over 2000 tokens. Please contact support for further assistance.")
        return res.status(200).json({verified_tokens:[],unsupported:true});
      }
      const data = await response.json();

      let totalUsdValue = 0;
      let activeProtocols = 0;
      let totalDeFiPositions = 0;

      const foundChain = utilities.chains.find(item => item.chain === chain);
      
      for(const token of data) {
        
        token.amount = ethers.formatUnits(token.balance, token.decimals);
        if(!token.logo) {
            token.logo = `https://d23exngyjlavgo.cloudfront.net/${foundChain.id}_${token.token_address}`;
        }

        let defi_token = defiTokens.aaveV3Tokens.find(e => String(e.aTokenAddress).toLowerCase() === String(token.token_address).toLowerCase());
        if(defi_token) {
            const price = await utilities.fetchSinglePrice(defi_token.tokenAddress,chain);
            defi_token.balance = token.amount;
            defi_token.tokenPrice = price.price;
            defi_token.tokenPriceChange = price.change;
            defi_token.balanceUsd = Number(defi_token.tokenPrice) * Number(defi_token.balance);
            defi_token.tokenPrice = utilities.formatPrice(defi_token.tokenPrice);
            defi_token.tokenLogo = `https://d23exngyjlavgo.cloudfront.net/${foundChain.id}_${defi_token.tokenAddress}`;
            defi_token.balanceUsd = Number(utilities.formatPrice(defi_token.balanceUsd))

            let position = defiPositions.find(e => e.protocolId === "aave-v3");
            position.positions.push(defi_token);
            position.totalUsd += defi_token.balanceUsd;
            position.totalUsd = Number(utilities.formatPrice(position.totalUsd));
            
            totalUsdValue += defi_token.balanceUsd;
            totalDeFiPositions++;
            continue;
        }

        if(String(token.token_address).toLowerCase() === String(lidoAddress).toLowerCase()) {
            const price = await utilities.fetchSinglePrice(token.token_address,chain);
            defi_token = {};
            defi_token.tokenAddress = token.token_address;
            defi_token.tokenName = token.name;
            defi_token.tokenSymbol = token.symbol;
            defi_token.balance = token.amount;
            defi_token.tokenPrice = price.price;
            defi_token.tokenPriceChange = price.change;
            defi_token.balanceUsd = Number(defi_token.tokenPrice) * Number(defi_token.balance);
            defi_token.tokenPrice = utilities.formatPrice(defi_token.tokenPrice);
            defi_token.tokenLogo = `https://d23exngyjlavgo.cloudfront.net/${foundChain.id}_${defi_token.tokenAddress}`;
            defi_token.balanceUsd = Number(utilities.formatPrice(defi_token.balanceUsd));

            let position = defiPositions.find(e => e.protocolId === "lido");
            position.positions.push(defi_token);
            position.totalUsd += defi_token.balanceUsd;
            position.totalUsd = Number(utilities.formatPrice(position.totalUsd));
            
            totalUsdValue += defi_token.balanceUsd;
            totalDeFiPositions++;
            continue;
        }

      }

    
    const get_nfts = await fetch(`${baseURL}/${address}/nft?chain=${chain}&normalizeMetadata=true&token_addresses=${uniswapV3Positions}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
    });
    
    if (!get_nfts.ok) {
      console.log(get_nfts.statusText)
      const message = await get_nfts.json();
      throw new Error(message);
    }
    const nfts = await get_nfts.json();
    
    if(nfts.result && nfts.result.length > 0) {
        console.log('has results')
        for(let nft of nfts.result) {
            nft.positionDetails = utilities.extractMetadataInfo(nft.normalized_metadata)
        }
        let position = defiPositions.find(e => e.protocolId === "uniswap-v3");
        position.positions = nfts.result;
        totalDeFiPositions += nfts.result.length
        console.log(position)
    }
    
    for (let protocol of defiPositions) {
        if (protocol.positions.length > 0) {
            activeProtocols++;
        }
    }

    return res.status(200).json({defiPositions,totalDeFiPositions, totalUsdValue: utilities.formatPrice(totalUsdValue), activeProtocols});

    } catch(e) {
      next(e);
    }
});


router.get('/api/wallet/defi/:address', async function(req,res,next) {
    try {
        const address = req.query.wallet;
        if(!address) throw new Error("Please provide a wallet address.");

        const chain = req.query.chain ? req.query.chain : 'eth';
        const tokenAddress = req.params.address;


        const get_block = await fetch(`${baseURL}/dateToBlock?chain=${chain}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-API-Key': `${API_KEY}`
            }
        });

        let block = await get_block.json();

        let token_balances = [{
            token_address:tokenAddress,
            to_block:block.block
        }];


        const date = new Date(new Date().getTime() - 60000);
        let date_blocks = [{
            block:block.block,
            date: date.toISOString()
        }];

        for (let i = 1; i <= 7; i++) {
            
            date.setDate(date.getDate() - 1);
            date.setHours(13, 0, 0, 0); // Reset time to midnight (00:00:00.000)
            const dateString = date.toISOString();
            let get_specific_block = await fetch(`${baseURL}/dateToBlock?chain=${chain}&date=${dateString}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-API-Key': `${API_KEY}`
                }
            });

            let specific_block = await get_specific_block.json();
            token_balances.push({
                token_address:tokenAddress,
                exchange: "uniswapv2",
                to_block:specific_block.block
            });

            date_blocks.push({
                block: specific_block.block,
                date: dateString
            });

        }
        token_balances.reverse();

        const prices = await utilities.fetchHistoricalPrices(token_balances, chain);

        let balances = [];

        // Assuming token_balances is an array containing token balances over time
        for (let i = 0; i < token_balances.length; i++) {
            let currentBalance = await fetchBalance(token_balances[i],address,chain,tokenAddress); // Fetch current balance
            
            let received = 0;
            // if (i === token_balances.length - 1) {
            //     received = 'Initial Balance';
            // } else {
            //     let previousBalance = i === 0 ? currentBalance : balances[i - 1].new_balance;
            //     received = currentBalance - previousBalance;
            // }

            if(balances.length === 0) {
                balances.push({
                    new_balance: currentBalance,
                    new_balance_decimals: ethers.formatUnits(currentBalance, 18),
                    received: 0,
                    block: token_balances[i].to_block,
                    timestamp: date_blocks.find(item => String(item.block) === String(token_balances[i].to_block)).date,
                    timestampLabel: moment(date_blocks.find(item => String(item.block) === String(token_balances[i].to_block)).date).format('Do MMM YYYY'),
                    tokenPrice: prices.find(item => String(item.toBlock) === String(token_balances[i].to_block)).usdPrice,
                    receivedUsd: 0
                });
            } else {
                received = Number(ethers.formatEther(currentBalance)) - Number(balances[i-1].new_balance_decimals);
                console.log('------')
                console.log(Number(currentBalance))
                console.log(Number(balances[i-1].new_balance_decimals))
                console.log(`Received`)
                console.log(received)
                balances.push({
                    new_balance: currentBalance,
                    new_balance_decimals: ethers.formatUnits(currentBalance, 18),
                    received: received,
                    block: token_balances[i].to_block,
                    timestamp: date_blocks.find(item => String(item.block) === String(token_balances[i].to_block)).date,
                    timestampLabel: moment(date_blocks.find(item => String(item.block) === String(token_balances[i].to_block)).date).format('Do MMM YYYY'),
                    tokenPrice: utilities.formatPrice(prices.find(item => String(item.toBlock) === String(token_balances[i].to_block)).usdPrice),
                    receivedUsd: utilities.formatPrice(received * prices.find(item => String(item.toBlock) === String(token_balances[i].to_block)).usdPrice)
                });
            }

            
        }
        balances.reverse();
        console.log(balances);


        return res.status(200).json(balances);
    } catch(e) {
        next(e);
    }
});


async function fetchBalance(tokenBalance, address, chain, tokenAddress) {
    let getBalances = await fetch(`${baseURL}/${address}/erc20?chain=${chain}&token_addresses=${tokenAddress}&to_block=${tokenBalance.to_block}`, {
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
    });

    let balanceData = await getBalances.json();
    return balanceData[0].balance;
}

export default router;