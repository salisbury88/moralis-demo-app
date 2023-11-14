import express from 'express';
import fetch from 'node-fetch';
import moment from 'moment';
import { ethers } from 'ethers';
import * as utilities from './utilities.js';

const router = express.Router();
const chains = ['eth', 'polygon', 'bsc', 'fantom', 'avalanche', 'arbitrum', 'cronos', 'palm'];
const API_KEY = "HsPkTtNaTcNOj8TWnAG2ZvcjOIzW82gUZMATjQ4tOcHa30wES5GkHgbWAq5pG3Fu";
const baseURL = "https://deep-index.moralis.io/api/v2.2";

router.get('/api/wallet/nfts', async function(req,res,next) {
    try {
        const address = req.query.wallet;
        const chain = req.query.chain ? req.query.chain : 'eth';
        const response = await fetch(`${baseURL}/${address}/nft?chain=${chain}&exclude_spam=true&normalizeMetadata=true&media_items=true`, {
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
        return res.status(200).json(data.result);
    } catch(e) {
        next(e);
    }
});

router.get('/api/wallet/nfts/:address/:token_id', async function(req,res,next) {
    try {
        const address = req.params.address;
        const token_id = req.params.token_id;
        const chain = req.query.chain ? req.query.chain : 'eth';
        const response = await fetch(`${baseURL}/nft/${address}/${token_id}?chain=${chain}&normalizeMetadata=true&media_items=true`, {
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