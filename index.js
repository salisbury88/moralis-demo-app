// index.js
import express from 'express';
import cors from 'cors';
import apiIndex from './api/index.js';
import tokenApi from './api/tokens.js';
import nftApi from './api/nfts.js';
import historyApi from './api/history.js';
import path from 'path';
const __dirname = path.resolve();



const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.resolve(__dirname, './client/build')));
app.use(validateChain);

app.use('/', apiIndex);
app.use('/', tokenApi);
app.use('/', nftApi);
app.use('/', historyApi);
const chains = ['eth', 'polygon', 'bsc', 'fantom', 'avalanche', 'arbitrum', 'cronos', 'palm'];
function validateChain(req, res, next) {
  const requestedChain = req.query.chain;

  // Check if req.query.chain exists
  if (requestedChain) {
    // Check if the requested chain is in the allowed list
    if (chains.includes(requestedChain)) {
      // If allowed, set req.chain to req.query.chain
      req.chain = requestedChain;
    } else {
      // If not allowed, default to req.chain = "eth"
      req.chain = 'eth';
    }
  } else {
    // If req.query.chain does not exist, default to req.chain = "eth"
    req.chain = 'eth';
  }

  // Continue to the next middleware or route handler
  next();
}



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, './client/public');
  app.use(express.static(publicPath));
  app.use('*', express.static(publicPath));
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});