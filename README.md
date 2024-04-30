<div align="center">
    <a align="center" href="https://moralis.io" target="_blank">
      <img src="https://github.com/MoralisWeb3/Moralis-JS-SDK/raw/main/assets/moralis-logo.svg" alt="Moralis JS SDK" height=200/>
    </a>
    <h1 align="center">Moralis Demo Project Documentation</h1>
  <br/>
</div>

### Intro
<p>Welcome to this Moralis Demo project! This is an open source project to demo the power of <a href="https://moralis.io?ref=demo-app" target="_blank">Moralis APIs</a>.</p>
<p>Note: this app contains many early stage, beta or experimental features. As a result bugs are highly likely.</p>

### App Structure
This demo app is comprised of a Nodejs server and a React frontend.

The Nodejs server runs at `http://localhost:3001/` whilst the frontend loads at `http://localhost:3001/`. 

### Local Development
To start a local development server on `3001`, run the following command in the root of the project:

```sh
node app.js
```

Then, switch to the client:
```sh
cd client
```

And start the React frontend:

```sh
npm start
```

The frontend will be available at `http://localhost:3000/`. 