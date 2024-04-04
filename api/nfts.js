import express from 'express';
import fetch from 'node-fetch';
import moment from 'moment';
import { ethers } from 'ethers';
import * as utilities from './utilities.js';

const router = express.Router();
const chains = ['eth', 'polygon', 'bsc', 'optimism', 'fantom', 'avalanche', 'arbitrum', 'cronos', 'palm'];
const API_KEY = "HsPkTtNaTcNOj8TWnAG2ZvcjOIzW82gUZMATjQ4tOcHa30wES5GkHgbWAq5pG3Fu";
const baseURL = "https://deep-index.moralis.io/api/v2.2";

router.get('/api/wallet/nfts', async function(req,res,next) {
    try {
        const address = req.query.wallet;
        const chain = req.query.chain ? req.query.chain : 'eth';
        let nfts = [];
        let cursor = null;
        let page = 0;
        do {
            const response = await fetch(`${baseURL}/${address}/nft?chain=${chain}&exclude_spam=false&normalizeMetadata=true&media_items=true&include_prices=true&cursor=${cursor}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-API-Key': `${API_KEY}`
                }
            });
    
            if (!response.ok) {
                console.log(response.statusText)
                const message = await response.json();
            }
    
            const data = await response.json();
            
            console.log(`Got page ${data.page}`);
            if(data.result && data.result.length > 0) {
                for(const nft of data.result) {
                    nfts.push(nft);
                }
            }
            
            cursor = data.cursor;

            page = data.page;
            if(page > 12) {
                break;
            }
        } while (cursor != "" && cursor != null);


        
        return res.status(200).json(nfts);
    } catch(e) {
        next(e);
    }
});


router.get('/api/wallet/nfts/spam', async function(req,res,next) {
    try {
        const address = req.query.wallet;
        const chain = req.query.chain ? req.query.chain : 'eth';
        let nfts = [];
        let cursor = null;
        let page = 0;
        let totalCount = 0;
        let spamCount = 0;
        let notSpamCount = 0;
        let verifiedCount = 0;
        do {
            const response = await fetch(`${baseURL}/${address}/nft/collections?chain=${chain}&cursor=${cursor}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-API-Key': `${API_KEY}`
                }
            });
    
            if (!response.ok) {
                console.log(response.statusText)
                const message = await response.json();
            }
    
            const data = await response.json();
            
            console.log(`Got page ${data.page}`);
            if(data.result && data.result.length > 0) {
                for(const nft of data.result) {
                    totalCount += 1;
                    if(nft.possible_spam) {
                        spamCount += 1;
                        console.log(`${nft.token_address} spam`)
                    } else {
                        notSpamCount += 1;
                        console.log(`${nft.token_address} not spam`)
                    }

                    if(nft.verified_collection) {
                        verifiedCount += 1;
                    }
                }
            }
            
            cursor = data.cursor;

            page = data.page;
        } while (cursor != "" && cursor != null);


        console.log(`Total NFT Collections: ${totalCount}`);
        console.log(`Spam NFT Collections: ${spamCount}`);
        console.log(`Non-spam NFT Collections: ${notSpamCount}`);
        console.log(`Verified NFT Collections: ${verifiedCount}`);
        return res.status(200).json(200);
    } catch(e) {
        next(e);
    }
});

router.get('/api/wallet/nfts/:address/:token_id', async function(req,res,next) {
    try {
        const address = req.params.address;
        const token_id = req.params.token_id;
        const chain = req.query.chain ? req.query.chain : 'eth';
        const response = await fetch(`${baseURL}/nft/${address}/${token_id}?chain=${chain}&normalizeMetadata=true&media_items=true&include_prices=true`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-API-Key': `${API_KEY}`
            }
        });

        if (!response.ok) {
            console.log(response.statusText)
            const message = await response.json();
        }

        const nft = await response.json();

        if(nft) {

            const get_transfer = await fetch(`${baseURL}/nft/${address}/${token_id}/transfers?chain=${chain}&limit=1`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-API-Key': `${API_KEY}`
                }
            });

            const transfer = await get_transfer.json();
            nft.transfer_event = transfer.result[0];
            nft.received_at = transfer.result[0].block_timestamp;
            nft.received_at_label = moment(transfer.result[0].block_timestamp).fromNow();
            if(nft.transfer_event.value !== "0") {
                nft.transfer_event.type = "Purchased"
                nft.transfer_event.value_decimals = ethers.formatUnits(nft.transfer_event.value, 18);
            }

            if(nft.transfer_event.from_address === "0x0000000000000000000000000000000000000000") {
                nft.transfer_event.type = "Minted"
            }

            if(nft.transfer_event.value === "0" && nft.transfer_event.from_address !== "0x0000000000000000000000000000000000000000") {
                nft.transfer_event.type = "Received"
            }

            if(nft.transfer_event.operator) {
                nft.transfer_event.type = "Airdropped"
            }
        }


        return res.status(200).json(nft);
    } catch(e) {
        next(e);
    }
});

export default router;