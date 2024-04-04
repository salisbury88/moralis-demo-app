import React, { useState, useEffect } from 'react';
import { useData } from '../DataContext';
import Skeleton from './Skeleton';
import ChainDropDown from './ChainDropDown';
import TokenLogo from './TokenLogo';
import TokenPriceChart from './TokenPriceChart';
import ExternalLinkIcon from './ExternalLinkIcon';
import { Modal, ModalHeader, ModalBody, ModalFooter, UncontrolledTooltip } from 'reactstrap';
import * as utilities from '../utilities.js';
import { Link } from 'react-router-dom';

const DeFiTokens = () => {
  const { globalDataCache, setGlobalDataCache } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [defiLoading, setDeFiLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [activeDeFi, setActiveDeFi] = useState(null);

  const toggleModal = () => setModal(!modal);

  const fetchDeFi = (chain) => {
    setLoading(true);
    setError(null);
    setGlobalDataCache(prevData => ({
      ...prevData,
      defi: null,
      defiLoaded:false
    }));
    fetch(`${process.env.REACT_APP_API_URL}/api/wallet/defi?chain=${chain}&wallet=${globalDataCache.walletAddress}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
      })
      .then(fetchedData => {
        // Update globalDataCache with fetchedData
        
        setGlobalDataCache(prevData => ({
          ...prevData,
          defi: fetchedData,
          defiLoaded:true
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

  const handleDropdownChange = (selectedValue) => {
    setGlobalDataCache(prevData => ({
      ...prevData,
      nftsLoaded:false,
      tokensLoaded:false,
      defiLoaded:false,
      selectedChain:selectedValue
    }));
    fetchDeFi(selectedValue);
  };

  const handleTokenClick = (position) => {
    toggleModal();
    setDeFiLoading(true)
    fetch(`${process.env.REACT_APP_API_URL}/api/wallet/defi/${position.tokenAddress}?chain=${globalDataCache.selectedChain}&wallet=${globalDataCache.walletAddress}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
      })
      .then(fetchedData => {
        // Update globalDataCache with fetchedData
        setActiveDeFi(fetchedData);
        setDeFiLoading(false);
        
      })
      .catch(error => {
        setError(error.message);
        setLoading(false);
      });
  };

  const renderDeFiTokenList = (protocol) => (
    <ul className="defi-list">
        <li className="header-row">
        <div>Token</div>
        <div></div>
        <div>Balance</div>
        <div>Value</div>
        <div>24hr Change</div>
        {protocol.protocolId === "lido" && <div></div>}
        </li>

        {protocol.positions.map(position => (
            <>
            {
              protocol.protocolId === "aave-v3" ?
                  <li className="position" key={position.aTokenAddress}>
                    <TokenLogo tokenImage={position.tokenLogo} tokenName={position.tokenName}/>
                    <div className="token-info">
                    <div className="defi-token">{position.aTokenName} ({position.aTokenSymbol})</div>
                    <div className="deposited-token">Deposited {position.tokenSymbol}</div>
                    </div>

                    <div className="balance">
                    {Number(position.balance).toFixed(2)}
                    </div>

                    <div className="value">
                    ${position.balanceUsd}
                    </div>

                    <div className={position.tokenPriceChange && position.tokenPriceChange.startsWith('-') ? "negative" : "positive"}>
                        {Number(position.tokenPriceChange).toFixed(2)}%
                    </div>
                </li>
               
               : protocol.protocolId === "lido" ?
                    <li className="position" key={position.aTokenAddress}>
                      <TokenLogo tokenImage={position.tokenLogo} tokenName={position.tokenName}/>
                      <div className="token-info">
                      <div className="defi-token">Lido {position.tokenName} ({position.tokenSymbol})</div>
                      <div className="deposited-token">Deposited {position.tokenSymbol}</div>
                      </div>

                      <div className="balance">
                      {Number(position.balance).toFixed(2)}
                      </div>

                      <div className="value">
                      ${position.balanceUsd}
                      </div>

                      <div className="value">
                      <div className={position.tokenPriceChange && position.tokenPriceChange.startsWith('-') ? "negative" : "positive"}>
                        {Number(position.tokenPriceChange).toFixed(2)}%
                      </div>
                      </div>
                      <div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleTokenClick(position)}>Rewards</button>
                      </div>
                    </li>
               : ''

            }

            
            </>
            
        
        ))}
    </ul>
);

const renderNFTTokenList = (protocol) => (
    <ul className="defi-list nft-list">
        <li className="header-row">
        <div>Token</div>
        <div></div>
        <div>Fee Tier</div>
        <div>Pair</div>
        <div>Token ID</div>

        </li>

        {protocol.positions.map(position => (
            <>
            {protocol.protocolId === "aave-3" ? '' : ''}

            <li className="position" key={position.aTokenAddress}>
                <TokenLogo tokenImage={position.normalized_metadata.image} tokenName={position.name}/>
                <div className="token-info">
                  <div className="defi-token">{position.normalized_metadata.name}</div>
                  <div className="deposited-token">Pool Address {position.positionDetails.poolAddress}</div>
                </div>

                <div className="balance">
                 {position.positionDetails.feeTier}%
                </div>

                <div className="value">
                {position.positionDetails.pairName}
                </div>

                <div className="value">
                {position.token_id}
                </div>

             
            </li>
            </>
            
        
        ))}
    </ul>
)

  useEffect(() => {
    if (!globalDataCache.defiLoaded) {
      setLoading(true);
      fetchDeFi(globalDataCache.selectedChain);
    }
  }, []);

  useEffect(() => {
    console.log("Context value changed:", globalDataCache);
  }, [globalDataCache]);

  useEffect(() => {
    localStorage.setItem('selectedChain', globalDataCache.selectedChain);
}, [globalDataCache.selectedChain]);


  return (
    <div id="defi-page">
      
      <div className="page-header">
        <h2>DeFi Positions</h2>
        <ChainDropDown 
          onChange={handleDropdownChange} 
          chains={globalDataCache.chains}
          selectedChain={globalDataCache.selectedChain}
        />
      </div>

      
        {loading && <Skeleton />}
        {error && <div className="text-red-500">{error}</div>}      
        {/* Assuming globalDataCache.tokensData is an array */}


        
        {globalDataCache.defi && (
        <>
            <h3>Wallet Summary</h3>
            <div className="summary-section">
                <div className="row">
                    <div className="col-lg-3">
                        <div className="wallet-card">
                            <div className="heading">Total Value</div>
                            <div className="big-value">${globalDataCache.defi.protocols.total_value_usd ? globalDataCache.defi.protocols.total_value_usd : 0}</div>
                        </div>
                    </div>

                    <div className="col-lg-3">
                        <div className="wallet-card">
                            <div className="heading">Active Protocols</div>
                            <div className="big-value">{globalDataCache.defi.protocols.active_protocols}</div>
                        </div>
                    </div>

                    <div className="col-lg-3">
                        <div className="wallet-card">
                            <div className="heading">Current Positions</div>
                            <div className="big-value">{globalDataCache.defi.protocols.total_positions}</div>
                        </div>
                    </div>

                    <div className="col-lg-3">
                        <div className="wallet-card">
                            <div className="heading">Unclaimed Rewards</div>
                            <div className="big-value">${globalDataCache.defi.totalRewards}</div>
                        </div>
                    </div>


                </div>
            </div>


            <h3>Protocol Breakdown</h3>
            <ul className="summary-protocols">

              {globalDataCache.defi.protocols.protocols.map(protocol => (
                <li>
                  <img src={protocol.protocol_logo} alt={protocol.protocol_name} />
                  <div>
                    <div className="protocol-title">{protocol.protocol_name}</div>
                    <div className="protocol-value">{protocol.total_value_usd ? `$${protocol.total_value_usd}` : null}</div>
                    <div className="position-count">{protocol.positions} positions</div>
                  </div>
                </li>
              ))}
            </ul>

            {!loading && !error && globalDataCache.defi && globalDataCache.defi.totalDeFiPositions === 0 && (
            <h5>No DeFi positions found. More protocols will be supported soon.</h5>
            )}


          <h3>Wallet Positions</h3>

            {globalDataCache.defi.defiPositions && globalDataCache.defi.defiPositions.length > 0 && (
              <>
                {globalDataCache.defi.protocols.protocols.map(protocol => (
                  <>
                    <div className="wallet-card" key={protocol.name_name}>
                        <div className="protocol-details">
                            <img src={protocol.protocol_logo} alt={protocol.protocol_name} />
                            <div className="protocol-title">{protocol.protocol_name} {protocol.total_value_usd ? `- $${protocol.total_value_usd}` : null}</div>
                            <div>{protocol.positions} positions</div>

                            {protocol.unclaimed_total_value_usd && (
                              <div>Rewards available</div>
                            )}
                              <Link to={protocol.protocol_url} target="_blank">
                                <button className="btn btn-outline icon btn-sm">Manage Positions <ExternalLinkIcon width="15" /></button>
                              </Link>
                        </div>
                    </div>
                  </>
                ))}
              </>
            )}

            {globalDataCache.defi.defiPositions && globalDataCache.defi.defiPositions.length > 0 && (
            <div>
                {globalDataCache.defi.defiPositions.map(protocol => (
                
                        protocol.positions && protocol.positions.length > 0 && (
                            <div className="wallet-card" key={protocol.protocolId}>
                                <div className="protocol-details">
                                    <img src={protocol.protocolLogo} alt={protocol.protocolName} />
                                    <div className="protocol-title">{protocol.protocol} {protocol.totalUsd ? `- $${protocol.totalUsd}` : null}
                                      {protocol.protocolId === "uniswap-v3" && (
                                        <>
                                        - ${globalDataCache.defi.uniswapValue} (${globalDataCache.defi.uniswapRewards} in unclaimed rewards)
                                        </>
                                      )}
                                    </div>
                                      <Link to={protocol.protocolUrl} target="_blank">
                                        <button className="btn btn-outline icon btn-sm">Manage Positions <ExternalLinkIcon width="15" /></button>
                                      </Link>
                                </div>

                                {
                                    protocol.protocolId === "aave-v2" ? renderDeFiTokenList(protocol) 
                                        : 
                                    protocol.protocolId === "aave-v3" ? renderDeFiTokenList(protocol) 
                                        :
                                    protocol.protocolId === "lido" ? renderDeFiTokenList(protocol) 
                                        :
                                    protocol.protocolId === "uniswap-v3" ? renderNFTTokenList(protocol) 
                                        :
                                    ''
                                }

                            </div>
                        )
                ))}
            </div>
            )}


                
            
            
        </>
        )}


      <Modal isOpen={modal} toggle={toggleModal} size="lg" className="token-modal rewards">
          <ModalBody>
          {defiLoading && <Skeleton />}
            {activeDeFi && !defiLoading && (
              <div className="nft-details">

                <button className="close" onClick={toggleModal}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" fill="#ffffff"><path d="M 7 4 C 6.744125 4 6.4879687 4.0974687 6.2929688 4.2929688 L 4.2929688 6.2929688 C 3.9019687 6.6839688 3.9019687 7.3170313 4.2929688 7.7070312 L 11.585938 15 L 4.2929688 22.292969 C 3.9019687 22.683969 3.9019687 23.317031 4.2929688 23.707031 L 6.2929688 25.707031 C 6.6839688 26.098031 7.3170313 26.098031 7.7070312 25.707031 L 15 18.414062 L 22.292969 25.707031 C 22.682969 26.098031 23.317031 26.098031 23.707031 25.707031 L 25.707031 23.707031 C 26.098031 23.316031 26.098031 22.682969 25.707031 22.292969 L 18.414062 15 L 25.707031 7.7070312 C 26.098031 7.3170312 26.098031 6.6829688 25.707031 6.2929688 L 23.707031 4.2929688 C 23.316031 3.9019687 22.682969 3.9019687 22.292969 4.2929688 L 15 11.585938 L 7.7070312 4.2929688 C 7.5115312 4.0974687 7.255875 4 7 4 z" fill="#ffffff"/></svg>
                </button>
                
                <div className="container">                   
                  <div className="rewards">
                    <h2>Recent Lido Rewards</h2>
                    {activeDeFi && activeDeFi.length > 0 && !defiLoading && activeDeFi.some(reward => reward.received > 0) && (
                        <>
                        <ul className="reward-list">
                          <li className="header-row">
                            <div>Date</div>
                            <div>Token Price</div>
                            <div>Received</div>
                            <div>Value</div>
                            <div>Balance</div>
                          </li>

                      
                          {activeDeFi.filter(r => r.received > 0).map((reward, index) => (
                            <li>
                              <div id={`block-${index}`}>{reward.timestampLabel}</div>
                              <UncontrolledTooltip target={`block-${index}`} placement="top">
                                <div>Block Number:{reward.block}</div>
                                <div>Timestamp: {reward.timestamp}</div>
                              </UncontrolledTooltip>
                              <div>${reward.tokenPrice}</div>
                              <div className="positive" id={`tool-tip-${index}`}>+{Number(reward.received).toFixed(8)}</div>
                              <UncontrolledTooltip target={`tool-tip-${index}`} placement="top">{reward.received}</UncontrolledTooltip>
                              <div>${reward.receivedUsd}</div>
                              <div>{reward.new_balance_decimals}</div>
                            </li>
                          ))}

                        </ul>
                      </>
                      

                    

                  )}

                  {!defiLoading && !activeDeFi.some(reward => reward.received > 0) && (
                    <h5>No rewards found in the last 7 days</h5>
                  )}
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

export default DeFiTokens;
