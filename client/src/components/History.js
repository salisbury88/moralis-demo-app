import React, { useState, useEffect } from 'react';
import { useData } from '../DataContext';
import Skeleton from './Skeleton';
import ChainDropDown from './ChainDropDown';
import DateDropDown from './DateDropDown';
import HistoryItem from './HistoryItem';
import HistoryIcon from './HistoryIcon';
import moment from 'moment';
import { UncontrolledTooltip } from 'reactstrap';

import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
} from 'reactstrap';

const History = () => {
  const { globalDataCache, setGlobalDataCache } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState('');

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
    fetch(`${process.env.REACT_APP_API_URL}/api/wallet/history?chain=${chain}&wallet=${globalDataCache.walletAddress}&days=${days ? days : "30"}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
      })
      .then(fetchedData => {

        setGlobalDataCache(prevData => ({
          ...prevData,
          history: fetchedData,
          historyLoaded:true
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
        <h2>History</h2>
        <DateDropDown 
          onChange={handleDateChange} 
          days={globalDataCache.days}
        />
        <ChainDropDown 
          onChange={handleDropdownChange} 
          chains={globalDataCache.chains}
          selectedChain={globalDataCache.selectedChain}
        />
      </div>

      <div className="container">
        {loading && <Skeleton />}
        {error && <div className="text-red-500">{error}</div>} 

        <Accordion flush open={open} toggle={toggle}>
          {globalDataCache.history && globalDataCache.history.map(item => (
            <AccordionItem>
              <AccordionHeader targetId={item.hash}>

                <div className="history-item">
                  <div className="history-icon">
                    <HistoryIcon category={item.category}/>
                  </div>
                  <div className="history-category">
                    <div className="category">{item.category}
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
                    {
                        item.image.hasImage 
                        ? <div className="image" style={{ backgroundImage: `url(${item.image.imageUrl})` }}></div>
                        : <span dangerouslySetInnerHTML={{ __html: item.image.imageUrl }} />
                    }

                      {
                        !item.image.imageUrl
                        ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="#ffffff"><path d="M 24 1 C 11.32 1 1 11.32 1 24 L 1 54.75 C 1 56.41 2.34 57.75 4 57.75 C 5.66 57.75 7 56.41 7 54.75 L 7 24 C 7 14.63 14.63 7 24 7 L 104 7 C 113.37 7 121 14.63 121 24 L 121 35 C 121 36.66 122.34 38 124 38 C 125.66 38 127 36.66 127 35 L 127 24 C 127 11.32 116.68 1 104 1 L 24 1 z M 109 46 C 99.08 46 91 54.07 91 64 C 91 73.93 99.08 82 109 82 L 124 82 C 125.66 82 127 80.66 127 79 L 127 49 C 127 47.34 125.66 46 124 46 L 109 46 z M 39 51 C 18.05 51 1 68.05 1 89 C 1 109.95 18.05 127 39 127 C 59.95 127 77 109.95 77 89 C 77 68.05 59.95 51 39 51 z M 109 52 L 121 52 L 121 76 L 109 76 C 102.38 76 97 70.62 97 64 C 97 57.38 102.38 52 109 52 z M 39 57 C 56.64 57 71 71.35 71 89 C 71 106.65 56.64 121 39 121 C 21.36 121 7 106.65 7 89 C 7 71.35 21.36 57 39 57 z M 58.113281 77.001953 C 57.347031 76.971953 56.570938 77.235781 55.960938 77.800781 L 36.480469 95.880859 L 28.070312 87.830078 C 26.870313 86.690078 24.980078 86.729922 23.830078 87.919922 C 22.680078 89.119922 22.729922 91.020156 23.919922 92.160156 L 34.380859 102.16992 C 34.960859 102.71992 35.709219 103 36.449219 103 C 37.179219 103 37.910234 102.72922 38.490234 102.19922 L 60.039062 82.199219 C 61.249063 81.069219 61.329219 79.170938 60.199219 77.960938 C 59.634219 77.355938 58.879531 77.031953 58.113281 77.001953 z M 124 90 C 122.34 90 121 91.34 121 93 L 121 104 C 121 113.37 113.37 121 104 121 L 73.25 121 C 71.59 121 70.25 122.34 70.25 124 C 70.25 125.66 71.59 127 73.25 127 L 104 127 C 116.68 127 127 116.68 127 104 L 127 93 C 127 91.34 125.66 90 124 90 z" fill="#ffffff"/></svg>
                        : ''
                      }
                    </div>
                    <div className="history-info">
                      <div className="label">{item.label}</div>
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

      </div>
    </div>
  );
};

export default History;
