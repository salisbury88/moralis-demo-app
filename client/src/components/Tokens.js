import React, { useState, useEffect } from 'react';
import { useData } from '../DataContext';
import Skeleton from './Skeleton';
import ChainDropDown from './ChainDropDown';
import TokenLogo from './TokenLogo';
import TokenPriceChart from './TokenPriceChart';
import CopyToClipboard from './CopyToClipboard';
import { Modal, ModalHeader, ModalBody, ModalFooter, UncontrolledTooltip } from 'reactstrap';
import * as utilities from '../utilities.js';
import moment from 'moment';
const Tokens = () => {
  const { globalDataCache, setGlobalDataCache } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [tokenLoading, setTokenLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [activeToken, setActiveToken] = useState(null);

  const toggleModal = () => setModal(!modal);

  const fetchTokens = (chain) => {
    setLoading(true);
    setError(null);
    setGlobalDataCache(prevData => ({
      ...prevData,
      tokens: null,
      tokensLoaded:false
    }));
    fetch(`${process.env.REACT_APP_API_URL}/api/wallet/tokens?chain=${chain}&wallet=${globalDataCache.walletAddress}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
      })
      .then(fetchedData => {
        // Update globalDataCache with fetchedData
        
        setGlobalDataCache(prevData => ({
          ...prevData,
          tokens: fetchedData.verified_tokens,
          tokensLoaded:true
        }));
        setLoading(false);
        if(fetchedData.unsupported) {
          setError("Unsupported wallet.")
        }
      })
      .catch(error => {
        setError(error.message);
        setLoading(false);
      });
  }

  const handleTokenClick = (token) => {
    toggleModal();
    setTokenLoading(true)
    fetch(`${process.env.REACT_APP_API_URL}/api/wallet/tokens/${token.token_address}?chain=${globalDataCache.selectedChain}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
      })
      .then(fetchedData => {
        // Update globalDataCache with fetchedData
        setActiveToken(fetchedData);
        setTokenLoading(false);
        
      })
      .catch(error => {
        setError(error.message);
        setLoading(false);
      });
  };

  const handleDropdownChange = (selectedValue) => {
    setActiveToken(null);
    setGlobalDataCache(prevData => ({
      ...prevData,
      nftsLoaded:false,
      tokensLoaded:false,
      selectedChain:selectedValue
    }));
    fetchTokens(selectedValue);
  };



  useEffect(() => {
    if (!globalDataCache.tokensLoaded) {
      setLoading(true);
      fetchTokens(globalDataCache.selectedChain);
    }
  }, []);

  useEffect(() => {
    console.log("Context value changed:", globalDataCache);
  }, [globalDataCache]);

  useEffect(() => {
    localStorage.setItem('selectedChain', globalDataCache.selectedChain);
}, [globalDataCache.selectedChain]);


  return (
    <div id="token-page">
      
      <div className="page-header">
        <h2>Tokens {globalDataCache.tokens && <span>({globalDataCache?.tokens.length})</span>}</h2>
        <ChainDropDown 
          onChange={handleDropdownChange} 
          chains={globalDataCache.chains}
          selectedChain={globalDataCache.selectedChain}
        />
      </div>

      <ul className="token-list">
        <li className="header-row">
          <div>Token</div>
          <div></div>
          <div>Price</div>
          <div>Balance</div>
          <div>Value</div>
          <div>24hr Change</div>
          <div>Portfolio Percentage</div>
        </li>
        {loading && <Skeleton />}
        {error && <div className="text-red-500">{error}</div>}      
        {/* Assuming globalDataCache.tokensData is an array */}
        {!loading && !error && globalDataCache.tokens && globalDataCache.tokens.length === 0 && (
          <p>No tokens</p>
        )}
        {globalDataCache.tokens && globalDataCache.tokens.map(token => (
            <li key={token.token_address} onClick={() => handleTokenClick(token)}>
              <TokenLogo tokenImage={token.logo} tokenName={token.name}/>
              <div>
                <div className="token-name">{token.name}
            
                {
                  token.possible_spam && 
                  <>
                    <svg id={`tooltip-${token.address}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f7a600" width="17"><path d="M16.619,3H7.381C7.024,3,6.694,3.191,6.515,3.5l-4.618,8c-0.179,0.309-0.179,0.691,0,1l4.618,8 C6.694,20.809,7.024,21,7.381,21h9.238c0.357,0,0.687-0.191,0.866-0.5l4.618-8c0.179-0.309,0.179-0.691,0-1l-4.618-8 C17.306,3.191,16.976,3,16.619,3z M12,17L12,17c-0.552,0-1-0.448-1-1v0c0-0.552,0.448-1,1-1h0c0.552,0,1,0.448,1,1v0 C13,16.552,12.552,17,12,17z M12,13L12,13c-0.552,0-1-0.448-1-1V8c0-0.552,0.448-1,1-1h0c0.552,0,1,0.448,1,1v4 C13,12.552,12.552,13,12,13z" fill="#f7a600"/></svg>
                    <UncontrolledTooltip target={`tooltip-${token.address}`} placement="top">
                      Spam contract
                    </UncontrolledTooltip>
                  </>
                }

                {

                  token.verified_contract &&

                  <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20"><polygon fill="#42a5f5" points="29.62,3 33.053,8.308 39.367,8.624 39.686,14.937 44.997,18.367 42.116,23.995 45,29.62 39.692,33.053 39.376,39.367 33.063,39.686 29.633,44.997 24.005,42.116 18.38,45 14.947,39.692 8.633,39.376 8.314,33.063 3.003,29.633 5.884,24.005 3,18.38 8.308,14.947 8.624,8.633 14.937,8.314 18.367,3.003 23.995,5.884"/><polygon fill="#fff" points="21.396,31.255 14.899,24.76 17.021,22.639 21.428,27.046 30.996,17.772 33.084,19.926"/></svg>
                  </>

                }
                </div>
                <div className="token-symbol">{token.symbol}</div>
              </div>
              <div className="token-price">{token.usd_price && `$${Number(token.usd_price).toFixed(2)}`}</div>
              <div className="token-balance">{Number(token.balance_formatted).toFixed(3)}</div>
              <div className="token-value"><div className="price">${Number(token.usd_value).toFixed(2)}</div></div>
              <div className="token-value">
              {token.usd_price && (
                    <>
                        <div className={token.usd_price_24hr_percent_change && token.usd_price_24hr_percent_change < 0 ? "negative" : "positive"}>
                            {Number(token.usd_price_24hr_percent_change).toFixed(2)}% <span>(${Number(token.usd_price_24hr_usd_change).toFixed(2)})</span>
                        </div>
                    </>
              )}
              </div>
              <div>{Number(token.portfolio_percentage).toFixed(2)}%</div>
              
            </li>
        ))}

      </ul>


      <Modal isOpen={modal} toggle={toggleModal} size="md" className="token-modal">
          <ModalBody>
          {tokenLoading && <Skeleton />}
            {activeToken && !tokenLoading && (
              <div className="nft-details">

                <button className="close" onClick={toggleModal}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" fill="#ffffff"><path d="M 7 4 C 6.744125 4 6.4879687 4.0974687 6.2929688 4.2929688 L 4.2929688 6.2929688 C 3.9019687 6.6839688 3.9019687 7.3170313 4.2929688 7.7070312 L 11.585938 15 L 4.2929688 22.292969 C 3.9019687 22.683969 3.9019687 23.317031 4.2929688 23.707031 L 6.2929688 25.707031 C 6.6839688 26.098031 7.3170313 26.098031 7.7070312 25.707031 L 15 18.414062 L 22.292969 25.707031 C 22.682969 26.098031 23.317031 26.098031 23.707031 25.707031 L 25.707031 23.707031 C 26.098031 23.316031 26.098031 22.682969 25.707031 22.292969 L 18.414062 15 L 25.707031 7.7070312 C 26.098031 7.3170312 26.098031 6.6829688 25.707031 6.2929688 L 23.707031 4.2929688 C 23.316031 3.9019687 22.682969 3.9019687 22.292969 4.2929688 L 15 11.585938 L 7.7070312 4.2929688 C 7.5115312 4.0974687 7.255875 4 7 4 z" fill="#ffffff"/></svg>
                </button>
                
                <div className="container">                   

                      <div className="token-modal-content">

                        <div className="token-top">
                          <div className="image">
                            {activeToken.token.logo && (
                              <TokenLogo tokenImage={activeToken.token.logo} tokenName={activeToken.token.name}/>
                            )}
                            
                          </div>
                          <div className="meta">
                            <div className="title">{activeToken.token.name}</div>
                            <div className="symbol">{activeToken.token.symbol}</div>
                          </div>
                        </div>

                        {activeToken.currentPrice && activeToken.currentPrice !== "NaN" && (
                          <>
                            <h2>${activeToken.currentPrice} <span className={`percent-change ${activeToken.direction}`}>{activeToken.direction === "up" ? '+' : ''}{activeToken.percentageChange}%</span></h2>
                              
                            <TokenPriceChart chartArray={activeToken.price_data} direction={activeToken.direction}/>
                          </>
                        )}
                        

                        {activeToken.exchange.address && (
                          <ul className="table-list">
                            <li>
                              <div className="left">Exchange</div>
                              <div className="right">{activeToken.exchange?.name}</div>
                            </li>
                            <li>
                              <div className="left">Exchange Address</div>
                              <div className="right copy-container">
                                {utilities.shortAddress(activeToken.exchange?.address)}
                                <CopyToClipboard valueToCopy={activeToken.exchange?.address}>
                                  <button></button>
                                </CopyToClipboard>
                              </div>
                            </li>                        
                          </ul>
                        )}
                      </div>
                      

                      <div className="token-modal-content">
                          <div className="subtitle">Wallet Holdings</div>
                          <ul className="table-list">
                          <li>
                            <div className="left">Current Balance</div>
                            <div className="right">
                              {globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).amount}
                            </div>
                          </li>

                          {activeToken.exchange.address && (
                            <>
                              <li>
                                <div className="left">Current Value (USD)</div>
                                <div className="right">${globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).value}</div>
                              </li>
                              <li>
                                <div className="left">24 Hour Change (%)</div>
                                <div className={globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).percentChange && globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).percentChange.startsWith('-') ? "right negative" : "right positive"}>{Number(globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).percentChange).toFixed(2)}%</div>
                              </li>
                              <li>
                                <div className="left">24 Hour Change (USD)</div>
                                <div className={globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).percentChange && globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).percentChange.startsWith('-') ? "right negative" : "right positive"}>${Number(globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).valueChange).toFixed(2)}</div>
                              </li>   
                              <li>
                                <div className="left">7 Day Change (%)</div>
                                <div className={globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).percentChange && globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).percentChange.startsWith('-') ? "right negative" : "right positive"}>{activeToken.percentageChange}%</div>
                              </li>
                              <li>
                                <div className="left">7 Day Change (USD)</div>
                                <div className={globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).percentChange && globalDataCache.tokens.find(item => item.token_address === activeToken.token.address).percentChange.startsWith('-') ? "right negative" : "right positive"}>${activeToken.usdChange}</div>
                              </li> 
                            </>   
                          )}                      
                        </ul>
                      </div>

                  

                      <div className="token-modal-content">
                          <div className="subtitle">Token Contract Details</div>
                          <ul className="table-list">
                          <li>
                            <div className="left">Contract Address</div>
                            <div className="right copy-container">
                              {utilities.shortAddress(activeToken.token.address)}
                              <CopyToClipboard valueToCopy={activeToken.token.address}>
                                <button></button>
                              </CopyToClipboard>
                            </div>
                          </li>
                          <li>
                            <div className="left">Name</div>
                            <div className="right">{activeToken.token.name}</div>
                          </li>
                          <li>
                            <div className="left">Symbol</div>
                            <div className="right">{activeToken.token.symbol}</div>
                          </li>
                          <li>
                            <div className="left">Contract Type</div>
                            <div className="right">ERC20</div>
                          </li>
                          <li>
                            <div className="left">Decimals</div>
                            <div className="right">{activeToken.token.decimals}</div>
                          </li>
                        </ul>
                      </div>


                      <div className="token-modal-content">
                          <div className="subtitle">Token Provenance</div>
                          <p>Token created {activeToken.block_minted.timestamp_label} at block {activeToken.token.block_number}.</p>

                          <ul className="table-list">
                            <li>
                              <div className="left">Block Number Minted</div>
                              <div className="right copy-container">
                              {activeToken.token.block_number}
                              </div>
                            </li>
                            <li>
                              <div className="left">Timestamp</div>
                              <div className="right">{activeToken.block_minted.timestamp}</div>
                            </li>
                          </ul>
                      </div>

                      <div className="token-modal-content">
                          <div className="subtitle">Recent Transfers</div>
                          {activeToken.token_transfers && activeToken.token_transfers.map((transfer) => (
                            <div className="wallet-card light">
                              <div className="heading-group">
                                <div className="heading">Transaction</div>
                                <div className="value">
                                  <div className="copy-container">
                                    {utilities.shortAddress(transfer.transaction_hash)}
                                    <CopyToClipboard valueToCopy={transfer.transaction_hash}>
                                      <button></button>
                                    </CopyToClipboard>
                                  </div>
                                </div>
                              </div>

                              <div className="heading-group">
                                <div className="heading">From</div>
                                <div className="value">
                                  {transfer.from_address_label ? `${transfer.from_address_label} (${utilities.shortAddress(transfer.from_address)})` : utilities.shortAddress(transfer.from_address)}
                                </div>
                              </div>
                              
                              <div className="heading-group">
                                <div className="heading">To</div>
                                <div className="value">
                                {transfer.to_address_label ? `${transfer.to_address_label} (${utilities.shortAddress(transfer.to_address)})` : utilities.shortAddress(transfer.to_address)}
                                </div>
                              </div>

                              <div className="heading-group">
                                <div className="heading">Amount</div>
                                <div className="value">{transfer.value_decimal}</div>
                              </div>

                              <div className="heading-group">
                                <div className="heading">Timestamp</div>
                                <div className="value">{moment(transfer.block_timestamp).fromNow()}</div>
                              </div>

                            </div>
                          ))}
                      </div>

          

       
    
                </div>
                
                
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <button onClick={toggleModal}></button>
          </ModalFooter>
        </Modal>
      
    </div>
  );
};

export default Tokens;
