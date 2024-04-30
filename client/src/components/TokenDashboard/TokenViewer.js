import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import TokenDashboard from './TokenDashboard';
import NavBar from '../Misc/NavBar';
import WalletForm from '../WalletPortfolio/WalletForm';
import { useNavigate } from 'react-router-dom';
import Loader from '../Misc/Loader';
import { useData } from '../../DataContext';
import '../../custom.scss';
import { debounce } from 'lodash';

function TokenViewer() {
  const { globalDataCache, setGlobalDataCache } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [topOwnersLoading, setTopOwnersLoading] = useState(false);
  const [tokenPricesLoading, setTokenPricesLoading] = useState(false);
  let hasData = false;
  const { tokenAddress } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const debouncedSubmit = debounce(() => {
      if (tokenAddress) {
        console.log('TOKEN CHANGED!');
        fetchToken(tokenAddress);
      }
    }, 300); // Adjust the delay as needed

    debouncedSubmit();
    
    // Cleanup the debounce function on component unmount or when tokenAddress changes
    return () => debouncedSubmit.cancel();
  }, [tokenAddress]);
  

  const handleWalletSubmit = async (address) => {
    navigate(`/tokens/${address}`);
  };

  const fetchToken = async (address) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      
      if (response.ok) {
        const data = await response.json();
        hasData = false;
        setGlobalDataCache(prevData => ({
            ...prevData,
            token:data
        }));
        navigate(`/tokens/${address}`);
        fetchChartPrices(address);
        fetchTopOwners(address);
            
      } else {
        setError(`Please provide a valid address.`);
      }
    } catch (error) {
      console.error('There was an error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopOwners = (address) => {
    setTopOwnersLoading(true)
    fetch(`${process.env.REACT_APP_API_URL}/api/token/${address}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then((data) => {
          setGlobalDataCache(prevData => ({
            ...prevData,
            token: {
                ...prevData.token,
                topTokenOwners: data.topTokenOwners,
                totalBalance:data.totalBalance,
                totalUsd:data.totalUsd,
                totalPercentage:data.totalPercentage,
                commonTokens:data.commonTokens
            }
          }));
          setTopOwnersLoading(false)
        })
        .catch((error) => {
          setError(error);
        });
  }

  const fetchChartPrices = (address) => {
    setTokenPricesLoading(true)
    fetch(`${process.env.REACT_APP_API_URL}/api/token/${address}/prices`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then((data) => {
          setGlobalDataCache(prevData => ({
            ...prevData,
            token: {
                ...prevData.token,
                tokenPrices: data.tokenPrices,
                tokenPriceStats: data.tokenPriceStats
            }
          }));
          setTokenPricesLoading(false)
        })
        .catch((error) => {
          setError(error);
        });
  }

  return (

    <>
      {globalDataCache.token ? (
          <>
            <NavBar />
            <div className="container mx-auto">
              <Routes>
                <Route path="/" element={<TokenDashboard topOwnersLoading={topOwnersLoading} tokenPricesLoading={tokenPricesLoading} />} />
              </Routes>
            </div>
          </>
        ) : (
          <>
            <div 
              className="container text-center"
              style={{ padding: '100px 0' }}
            >
              <h1>🔍 <br/>Token Viewer</h1>
              <div id="wallet-container">
                {loading ? (
                  <>
                  <Loader />
                  </>
                ) : (
                  <>
                  <p>Explore token insights, prices, top holders and more 🔥</p>
                  <WalletForm onSubmit={handleWalletSubmit} loading={loading} placeholder={"Enter a token address"} buttonText={"Search"} />
                  {error && <div className="text-red-500 mt-2">{error}</div>}
                  </>
                )}
              </div>    
            </div>
            
          </>
        )}
    </>
  );
}

export default TokenViewer;
