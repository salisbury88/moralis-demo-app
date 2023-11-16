import express from 'express';
import fetch from 'node-fetch';
import moment from 'moment';
import { ethers } from 'ethers';
import * as utilities from './utilities.js';

const router = express.Router();
const chains = [{
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
const API_KEY = "HsPkTtNaTcNOj8TWnAG2ZvcjOIzW82gUZMATjQ4tOcHa30wES5GkHgbWAq5pG3Fu";
const baseURL = "https://deep-index.moralis.io/api/v2.2";
let requestWeight = 0;

router.get('/api/wallet/history', async function(req,res,next) {
    try {
        const address = req.query.wallet;
        const chain = req.query.chain ? req.query.chain : 'eth';

        let wallet_chains = [{
            chain: chain,
            first_transaction: true,
          }];

          console.log(wallet_chains)
        // let wallet_chains;

        // const check_chains = await fetch(`${baseURL}/wallets/${address}/chains?chains=eth&chains=polygon&chains=bsc&chains=fantom&chains=avalanche&chains=arbitrum&chains=cronos&chains=palm`,{
        //     method: 'get',
        //     headers: {accept: 'application/json', 'X-API-Key': `${API_KEY}`}
        // });
        // const active_chains = await check_chains.json();
        // wallet_chains = active_chains.active_chains;
        
        // console.log(`Wallet chains`)
        // console.log(wallet_chains)

        // Used to fetch the last 7 days
        const days = ["7","14","30","90"]
        let day = req.query.days ? req.query.days : "14";
        if (!days.includes(day)) {
            day = "14"
        }

        const one_week_ago = moment().subtract(Number(day), 'days').format('YYYY-MM-DD');

        // Get decoded transactions for the wallet
        const history = await fetchDecodedTransactions(address, wallet_chains, one_week_ago);
        if(history) {
            for(let tx of history) {
                tx.native_transfers = [];
                tx.value_decimal = ethers.formatEther(tx.value);

                if(tx.internal_transactions && tx.internal_transactions.length > 0) {
                    for(let internalTx of tx.internal_transactions) {
                        internalTx.value_decimal = ethers.formatUnits(internalTx.value);
                        internalTx.action = internalTx.from.toLowerCase() === address.toLowerCase() ? "sent" : internalTx.to.toLowerCase() === address.toLowerCase() ? "received" : "contract movement";
                        internalTx.type = "Internal Tx";
                        
                        if(internalTx.value !== "0" && internalTx.action === "sent" || internalTx.value !== "0" && internalTx.action === "received") {
                            internalTx.type = "Native Transfer";
                            tx.native_transfers.push({
                                from_address: internalTx.from,
                                from_address_label: null,
                                to_address: internalTx.to,
                                to_address_label: null,
                                value: internalTx.value,
                                value_decimal: ethers.formatEther(internalTx.value),
                                action: internalTx.action,
                                internal_transaction:true
                            });
                        }
                    }
                }

                if(tx.value !== "0") {
                    tx.native_transfers.push({
                        from_address: tx.from_address,
                        from_address_label: tx.from_address_label,
                        to_address: tx.to_address,
                        to_address_label: tx.to_address_label,
                        value: tx.value,
                        value_decimal: ethers.formatEther(tx.value),
                        action: tx.from_address.toLowerCase() === address.toLowerCase() ? "sent" : "received",
                        internal_transaction:false
                    })
                }
            }
        }

        // Get decoded transactions for the wallet
        const nft_transfers = await fetchNftTransfers(address, wallet_chains, one_week_ago);

        if(nft_transfers) {

            for(let item of nft_transfers) {

                item.type = "nft";
                item.action = (item.from_address.toLowerCase() === address.toLowerCase()) ? "sent" : "received";
                item.isMint = (item.from_address.toLowerCase() === "0x0000000000000000000000000000000000000000") ? true : false;
                item.isBurn = (item.to_address.toLowerCase() === "0x0000000000000000000000000000000000000000") ? true : false;
                item.isAirdrop = (item.operator && item.operator !== address.toLowerCase()) ? true : false;
            }

            // NFT Sale = received native token or erc20 token, and sent nft
            // NFT Purchase = sent native token or erc20 token, and received nft


            // Unique NFTs to fetch metadata for
            const uniqueTokens = [...new Map(nft_transfers.map(v => [JSON.stringify(v), v])).values()];


           // getMultipleNFTs supports 25 at a time
            const chunkSize = 25;
            const chunksByChain = {};
            let nftMetadatas = [];


            // Group NFTs by chain
            for (const nft of uniqueTokens) {
              const chain = nft.chain;

              if (!chunksByChain[chain]) {
                chunksByChain[chain] = [];
              }

              chunksByChain[chain].push(nft);

              // Check if the chunk size limit is reached for the current chain
              if (chunksByChain[chain].length >= chunkSize) {
                // Fetch metadata for the full chunk
                const chunk = chunksByChain[chain];
                const metadata = await fetchNFTMetadata(chunk, chain, API_KEY);
                nftMetadatas = nftMetadatas.concat(metadata);

                // Clear the chunk for the current chain
                chunksByChain[chain] = [];
              }
            }

             
            

            // Fetch metadata for the remaining NFTs in each chunk
            for (const chain in chunksByChain) {
              const chunk = chunksByChain[chain];
              if (chunk.length > 0) {
                const metadata = await fetchNFTMetadata(chunk, chain, API_KEY);
                nftMetadatas = nftMetadatas.concat(metadata);
              }
            }

            nftMetadatas = nftMetadatas.filter(Boolean);

            // Create a Map with keys as `${token_address}-${token_id}` for faster lookups
            const metadataMap = new Map(
              nftMetadatas.map(metadata => [
                `${metadata.token_address.toLowerCase()}-${metadata.token_id.toString()}`,
                metadata
              ])
            );

            // Add metadata to original item
            for (const item of nft_transfers) {
              if (item.type === "nft" && item.token_address && item.token_id) {
                const key = `${item.token_address.toLowerCase()}-${item.token_id.toString()}`;
                const metadata = metadataMap.get(key);

                if (metadata) {
                  item.data = metadata;
                }
              }
            }

        }

        // Fetch all ERC20 transfers
        const erc20_transfers = await fetchERC20Transfers(address, wallet_chains, one_week_ago);

        // Label each as ERC20 and push into master history array
        const foundChain = chains.find(item => item.chain === chain);
        if (erc20_transfers) {
          erc20_transfers.forEach(item => {
            item.action = (item.from_address.toLowerCase() === address.toLowerCase()) ? "sent" : "received";
            item.type = "erc20";
            item.contract_type = "ERC20";
            item.token_logo = `https://d23exngyjlavgo.cloudfront.net/${foundChain.id}_${item.address}`
          });
        }

        const transfersWithPrices = await utilities.enrichTransfersWithPrices(erc20_transfers, chain);
        // return console.log(transfersWithPrices)
        // return res.status(200).json({transactions:history,nftTransfers:nft_transfers,erc20Transfers:erc20_transfers})
        let master_history =  mergeTransactions(history, nft_transfers, transfersWithPrices, address);

        for(const tx of master_history) {
            tx.category = setTransactionCategory(tx, address);
            tx.label = setTransactionLabel(tx,tx.category)
            tx.image = getDefaultImage(tx);
            tx.possible_spam = checkForPossibleSpam(tx);
        }

        // let master_history2 = await utilities.enrichNFTTransactionsWithUSDValue(master_history, utilities.networkData);

        
        console.log(`Total weight: ${requestWeight}`)
        return res.status(200).json(master_history);

        // return res.status(200).json(master_history)
        return res.render('components/portfolio-history',{master_history,
            active_chains:wallet_chains,ethers,chain,page:'history',moment,titleCase,ethers});
        
    } catch(e) {
        next(e);
    }
});

function mergeTransactions(transactions, nft_transfers, erc20_transfers, wallet_address) {

    let masterArray = [];
    let hashLookup = {};

    // 1. Add transactions to master array and hash_lookup for quick access
    transactions.forEach(txn => {
        // Create a copy of the transaction and add placeholders for transfers
        let txnCopy = { ...txn, erc20_transfers: [], nft_transfers: [] };
        masterArray.push(txnCopy);
        hashLookup[txn.hash] = txnCopy;
    });

    // 2. Group erc20_transfers and nft_transfers by transaction hash
    erc20_transfers.forEach(erc20 => {
        if (hashLookup[erc20.transaction_hash]) {
            hashLookup[erc20.transaction_hash].erc20_transfers.push(erc20);
        } else {
            // If no matching transaction, create one
            let newTxn = {
                hash: erc20.transaction_hash,
                block_timestamp: erc20.block_timestamp,
                manuallyCreated: true,
                erc20_transfers: [erc20],
                nft_transfers: [],
                internal_transactions: [],
                native_transfers: []
            };
            masterArray.push(newTxn);
            hashLookup[erc20.transaction_hash] = newTxn;
        }
    });

    nft_transfers.forEach(nft => {
        if (hashLookup[nft.transaction_hash]) {
            hashLookup[nft.transaction_hash].nft_transfers.push(nft);
        } else {
            // If no matching transaction, create one
            let newTxn = {
                hash: nft.transaction_hash,
                block_timestamp: nft.block_timestamp,
                manuallyCreated: true,
                erc20_transfers: [],
                nft_transfers: [nft],
                internal_transactions: [],
                native_transfers: []
            };
            masterArray.push(newTxn);
            hashLookup[nft.transaction_hash] = newTxn;
        }
    });

    // Sort transactions by timestamp in descending order
    masterArray.sort((a, b) => b.block_timestamp.localeCompare(a.block_timestamp));
    return masterArray;
}

const setTransactionCategory = (transaction, wallet_address) => {

    const { native_transfers, erc20_transfers, nft_transfers, decoded_call, value, to_address, from_address } = transaction;

    const nativeSent = native_transfers.some(transfer => transfer.action === "sent");
    const nativeReceived = native_transfers.some(transfer => transfer.action === "received");
    
    const erc20Sent = erc20_transfers.some(transfer => transfer.action === "sent");
    const erc20Received = erc20_transfers.some(transfer => transfer.action === "received");

    const nftSent = nft_transfers.some(transfer => transfer.action === "sent");
    const nftReceived = nft_transfers.some(transfer => transfer.action === "received");

    // Handle NFT purchases and sales
    const nftReceivedNotMint = nft_transfers.some(transfer => transfer.action === "received" && !transfer.isMint);
    const nftReceivedMint = nft_transfers.some(transfer => transfer.action === "received" && transfer.isMint);
    const nftSentNotBurn = nft_transfers.some(transfer => transfer.action === "sent" && !transfer.isBurn);
    const nftSentBurn = nft_transfers.some(transfer => transfer.action === "sent" && transfer.isBurn);

    // Adjusted NFT purchase and sale rules
    if (nftReceivedNotMint && (erc20Sent || value > 0)) return "NFT Purchase";
    if (nftReceivedMint && (erc20Sent || value > 0)) return "Mint";
    if (nftSentBurn && (erc20Received || value > 0)) return "Burn";
    if (nftSentNotBurn && (erc20Received || value > 0)) return "NFT Sale";

    // // Rules for Internal Tx transfers
    if (!erc20_transfers.length && !nft_transfers.length && nativeSent) return "Send";
    if (!erc20_transfers.length && !nft_transfers.length && nativeReceived) return "Receive";

    // New rules for simple send and receive
    if (!erc20_transfers.length && !nft_transfers.length && !decoded_call && value > 0) {
        if (to_address === wallet_address.toLowerCase()) return "Receive";
        if (from_address === wallet_address.toLowerCase()) return "Send";
    }


    // if (!erc20_transfers.length && !nft_transfers.length && decoded_call) return decoded_call.label;
    if (!erc20_transfers.length && !nft_transfers.length && decoded_call) return "Contract Interaction";
    if (!erc20_transfers.length && !nft_transfers.length && !decoded_call) return "Contract Interaction";

    

    if (erc20_transfers.length && nft_transfers.length) {
        if (erc20Sent && nftReceived) return "NFT Purchase";
        if (erc20Received && nftSent) return "NFT Sale";
        if (erc20Received && erc20Sent) return "Token Swap";
    }

    if (erc20_transfers.length && !nft_transfers.length) {
        const allReceivedErc20 = erc20_transfers.every(transfer => transfer.action === 'Received');
        const allSentErc20 = erc20_transfers.every(transfer => transfer.action === 'Sent');

        // New rule for token swap when all are received actions and value is > 0
        if (allReceivedErc20 && value > 0) return "Token Swap";

        // New rule for token swap when all are sent actions and value is > 0
        if (allSentErc20 && value > 0) return "Token Swap";

        if (erc20Sent && !erc20Received) return "Sent Token";
        if (erc20Received && !erc20Sent) return "Received Token";
        if (erc20Received && erc20Sent) return "Token Swap";
    }

    if (nft_transfers.length && !erc20_transfers.length) {
        if (nft_transfers.some(transfer => transfer.isAirdrop)) return "Airdrop";
        if (nft_transfers.some(transfer => transfer.isMint && !transfer.isAirdrop)) return "Mint";
        if (nft_transfers.some(transfer => transfer.isBurn && !transfer.isAirdrop && !transfer.isMint)) return "Burn";
        if (nftSent && !nftReceived) return "Sent NFT";
        if (nftReceived && !nftSent) return "Received NFT";
    }

    return "unknown";
}

const setTransactionLabel = (transaction, category) => {
    const { erc20_transfers, nft_transfers, native_transfers, value, to_address, to_address_label, from_address, from_address_label } = transaction;

    const getNativeTokenName = (chainName) => {
        switch (chainName) {
            case 'eth':
                return 'ETH';
            case 'polygon':
                return 'MATIC';
            // ... You can add more chains here
            default:
                return 'ETH';  // default to ETH
        }
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    const getAddressOrLabel = (transferAddress, transferLabel, transactionAddress, transactionLabel) => {
        if(transferAddress) {
            return transferLabel || formatAddress(transferAddress);
        }
        return transactionLabel || formatAddress(transactionAddress);
    };
    

    switch (category) {
        case 'Send': {
            if (!erc20_transfers.length && !nft_transfers.length) {
                const nativeTokenName = getNativeTokenName(transaction.chain);

                const sentTransfers = native_transfers.filter(transfer => transfer.action === 'sent');
                const sentCount = sentTransfers.length;
                
                if (sentCount === 1) {
                    const transfer = sentTransfers[0];
                    const to = getAddressOrLabel(transfer.to_address, transfer.to_address_label, to_address, to_address_label);
                    return `Sent ${transfer.value_decimal} ${nativeTokenName} to ${to}`;
                }
                
                return `Sent ${sentCount} ${nativeTokenName} transfer${sentCount > 1 ? 's' : ''}`;
            }
        }
        case 'Receive': {
            if (!erc20_transfers.length && !nft_transfers.length) {
                const nativeTokenName = getNativeTokenName(transaction.chain);

                const receiveTransfers = native_transfers.filter(transfer => transfer.action === 'received');
                const receiveCount = receiveTransfers.length;
                
                if (receiveCount === 1) {
                    const transfer = receiveTransfers[0];
                    const from = getAddressOrLabel(transfer.from_address, transfer.from_address_label, from_address, from_address_label);
                    return `Received ${transfer.value_decimal} ${nativeTokenName} from ${from}`;
                }
                
                return `Received ${receiveCount} ${nativeTokenName} transfer${receiveCount > 1 ? 's' : ''}`;
            }
        }
        case 'Airdrop': {
            const receivedAirdrops = nft_transfers.filter(transfer => transfer.isAirdrop && transfer.action === 'received').length;
            const sentAirdrops = nft_transfers.filter(transfer => transfer.isAirdrop && transfer.action === 'sent').length;
            
            if (receivedAirdrops > 0) {
                return `Received ${receivedAirdrops} NFT airdrop${receivedAirdrops > 1 ? 's' : ''}`;
            } else if (sentAirdrops > 0) {
                return `Sent ${sentAirdrops} NFT airdrop${sentAirdrops > 1 ? 's' : ''}`;
            }
            return 'Airdrop';  // Fallback label just in case.
        }
        case 'Mint': {
            const mintedCount = nft_transfers.filter(transfer => transfer.isMint && Number(transaction.value) > 0 || transfer.isMint && !transfer.isAirdrop).length;
            return `Minted ${mintedCount} NFT${mintedCount > 1 ? 's' : ''}`;
        }
        case 'Burn': {
            const burnedCount = nft_transfers.filter(transfer => transfer.isBurn && !transfer.isMint && !transfer.isAirdrop).length;
            return `Burned ${burnedCount} NFT${burnedCount > 1 ? 's' : ''}`;
        }
        case 'Received NFT': {
            const receivedCount = nft_transfers.filter(transfer => transfer.action === 'received' && !transfer.isMint && !transfer.isAirdrop).length;

            if (receivedCount === 1) {
                const transfer = nft_transfers.find(t => t.action === 'received' && !t.isMint && !t.isAirdrop);
                const from = getAddressOrLabel(transfer.from_address, transfer.from_address_label, from_address, from_address_label);
                return `Received 1 NFT from ${from}`;
            }
            return `Received ${receivedCount} NFT${receivedCount > 1 ? 's' : ''}`;
        }
        case 'Sent NFT': {
            const sentCount = nft_transfers.filter(transfer => transfer.action === 'sent' && !transfer.isBurn).length;
            
            if (sentCount === 1) {
                const transfer = nft_transfers.find(t => t.action === 'sent' && !t.isBurn);
                const to = getAddressOrLabel(transfer.to_address, transfer.to_address_label, to_address, to_address_label);
                return `Sent 1 NFT to ${to}`;
            }
            return `Sent ${sentCount} NFT${sentCount > 1 ? 's' : ''}`;
        }
        case 'Sent Token': {
            const sentTransfers = erc20_transfers.filter(transfer => transfer.action === 'sent');
            const sentCount = sentTransfers.length;
            
            if (sentCount === 1) {
                const transfer = sentTransfers[0];
                const to = getAddressOrLabel(transfer.to_address, transfer.to_address_label, to_address, to_address_label);
                return `Sent ${transfer.value_decimal} ${transfer.token_symbol} to ${to}`;
            }
            return `Sent ${sentCount} ERC20 token${sentCount > 1 ? 's' : ''}`;
        }
        
        case 'Received Token': {
            const receivedTransfers = erc20_transfers.filter(transfer => transfer.action === 'received');
            const receivedCount = receivedTransfers.length;
            
            if (receivedCount === 1) {
                const transfer = receivedTransfers[0];
                const from = getAddressOrLabel(transfer.from_address, transfer.from_address_label, from_address, from_address_label);
                return `Received ${transfer.value_decimal} ${transfer.token_symbol} from ${from}`;
            }
            return `Received ${receivedCount} ERC20 token${receivedCount > 1 ? 's' : ''}`;
        }
        case 'NFT Purchase': {
            const purchasedCount = nft_transfers.filter(transfer => transfer.action === 'received').length;
            return `Purchased ${purchasedCount} NFT${purchasedCount > 1 ? 's' : ''}`;
        }
        case 'NFT Sale': {
            const soldCount = nft_transfers.filter(transfer => transfer.action === 'sent').length;
            return `Sold ${soldCount} NFT${soldCount > 1 ? 's' : ''}`;
        }
        case 'Token Swap': {
            const sentToken = erc20_transfers.find(transfer => transfer.action === 'sent');
            const receivedToken = erc20_transfers.find(transfer => transfer.action === 'received');
            
            const nativeTokenName = getNativeTokenName(transaction.chain);
            
            if (sentToken && receivedToken) {
                return `Swapped ${sentToken.value_decimal} ${sentToken.token_symbol} for ${receivedToken.value_decimal} ${receivedToken.token_symbol}`;
            } else if (sentToken && value > 0) {
                return `Swapped ${sentToken.value_decimal} ${sentToken.token_symbol} for ${ethers.formatUnits(value, 18)} ${nativeTokenName}`;
            } else if (receivedToken && value > 0) {
                return `Swapped ${ethers.formatUnits(value, 18)} ${nativeTokenName} for ${receivedToken.value_decimal} ${receivedToken.token_symbol}`;
            }

            return 'ERC20 Swap';  // Fallback label just in case.
        }
        case 'Contract Interaction': {
            return `Signed a transaction: ${transaction.decoded_call ? transaction.decoded_call.label : 'unknown'}()`;
        }
        default:
            return category;  // In cases like "contract interaction" and others, you can directly return the category or add additional logic if needed.
    }
}

const checkForPossibleSpam = (transaction) => {
    if (transaction.nft_transfers.some(transfer => transfer.possible_spam) || 
        transaction.erc20_transfers.some(transfer => transfer.possible_spam)) {
        return true;
    } else {
        return false;
    }
}

const getDefaultImage = (transaction) => {

    const allowedCategories = [
        'Send', 'Receive', 'Airdrop', 'Mint', 'Burn', 
        'Received NFT', 'Sent NFT', 'Sent Token', 
        'Received Token', 'NFT Purchase', 'NFT Sale', 'Token Swap'
    ];

    // If the category is not in the allowed list, return null or a default image.
    if (!allowedCategories.includes(transaction.category)) return { imageUrl: null, hasImage: false };

    // Helper to safely access nested properties
    const getNestedProperty = (obj, ...args) => args.reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);

    // Prioritize NFTs
    const nft = transaction.nft_transfers.find(transfer => {
        return transfer.data?.media?.media_collection?.low?.url !== undefined || transfer.data?.normalized_metadata?.image !== undefined;
    });
    
    if (nft) {
        const imageUrl = nft.data.media?.media_collection?.low?.url || nft.data?.normalized_metadata?.image;
        
        if (imageUrl) {
            return { imageUrl, hasImage: true };
        } else {
            console.log(`Setting NFT placeholder for ${transaction.hash}`);
            return { imageUrl: "/images/nft-placeholder.svg", hasImage: true };
        }
    }
    
    // Check if the transaction has any nft_transfers, and if none of them had images, default to placeholder
    if (transaction.nft_transfers && transaction.nft_transfers.length > 0) {
        console.log(`Setting NFT placeholder for ${transaction.hash} because no valid images found in transfers.`);
        return { imageUrl: "/images/nft-placeholder.svg", hasImage: true };
    }

    // Check for ERC20 tokens
    const erc20Transfer = transaction.erc20_transfers.find(transfer => {
        return transfer.token_name;
    });

    if (erc20Transfer && erc20Transfer.token_logo) return { imageUrl: erc20Transfer.token_logo, hasImage: true };

    // ERC20 token logo fallback
    if (erc20Transfer && erc20Transfer.token_name) {
        const firstChar = erc20Transfer.token_name.charAt(0);
        return { imageUrl: `<div className="token-placeholder">${firstChar}</div>`, hasImage: false };
    }

    // Check for native transfers
    if (transaction.chain) {
        return { imageUrl: `/images/${transaction.chain}-icon.png`, hasImage: true };
    }

    // Default fallback if none of the above conditions match
    return { imageUrl: "default-icon.png", hasImage: true };
}


async function fetchDecodedTransactions(address, chains, fromDate) {

    let all_transactions = [];
    for(const chain of chains) {
        if(chain.first_transaction) {
            const url = new URL(`${baseURL}/${address}/verbose`);
            const params = new URLSearchParams({ chain:chain.chain, from_date: fromDate, include: "internal_transactions" });
            url.search = params;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-API-Key': API_KEY
                },
            });

            const transactions = await response.json();

            if(transactions.result && transactions.result.length > 0) {
                for(let item of transactions.result) {
                    item.chain = chain.chain;
                    all_transactions.push(item);
                }
            }
          requestWeight += Number(response.headers.get('x-request-weight'));
        }
    }
  
  return all_transactions;
}

async function fetchNftTransfers(address,chains,fromDate) {
    let all_transfers = [];
    for(const chain of chains) {
        if(chain.first_transaction) {
            const url = new URL(`${baseURL}/${address}/nft/transfers`);
            const params = new URLSearchParams({ chain:chain.chain, from_date: fromDate });
            url.search = params;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'X-API-Key': API_KEY,
                },
            });

            let transfers = await response.json();
            if(transfers.result && transfers.result.length > 0) {
                for(let item of transfers.result) {
                    item.chain = chain.chain;
                    all_transfers.push(item);
                }
            }

            requestWeight += Number(response.headers.get('x-request-weight'));
        }
    }

    return all_transfers;
}

async function fetchERC20Transfers(address,chains,fromDate) {
    let all_transfers = [];
    for(const chain of chains) {
        if(chain.first_transaction) {
            const url = new URL(`${baseURL}/${address}/erc20/transfers`);
            const params = new URLSearchParams({ chain:chain.chain, from_date: fromDate });
            url.search = params;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'X-API-Key': API_KEY,
                },
            });
            const transfers = await response.json();

            if(transfers.result && transfers.result.length > 0) {
                for(let item of transfers.result) {
                    item.chain = chain.chain;
                    all_transfers.push(item);
                }
            }

            requestWeight += Number(response.headers.get('x-request-weight'));
        }
        
    }
    return all_transfers;
}


async function fetchNFTMetadata(chunk, chain) {
  const response = await fetch(`${baseURL}/nft/getMultipleNFTs`, {
    method: 'POST',
    body: JSON.stringify({
      chain,
      tokens: chunk,
      normalizeMetadata: true,
      media_items: true,
    }),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
  });
  requestWeight += Number(response.headers.get('x-request-weight'));
  const nftMetadata = await response.json();
  return nftMetadata && nftMetadata.length > 0 ? nftMetadata : [];
}

const fetchTokenMetadata = async (address) => {
  const response = await fetch(`${baseURL}/erc20/metadata?` + new URLSearchParams({
    chain: chain,
    address: address
  }), {
    method: 'get',
    headers: { accept: 'application/json', 'X-API-Key': `${API_KEY}` }
  });

  return response.json();
};

export default router;