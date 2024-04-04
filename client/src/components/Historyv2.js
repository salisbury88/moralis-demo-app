import React, { useState, useEffect } from 'react';
import { useData } from '../DataContext';
import Skeleton from './Skeleton';
import ChainDropDown from './ChainDropDown';
import DateDropDown from './DateDropDown';
import HistoryItem from './HistoryItemv2';
import HistoryIcon from './HistoryIconv2';
import TransactionImage from './TransactionImage';
import HistoryCategory from './HistoryCategory';
import ZerionTimeline from './ZerionTimeline';
import ZapperTimeline from './ZapperTimeline';
import UniswapTimeline from './UniswapTimeline';
import moment from 'moment';
import { UncontrolledTooltip } from 'reactstrap';

import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
} from 'reactstrap';

const Historyv2 = () => {
  const { globalDataCache, setGlobalDataCache } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('white'); // Default background color

  // Handler to change background color
  const changeBackgroundColor = (color) => {
    setBackgroundColor(color);
  };
  const [view, setView] = useState("Default");

  const [dateValue, setDateValue] = useState('');
  const [firstTime, setFirstTime] = useState(true);

    const toggle = (id) => {
      if (open === id) {
        setOpen();
      } else {
        setOpen(id);
      }
  };

  const fetchHistory = (chain, days) => {
    setLoading(true);
    setError(null);
    setGlobalDataCache(prevData => ({
      ...prevData,
      history:null,
      historyLoaded:false
    }));
    
    fetch(`${process.env.REACT_APP_API_URL}/api/wallet/history/new?chain=${chain}&wallet=${globalDataCache.walletAddress}&days=${days ? days : "7"}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
      })
      .then(fetchedData => {

        setGlobalDataCache(prevData => ({
          ...prevData,
          history: fetchedData.txs,
          historyLoaded:true,
          lastDate: fetchedData.lastDate
        }));
        setLoading(false);
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
      historyLoaded:false,
      selectedChain:selectedValue
    }));
    fetchHistory(selectedValue);
  };

  const handleDateChange = (days) => {
    setGlobalDataCache(prevData => ({
      ...prevData,
      days:days
    }));
    fetchHistory(globalDataCache.selectedChain, days);
  };

  const handleViewChange = (event) => {
    setView(event.target.value);
    if(event.target.value === "Zerion") {
      document.body.style.backgroundColor = "#17161B"
    }
    if(event.target.value === "Default") {
      document.body.style.backgroundColor = "#000D26"
    }
    if(event.target.value === "Zapper") {
      document.body.style.backgroundColor = "#0D1115"
    }

    if(event.target.value === "Uniswap") {
      document.body.style.backgroundColor = "#131313"
    }

  };


  const fetchMoreTxs = () => {
    let lastDate = globalDataCache.lastDate;
    let chain = globalDataCache.selectedChain;
    let days = globalDataCache.days;
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/api/wallet/history/new?chain=${chain}&wallet=${globalDataCache.walletAddress}&days=${days ? days : "7"}&lastDate=${lastDate}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
      })
      .then(fetchedData => {

        setGlobalDataCache(prevData => ({
          ...prevData,
          history: [...prevData.history, ...fetchedData.txs],
          historyLoaded:true,
          lastDate: fetchedData.lastDate
        }));
        setLoading(false);
      })
      .catch(error => {
        setError(error.message);
        setLoading(false);
      });
  };
  

  useEffect(() => {
    if (!globalDataCache.historyLoaded) {
      setLoading(true);
      fetchHistory(globalDataCache.selectedChain);
    }
  }, []);

  useEffect(() => {
    console.log("Context value changed:", globalDataCache);
  }, [globalDataCache]);

  useEffect(() => {
    localStorage.setItem('selectedChain', globalDataCache.selectedChain);
}, [globalDataCache.selectedChain, globalDataCache.days]);

  
  return (
    <div id="history-page">
      <div className="page-header">
        <h2>{view} History</h2>
        <select value={view} onChange={handleViewChange}>
          <option value="Default">Default</option>
          <option value="Zerion">Zerion</option>
          <option value="Zapper">Zapper</option>
          <option value="Uniswap">Uniswap</option>
        </select>
        <DateDropDown 
          onChange={handleDateChange} 
          days={globalDataCache.days}
        />
        {/* <ChainDropDown 
          onChange={handleDropdownChange} 
          chains={globalDataCache.chains}
          selectedChain={globalDataCache.selectedChain}
        /> */}
      </div>
      {!loading && !error && globalDataCache?.history && globalDataCache.history.length === 0 && (
          <h5>No activity found for this period.</h5>
        )}
      <div className="container">
        
        {error && <div className="text-red-500">{error}</div>} 

        { view === "Default" && (
           <Accordion flush open={open} toggle={toggle}>
           {globalDataCache.history && globalDataCache.history.map(item => (
             <AccordionItem>
               <AccordionHeader targetId={item.hash}>
 
                 <div className="history-item">
                   <div className="history-icon">
                     <HistoryIcon category={item.category}/>
                     <img className="mini-chain regular" src={`/images/${item.chain}-icon.png`}/>
                   </div>
                   <div className="history-category">
                     <div className="category"><HistoryCategory category={item.category}/>
                     {
                       item.possible_spam && 
                       <>
                         <svg id={`tooltip-${item.hash}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f7a600" width="17"><path d="M16.619,3H7.381C7.024,3,6.694,3.191,6.515,3.5l-4.618,8c-0.179,0.309-0.179,0.691,0,1l4.618,8 C6.694,20.809,7.024,21,7.381,21h9.238c0.357,0,0.687-0.191,0.866-0.5l4.618-8c0.179-0.309,0.179-0.691,0-1l-4.618-8 C17.306,3.191,16.976,3,16.619,3z M12,17L12,17c-0.552,0-1-0.448-1-1v0c0-0.552,0.448-1,1-1h0c0.552,0,1,0.448,1,1v0 C13,16.552,12.552,17,12,17z M12,13L12,13c-0.552,0-1-0.448-1-1V8c0-0.552,0.448-1,1-1h0c0.552,0,1,0.448,1,1v4 C13,12.552,12.552,13,12,13z" fill="#f7a600"/></svg>
                         <UncontrolledTooltip target={`tooltip-${item.hash}`} placement="top">
                           Spam contract
                         </UncontrolledTooltip>
                       </>
                     }
                     </div>
                     <div className="timestamp">{moment(item.block_timestamp).fromNow()}</div>
                   </div>
                   <div className="history-action">
                     <div className="history-image">
                       <TransactionImage transaction={item} chain={globalDataCache.selectedChain} />
                     </div>
                     <div className="history-info">
                       <div className="label">{item.summary}</div>
                       {item.approvals && item.approvals.length > 0 && (
                         <div className="secondary-line">
                           Spender: {item.approvals[0].spender.address_label ? item.approvals[0].spender.address_label : item.approvals[0].spender.address}
                         </div>
                       )}
 
                         <div className="secondary-line">
                           Transaction hash: {item.hash}
                         </div>
                     </div>
                   </div>
                 </div>
                 
                 </AccordionHeader>
               <AccordionBody accordionId={item.hash}>
                 <HistoryItem transaction={item} />
               </AccordionBody>
             </AccordionItem>
           ))}
         </Accordion>
        )} 

        {view === "Zerion" && (
          <>
            {globalDataCache.history
            ? <>
                <ZerionTimeline transactions={globalDataCache.history} />
                <div id="fetch-txs">
                    <button onClick={fetchMoreTxs}>More transactions</button>
                </div>
              </>
            : <></>
            }


            
          
          </>
          
          
        )}

        {view === "Zapper" && (
          <>
            {globalDataCache.history
              ? <ZapperTimeline transactions={globalDataCache.history} />
              : <></>
              }
          </>
        )}

        {view === "Uniswap" && (
          <>
            {globalDataCache.history
              ? <UniswapTimeline transactions={globalDataCache.history} />
              : <></>
              }
          </>
        )}

       
      {loading && <Skeleton />}
      
      </div>
    </div>
  );
};

export default Historyv2;
