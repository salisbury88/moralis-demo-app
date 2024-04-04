import React from 'react';

function TransactionImage({ transaction, chain }) {
  // Function to find the first image URL in the nft_transfers array
  const findImageUrl = () => {
    // Check if nft_transfers array exists and has at least one entry
    if (transaction.nft_transfers?.length > 0) {
      for (let transfer of transaction.nft_transfers) {
        if (transfer.normalized_metadata?.image) {
          // Return the first found image URL
          return transfer.normalized_metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
        }
      }
    }


    if (transaction.nft_transfers?.length > 0) {
        for (let transfer of transaction.nft_transfers) {
            if (transfer.collection_logo) {
            // Return the first found image URL
            return transfer.collection_logo;
            }
        }
    }

    if (transaction.erc20_transfers?.length > 0) {
        for (let transfer of transaction.erc20_transfers) {
          if (transfer.token_logo) {
            // Return the first found image URL
            return transfer.token_logo;
          }
        }
      }

      if (transaction.category === "send" || transaction.category === "receive") {
        return `/images/${chain}-icon.png`;
    }
    // Return null if no image URL is found
    return `https://api.dicebear.com/7.x/identicon/svg?backgroundColor=b6e3f4&seed=${transaction.hash}`
  };
  

  // Call the findImageUrl function to get the image URL
  const imageUrl = findImageUrl();

  // Render the image if imageUrl is not null, otherwise render a placeholder or nothing
  return (
    imageUrl ? <img src={imageUrl} alt="NFT" /> : ""
  );
}
export default TransactionImage;