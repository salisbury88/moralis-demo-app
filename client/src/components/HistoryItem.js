import * as utilities from '../utilities.js';

const HistoryItem = ({ transaction }) => {
    // Function to get the image URL
    const image = (transfer) => {
        if (transfer.data && transfer.data.media && transfer.data.media.media_collection && transfer.data.media.media_collection.medium) {
            return transfer.data.media.media_collection.medium.url;
        } else if (transfer.data && transfer.data.normalized_metadata && transfer.data.normalized_metadata.image) {
            return transfer.data.normalized_metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
        } else {
            return `/images/nft-placeholder.svg`;
        }
    }

    // Function to render a single summary item
    const renderSummaryItem = (label, value) => (
        <li>
            <div className="data-point">{label}</div>
            <div className="value">{value}</div>
        </li>
    );

    // Function to render the transaction summary
    const renderTransactionSummary = () => (
        <div className="tx-summary tx-details">
            <div className="title">Transaction summary</div>
            <ul>
                {renderSummaryItem('Transaction Hash', utilities.shortAddress(transaction?.hash))}
                {renderSummaryItem('Block Number', transaction?.block_number)}
                {renderSummaryItem('Timestamp', transaction?.block_timestamp)}
                {renderSummaryItem('Gas Fee', transaction?.gas_fee)}
                {renderSummaryItem('Gas Paid', transaction?.gas_paid)}
            </ul>
        </div>
    );

    // Function to render the list of NFTs based on the action
    const renderNFTList = (action) => {
        return transaction?.nft_transfers?.filter(item => item.action === action).map((item, index) => (
            <li key={item.data?.token_id ?? item.token_id ?? index}>
                <div className="image" style={{ backgroundImage: `url(${image(item)})` }}></div>
                <div>{item.data?.name ?? utilities.shortAddress(item.token_address)}</div>
                <div>#{item.data?.token_id ?? item.token_id}</div>
            </li>
        ));
    };

    const renderTokenList = (action) => {
        return transaction?.erc20_transfers?.filter(item => item.action === action).map((item, index) => (
            <li key={item.address ?? index}>
                <div className="image" style={{ backgroundImage: `url(${item.token_logo})` }}></div>
                <div>{item.value_decimal} {item.token_name}</div>
            </li>
        ));
    };

    const renderInternalTxList = (action) => {
        return transaction?.internal_transactions
        ?.filter(item => item.action === action && item.value !== "0")
        .map((item, index) => (
            <li key={item.address ?? index}>
            <div>{item.value_decimal} ETH (internal tx)</div>
            </li>
        ));
    };

    const renderInternalTxs = () => {
        return (
            <div className="tx-details tx-summary">
            <div className="title">Internal Transactions</div>
            <div className="tx-detail">
            <ul>
                {transaction?.internal_transactions?.map((item, index) => (
                    <li key={item.id ?? index}>
                    <div>To: {item.to}</div>
                    <div>From: {item.from}</div>
                    <div>Value: {item.value_decimal}</div>
                    <div>Type: {item.type}</div>
                    </li>
                ))}
                </ul>
            </div>
        </div>
        )
    };


    // Function to render the asset movements section
    const renderAssetMovements = () => (
        <div className="tx-details tx-summary">
            <div className="title">Asset movements</div>
            <div className="tx-detail">
                <div className="sent">
                    <div>Sent</div>
                    <ul>
                        {renderNFTList("sent")}
                        {renderTokenList("sent")}
                        {renderInternalTxList("sent")}
                    </ul>
                </div>
                <div className="received">
                    <div>Received</div>
                    <ul>
                        {renderNFTList("received")}
                        {renderTokenList("received")}
                        {renderInternalTxList("received")}
                    </ul>
                </div>
            </div>
        </div>
    );


    const renderInteractedAddresses = () => (
        <div className="tx-details tx-summary">
            <div className="title">Addresses involved in this transaction</div>
            <div className="tx-detail">
                
            </div>
        </div>
    );
    

    return (
        <>
            {renderTransactionSummary()}
            {renderAssetMovements()}
            {renderInternalTxs()}
            {renderInteractedAddresses()}
        </>
    );
};

export default HistoryItem;