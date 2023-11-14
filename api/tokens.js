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
            verified_tokens[i].valueChange = parseFloat(verified_tokens[i].value) * parseFloat(matchingPrice["24hrPercentChange"] / 100);
        }
    }

    verified_tokens.sort((a, b) => b.value - a.value);

    return res.status(200).json({
        verified_tokens,
        spam_tokens
    });

    } catch(e) {
      next(e);
    }
});


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
    
    if (!response.ok) {
      console.log(response.statusText)
      const message = await response.json();
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
        
        date.setDate(date.getDate() - i);
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


          // Fetch provenance
      // Fetch total transfers
    return res.status(200).json({
        token, price_data, direction, exchange, currentPrice:utilities.formatPrice(currentPrice), percentageChange, usdChange,
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


export default router;