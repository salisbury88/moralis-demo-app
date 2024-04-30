import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useData } from '../../DataContext';

const NavBar = () => {

  const { globalDataCache, setGlobalDataCache } = useData();
  const navigate = useNavigate();
  const clearWallet = () => {
    setGlobalDataCache({
      selectedChain: localStorage.getItem('selectedChain') || 'eth',
    });
    navigate(`/wallets/`);
  }

  const clearToken = () => {
    setGlobalDataCache({
      selectedChain: localStorage.getItem('selectedChain') || 'eth',
    });
    navigate(`/tokens/`);
  }

  return (
    <>
    {
      globalDataCache.walletAddress 
      ?
        <nav className="nav-bar navbar fixed-top">
          <div className="container">
            <ul className="nav">
              <li className="nav-item">
                <NavLink 
                  className="mr-4" 
                  to={`/wallets/${globalDataCache.walletAddress}`}
                  end
                  activeClassName="active" 
                >
                  Overview
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  className="mr-4" 
                  exact
                  to={`/wallets/${globalDataCache.walletAddress}/tokens`}
                  activeClassName="active"
                >
                  Tokens
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  className="mr-4" 
                  to={`/wallets/${globalDataCache.walletAddress}/pnl`}
                  activeClassName="active"
                >
                  PnL
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  className="mr-4" 
                  to={`/wallets/${globalDataCache.walletAddress}/defi`}
                  activeClassName="active"
                >
                  DeFi Positions
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  className="mr-4" 
                  to={`/wallets/${globalDataCache.walletAddress}/nfts`}
                  activeClassName="active"
                >
                  NFTs
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to={`/wallets/${globalDataCache.walletAddress}/history`}
                  activeClassName="active"
                >
                  History
                </NavLink>
              </li>
            </ul>
          
          <button className="btn btn-sm btn-primary" onClick={clearWallet}>
            Switch wallet
          </button>
          </div>

        </nav>


        
        : (globalDataCache.token && globalDataCache.token.tokenMetadata)
        ?
        <>
          <nav className="nav-bar navbar fixed-top">
              <div className="container">
                <ul className="nav">

                <li className="nav-item">
                  <NavLink 
                    className="mr-4" 
                    to={`/tokens`}
                  >
                    Home
                  </NavLink>
                </li>
                  <li>
                    {globalDataCache.token.tokenMetadata.name} ({globalDataCache.token.tokenMetadata.symbol}) - {globalDataCache.token.tokenMetadata.address}
                  </li>
    
                </ul>
              
              <button className="btn btn-sm btn-primary" onClick={clearToken}>
                Switch token
              </button>
              </div>
    
            </nav>
        </>
        : globalDataCache.activeNFTCollection
        ?
        <>
          <nav className="nav-bar navbar fixed-top">
              <div className="container">
                <ul className="nav">
                  <li className="nav-item">
                    <NavLink
                      to={`/marketplace/`}
                      activeClassName="active"
                    >
                      Home
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <a>Trending</a>
                  </li>
                  <li className="nav-item">
                    <a>Drops</a>
                  </li>
    
                </ul>
 
              </div>
    
            </nav>
        </>
        :
        <>
          <nav className="nav-bar navbar fixed-top">
              <div className="container">
                <ul className="nav">
                  
    
                </ul>
 
              </div>
    
            </nav>
        </>
    }
    </>
  );
}

export default NavBar;