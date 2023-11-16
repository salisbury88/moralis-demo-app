import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Overview from './components/Overview';
import Tokens from './components/Tokens';
import DeFiTokens from './components/DeFiTokens';
import NFTs from './components/NFTs';
import History from './components/History';
import NavBar from './components/NavBar';
import WalletForm from './components/WalletForm';
import Loader from './components/Loader';
import { DataProvider, useData } from './DataContext';
import './custom.scss';

function Root() {
  return (
    <DataProvider>
      <App />
    </DataProvider>
  );
}

function App() {
  const { globalDataCache, setGlobalDataCache } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  let hasData = false;

  const handleWalletSubmit = async (address) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/wallet?chain=${globalDataCache.selectedChain ? globalDataCache.selectedChain : 'eth'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      
      if (response.ok) {
        const data = await response.json();
        hasData = true;
        
        setGlobalDataCache({
          selectedChain: localStorage.getItem('selectedChain') || 'eth',
          walletAddress: data.address,
          balance:data.balance.balance,
          chains: data.active_chains,
          profile: {
            walletAge: data.walletAge,
            firstSeenDate: data.firstSeenDate, 
            lastSeenDate: data.lastSeenDate,
            isWhale: data.isWhale, 
            earlyAdopter: data.earlyAdopter,
            multiChainer: data.multiChainer,
            speculator: data.speculator, 
            isFresh: data.isFresh,
            ens: data.ens,
            unstoppable: data.unstoppable
          },
          days: "7"
        });
        
      } else {
        setError(`Please provide a valid address.`);
      }
    } catch (error) {
      console.error('There was an error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (

      <Router>
      {globalDataCache.walletAddress ? (
          <>
            <NavBar />
            <div className="container mx-auto">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/tokens" element={<Tokens />} />
                <Route path="/defi" element={<DeFiTokens />} />
                <Route path="/nfts" element={<NFTs />} />
                <Route path="/history" element={<History />} />
              </Routes>
            </div>
          </>
        ) : (
          <>
            <div 
              className="container text-center"
              style={{ padding: '100px 0' }}
            >
              <h1>🔍 <br/>Wallet Viewer</h1>
              <div id="wallet-container">
                {loading ? (
                  <>
                  <Loader />
                  </>
                ) : (
                  <>
                  <p>Explore token balances, NFT holdings, activity and insights for any EVM wallet 🔥</p>
                  <WalletForm onSubmit={handleWalletSubmit} loading={loading} />
                  {error && <div className="text-red-500 mt-2">{error}</div>}
                  </>
                )}
              </div>    
            </div>
            
          </>
        )}
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <img 
            src="/images/Powered-by-Moralis-Badge-Text-Grey.svg"
            alt="Powered by Moralis"
            width="200"
          />
          </div>
      </Router>

  );
}

export default Root;
