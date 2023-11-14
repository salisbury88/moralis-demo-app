import React, { useState } from 'react';
import { Button } from 'reactstrap';

const WalletForm = ({ onSubmit, loading }) => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState(null);

  const isValidEthereumAddress = (address) => 
  /^(0x[a-fA-F0-9]{40})|([a-zA-Z0-9-]+\.eth)$/.test(address);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValidEthereumAddress(address)) {
      setError(null);
      onSubmit(address);
    } else {
      setError('Please enter a valid Ethereum address or ENS domain.');
    }
  };

  return (
    <div className="container wallet-form">

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter EVM address or ENS domain"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <Button 
            
            color="primary">
            {loading ? 'Loading...' : 'Check wallet'}
        </Button>
      </form>
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
};

export default WalletForm;
