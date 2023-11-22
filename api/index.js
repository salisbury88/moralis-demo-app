import express from 'express';
import fetch from 'node-fetch';
import moment from 'moment';
import { ethers } from 'ethers';
import * as utilities from './utilities.js';

const router = express.Router();
const chains = ['eth', 'polygon', 'bsc', 'fantom', 'avalanche', 'arbitrum', 'cronos', 'palm'];
const API_KEY = "HsPkTtNaTcNOj8TWnAG2ZvcjOIzW82gUZMATjQ4tOcHa30wES5GkHgbWAq5pG3Fu";
const baseURL = "https://deep-index.moralis.io/api/v2.2";

router.get('/api', async function(req,res,next) {
    try {
      res.json({ message: 'Hello from the backend!' });
    } catch(e) {
      next(e);
    }
});  
  
router.post('/api/wallet', async function(req,res,next) {
    try {
      let address = req.body.address;
      let ens;
      let unstoppable;

      if(address.indexOf(".eth") > -1) {
        const get_domain = await fetch(`${baseURL}/resolve/ens/${address}`, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
              'X-API-Key': `${API_KEY}`
          }
        });

        let domain = await get_domain.json();
        address = domain.address;
        ens = req.body.address;
      }

      if(!ens) {
        const get_ens = await fetch(`${baseURL}/resolve/${address}/reverse`, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
              'X-API-Key': `${API_KEY}`
          }
        });
  
        let ens_domain = await get_ens.json();
        ens = ens_domain.address;
      }

      const get_ud = await fetch(`${baseURL}/resolve/${address}/domain`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-Key': `${API_KEY}`
        }
      });

      let ud_domain = await get_ud.json();
      unstoppable = ud_domain.name;


      let isWhale = false;
      let earlyAdopter = false;
      let multiChainer = false;
      let speculator = false;
      let isFresh = false;
  
      const queryString = chains.map(chain => `chains=${chain}`).join('&');
  
      const response = await fetch(`${baseURL}/wallets/${address}/chains?${queryString}`, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
              'X-API-Key': `${API_KEY}`
          }
      });
      console.log(response)
      
      if (!response.ok) {
        throw new Error(`Error fetching chains: ${response.statusText}`);
      }
      const active_chains = await response.json();
  
      console.log('Action chains:')
      console.log(active_chains)
  
      const get_balance = await fetch(`${baseURL}/${address}/balance?chain=${req.chain}`,{
        method: 'get',
        headers: {accept: 'application/json', 'X-API-Key': `${API_KEY}`}
      });
  
      const balance = await get_balance.json();
      console.log(balance)

      const nativePrice = await utilities.getNativePrice(req.chain);
      const nativeValue = nativePrice.usdPrice * Number(ethers.formatEther(balance.balance));
      const nativeToken = nativePrice.nativePrice.symbol;
      const nativeNetworth = {
        nativePrice, nativeValue:utilities.formatPrice(nativeValue), nativeToken, nativeBalance: utilities.formatNumber(ethers.formatEther(balance.balance))
      }
      console.log(`Native price ${nativePrice.usdPrice}, balance is ${Number(ethers.formatEther(balance.balance))}, value is ${nativeValue} ${nativeToken}`);
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
  
      console.log(`wallet age ${walletAge}`)
      if(new Date(firstSeenDate) > new Date(one_day_ago)) isFresh = true;
  
  
      if(wallet_chains.length > 1) multiChainer = true;
      
      console.log(`Time to return`)
      return res.status(200).json({address,nativeNetworth,
        active_chains:wallet_chains, walletAge, firstSeenDate, lastSeenDate, ens,unstoppable,
        isWhale, earlyAdopter,multiChainer,speculator,balance:balance.balance, moment, isFresh
      });
    } catch(e) {
      next(e);
    }
  });
  
  router.get('/api/wallet/profile', async function(req,res,next) {
    try {
        
        const address = req.query.wallet;
        const chain = req.chain ? req.chain : 'eth';
        
        const get_stats = await fetch(`${baseURL}/wallets/${address}/stats?chain=${chain}`,{
          method: 'get',
          headers: {accept: 'application/json', 'X-API-Key': `${API_KEY}`}
        });

        const stats = await get_stats.json();


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

        const uniqueAddressList = utilities.findUniqueAddresses(all_txs);

        const addressOccurrences = utilities.findAddressOccurrences(all_txs,address);

        const response = await fetch(`${baseURL}/${address}/erc20?chain=${chain}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-API-Key': `${API_KEY}`
            }
        });
        
        let tokens = [];
        const foundChain = utilities.chains.find(item => item.chain === chain);
        console.log(foundChain)
        if (response.ok) {
            tokens = await response.json();
            for(const token of tokens) {
              token.amount = ethers.formatUnits(token.balance, token.decimals);

              if(!token.logo) {
                token.logo = `https://d23exngyjlavgo.cloudfront.net/${foundChain.id}_${token.token_address}`;
              }
            }
        }

        let collector = false;
        if(Number(stats.nfts) > 20) {
          collector = true;
        }


        const get_balance = await fetch(`${baseURL}/${address}/balance?chain=${req.chain}`,{
          method: 'get',
          headers: {accept: 'application/json', 'X-API-Key': `${API_KEY}`}
        });
    
        const balance = await get_balance.json();
        console.log(balance)

        const nativePrice = await utilities.getNativePrice(req.chain);
        const nativeValue = nativePrice.usdPrice * Number(ethers.formatEther(balance.balance));
        const nativeToken = nativePrice.nativePrice.symbol;
        const nativeNetworth = {
          nativePrice, nativeValue:utilities.formatPrice(nativeValue), nativeToken, nativeBalance: utilities.formatNumber(ethers.formatEther(balance.balance))
        }

        return res.status(200).json({addressOccurrences,nativeNetworth,chartArray,stats,tokens,collector});

    } catch(e) {
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

export default router;