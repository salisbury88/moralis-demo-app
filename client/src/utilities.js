export function returnNFTImage(nft, resolution) {
    if (nft.media && nft.media.media_collection && nft.media.media_collection.high && String(nft.media.media_collection.high.url).indexOf("charset=utf-8") < 0) {
        if(resolution === "high") {
            return nft.media.media_collection.high.url;
        }

        return  nft.media.media_collection.medium.url;
        
    } else if (nft.normalized_metadata && nft.normalized_metadata.image) {
        return nft.normalized_metadata.image;
    } else {
        return "/images/nft-placeholder.svg";
    }

}

export function shortAddress(address) {
    return `${address.slice(0,10)}...${address.slice(-4)}`
}