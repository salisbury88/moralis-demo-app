import React, { useEffect, useState } from 'react';
import { useData } from '../DataContext';
import Skeleton from './Skeleton';
import TxChart from './TxChart';
import TokenLogo from './TokenLogo';
import WalletInteractions from './WalletInteractions';
import ChainDropDown from './ChainDropDown';
import ExternalLinkIcon from './ExternalLinkIcon';
import ArrowIcon from './ArrowIcon';
import moment from 'moment';
import { UncontrolledTooltip } from 'reactstrap';
import { Link } from 'react-router-dom';
import * as utilities from '../utilities.js';
import CopyToClipboard from './CopyToClipboard';

const Overview = () => {
  const { globalDataCache, setGlobalDataCache } = useData();
  const [loading, setLoading] = useState(!globalDataCache);
  const [error, setError] = useState(null);

  useEffect(() => {
    // setLoading(!globalDataCache);
  }, [globalDataCache]);

  const handleDropdownChange = (selectedValue) => {
    setGlobalDataCache(prevData => ({
      ...prevData,
      nftsLoaded:false,
      tokensLoaded:false,
      defiLoaded:false,
      selectedChain:selectedValue
    }));
    fetchProfile(selectedValue);

  };

  useEffect(() => {
    if (globalDataCache.walletAddress && !globalDataCache.stats) {
      setLoading(true)
    }
  }, []);

  const fetchProfile = (chain) => {
    setLoading(true);
  fetch(`${process.env.REACT_APP_API_URL}/api/wallet/profile?wallet=${globalDataCache.walletAddress}&chain=${chain}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then((data) => {
          setGlobalDataCache(prevData => ({
            ...prevData,
            chartArray:data.chartArray,
            stats:data.stats,
            profile: {
              ...prevData.profile,
              collector:data.collector
            },
            interactions:data.addressOccurrences,
            tokenCount:data.tokens.length,
            token_balances: data.tokens,
            nativeNetworth: data.nativeNetworth
          }));
          setLoading(false);
        })
        .catch((error) => {
          setError(error);
          setLoading(false);
        });
  }


  useEffect(() => {
    console.log("Context value changed:", globalDataCache);
  }, [globalDataCache]);
  useEffect(() => {
    localStorage.setItem('selectedChain', globalDataCache.selectedChain);
}, [globalDataCache.selectedChain]);
  return (
    <div>
      <div className="container overview networth">
        <h1>Total Net-worth: {Number(globalDataCache.networth.total_networth_usd).toLocaleString('en-US', {style: 'currency',currency: 'USD'})}</h1>
      <div>
        <h2>Net-worth by chain</h2>
      </div>

    <ul>
        {globalDataCache.networth.chains && globalDataCache.networth.chains.map(chain => (
                <li className="wallet-card networth" key={chain.chain}>
                    <>
                    <div className="chain-networth">
                        <div><img src={`/images/${chain.chain}-icon.png`}></img></div>
                        <div>{Number(chain.networth_usd).toLocaleString('en-US', {style: 'currency',currency: 'USD'})}</div>
                    </div>
                    </>
                    <div>Native token: {Number(chain.native_balance_usd).toLocaleString('en-US', {style: 'currency',currency: 'USD'})}</div>
                    <div>ERC20 tokens: {Number(chain.token_balance_usd).toLocaleString('en-US', {style: 'currency',currency: 'USD'})}</div>
                    <div>NFTs: soon</div>
                    <div>DeFi protocols: soon</div>
                </li>
            ))}

        </ul>

 
      </div>


      {error && <div className="text-red-500">{error.message}</div>}
    </div>
  );
};

export default Overview;
