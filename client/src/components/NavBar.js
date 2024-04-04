import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../DataContext';

const NavBar = () => {

  const { setGlobalDataCache } = useData();

  const clearCache = () => {
    // Assuming your initial cache state is an empty object
    // Change this to any default structure if needed
    setGlobalDataCache({
      selectedChain: localStorage.getItem('selectedChain') || 'eth',
    });
  }

  return (
    <nav className="nav-bar navbar fixed-top">
      <div className="container">
        <ul className="nav">
          <li className="nav-item">
            <NavLink 
              className="mr-4" 
              exact 
              to="/" 
              activeClassName="active"  // <-- specify the class name to be added when the route matches
            >
              Overview
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              className="mr-4" 
              to="/tokens" 
              activeClassName="active"
            >
              Tokens
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              className="mr-4" 
              to="/defi" 
              activeClassName="active"
            >
              DeFi Positions
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              className="mr-4" 
              to="/nfts" 
              activeClassName="active"
            >
              NFTs
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              to="/history" 
              activeClassName="active"
            >
              History
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              to="/market-data" 
              activeClassName="active"
            >
              Market Data
            </NavLink>
          </li>
        </ul>
      
      <button className="btn btn-sm btn-primary" onClick={clearCache}>
        Switch wallet
      </button>
      </div>

    </nav>
  );
}

export default NavBar;