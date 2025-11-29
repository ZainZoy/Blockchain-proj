// Contract addresses - UPDATE THESE WITH YOUR ACTUAL DEPLOYED CONTRACTS
const carNftAddress = "0x9049D99B7728057D5f948D0d4bdFD41fd6C2Cbe0";
const marketplaceAddress = "0xD4f89851C2e8509A40D7Ef8f7DBB00D3f081C9F6";

// Network configuration
const SUPPORTED_NETWORKS = {
    1: { name: 'Ethereum Mainnet', currency: 'ETH' },
    11155111: { name: 'Sepolia Testnet', currency: 'ETH' },
    137: { name: 'Polygon Mainnet', currency: 'MATIC' },
    80001: { name: 'Polygon Mumbai', currency: 'MATIC' }
};

// Load ABIs
let CarNFT, CarMarketplace;

async function loadABIs() {
    try {
        const nftResponse = await fetch('./src/abi/CarNFT.json');
        const marketResponse = await fetch('./src/abi/CarMarketplace.json');

        CarNFT = await nftResponse.json();
        CarMarketplace = await marketResponse.json();
    } catch (error) {
        console.error('Error loading ABIs:', error);
    }
}

// Enhanced contract functions
class ContractManager {
    static async getContracts() {
        return deAutoApp.contracts || await deAutoApp.loadContracts();
    }

    // Show loading state
    static showLoading(message = 'Processing...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-overlay';
        loadingDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loadingDiv.innerHTML = `
            <div class="bg-background-dark p-6 rounded-lg border border-primary/20 text-center">
                <div class="spinner mx-auto mb-4"></div>
                <p class="text-white">${message}</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }

    static hideLoading() {
        const loadingDiv = document.getElementById('loading-overlay');
        if (loadingDiv) loadingDiv.remove();
    }

    // Mint car function with enhanced error handling and validation
    static async mintCar(vin, make, model, year, tokenURI) {
        try {
            const contracts = await this.getContracts();
            if (!contracts) {
                throw new Error('Please connect your wallet first');
            }

            const { nft, signer } = contracts;

            // Validate network
            const network = await signer.provider.getNetwork();
            if (!SUPPORTED_NETWORKS[network.chainId]) {
                throw new Error(`Unsupported network. Please switch to Ethereum, Polygon, or Sepolia testnet.`);
            }

            this.showLoading('Checking wallet balance...');

            // Check if user has enough ETH/MATIC for gas
            const balance = await signer.getBalance();
            const gasEstimate = await nft.estimateGas.mintCar(
                deAutoApp.currentUser,
                tokenURI,
                vin,
                make,
                model,
                year
            );
            const gasPrice = await signer.provider.getGasPrice();
            const totalGasCost = gasEstimate.mul(gasPrice);

            if (balance.lt(totalGasCost)) {
                const currency = SUPPORTED_NETWORKS[network.chainId].currency;
                throw new Error(`Insufficient ${currency} for gas fees. Need at least ${ethers.utils.formatEther(totalGasCost)} ${currency}`);
            }

            this.showLoading('Minting your car NFT...');

            // Check if VIN already exists (if contract supports this)
            try {
                // This assumes your contract has a function to check VIN uniqueness
                const vinExists = await nft.vinExists(vin);
                if (vinExists) {
                    throw new Error('A car with this VIN already exists');
                }
            } catch (e) {
                // If function doesn't exist, continue
                console.log('VIN check not available');
            }

            const tx = await nft.mintCar(
                deAutoApp.currentUser,
                tokenURI,
                vin,
                make,
                model,
                year,
                {
                    gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
                }
            );

            this.showLoading(`Waiting for confirmation... (Tx: ${tx.hash.substring(0, 10)}...)`);
            const receipt = await tx.wait();

            this.hideLoading();

            // Get the token ID from the event
            const mintEvent = receipt.events?.find(e => e.event === 'Transfer' || e.event === 'CarMinted');
            const tokenId = mintEvent?.args?.tokenId || mintEvent?.args?.[2];

            deAutoApp.showNotification(`Car minted successfully! Token ID: ${tokenId}`, 'success');

            // Update contract address display
            document.querySelectorAll('#contractAddress').forEach(el => {
                el.textContent = `${carNftAddress.substring(0, 6)}...${carNftAddress.slice(-4)}`;
            });

            // Reload relevant data
            if (deAutoApp.currentPage === 'my-garage') {
                await myGarageManager.loadMyCars();
            }

            return { tx, tokenId, receipt };
        } catch (error) {
            this.hideLoading();
            console.error('Error minting car:', error);

            let errorMessage = 'Error minting car: ';
            if (error.code === 4001) {
                errorMessage += 'Transaction rejected by user';
            } else if (error.code === -32603) {
                errorMessage += 'Internal JSON-RPC error';
            } else if (error.message.includes('insufficient funds')) {
                errorMessage += 'Insufficient funds for gas';
            } else {
                errorMessage += error.message;
            }

            deAutoApp.showNotification(errorMessage, 'error');
            throw error;
        }
    }

    // List car for sale
    static async listCar(tokenId, priceEther) {
        try {
            const contracts = await this.getContracts();
            if (!contracts) {
                throw new Error('Please connect your wallet first');
            }

            const { nft, market } = contracts;

            this.showLoading('Approving marketplace...');

            // 1. Check if already approved
            const approved = await nft.getApproved(tokenId);
            if (approved !== market.address) {
                const approveTx = await nft.approve(market.address, tokenId);
                await approveTx.wait();
            }

            this.showLoading('Listing car for sale...');

            // 2. List the car
            const tx = await market.listCar(tokenId, ethers.utils.parseEther(priceEther));
            await tx.wait();

            this.hideLoading();
            deAutoApp.showNotification("Car listed successfully!", 'success');

            // Reload listings
            if (deAutoApp.currentPage === 'marketplace') {
                await deAutoApp.loadMarketplace();
            }
            if (deAutoApp.currentPage === 'my-garage') {
                await deAutoApp.loadMyGarage();
            }

            return tx;
        } catch (error) {
            this.hideLoading();
            console.error('Error listing car:', error);
            deAutoApp.showNotification('Error listing car: ' + error.message, 'error');
            throw error;
        }
    }

    // Buy car with comprehensive validation and real transaction handling
    static async buyCar(tokenId, priceEther) {
        try {
            const contracts = await this.getContracts();
            if (!contracts) {
                throw new Error('Please connect your wallet first');
            }

            const { market, nft, signer } = contracts;

            // Validate network
            const network = await signer.provider.getNetwork();
            const networkInfo = SUPPORTED_NETWORKS[network.chainId];
            if (!networkInfo) {
                throw new Error('Unsupported network. Please switch to a supported network.');
            }

            this.showLoading('Validating purchase...');

            // Check if listing still exists and is active
            const listing = await market.listings(tokenId);
            if (!listing.active) {
                throw new Error('This car is no longer available for sale');
            }

            // Verify the price matches
            const listingPrice = listing.price;
            const expectedPrice = ethers.utils.parseEther(priceEther);
            if (!listingPrice.eq(expectedPrice)) {
                throw new Error('Price has changed. Please refresh and try again.');
            }

            // Check if user is not the seller
            if (listing.seller.toLowerCase() === deAutoApp.currentUser.toLowerCase()) {
                throw new Error('You cannot buy your own car');
            }

            // Check user balance
            const balance = await signer.getBalance();
            const gasEstimate = await market.estimateGas.buyCar(tokenId, { value: expectedPrice });
            const gasPrice = await signer.provider.getGasPrice();
            const totalGasCost = gasEstimate.mul(gasPrice);
            const totalRequired = expectedPrice.add(totalGasCost);

            if (balance.lt(totalRequired)) {
                const currency = networkInfo.currency;
                throw new Error(`Insufficient ${currency}. Need ${ethers.utils.formatEther(totalRequired)} ${currency} (${priceEther} + gas)`);
            }

            this.showLoading('Processing purchase...');

            const tx = await market.buyCar(tokenId, {
                value: expectedPrice,
                gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
            });

            this.showLoading(`Confirming transaction... (Tx: ${tx.hash.substring(0, 10)}...)`);
            const receipt = await tx.wait();

            this.hideLoading();

            // Verify ownership transfer
            const newOwner = await nft.ownerOf(tokenId);
            if (newOwner.toLowerCase() !== deAutoApp.currentUser.toLowerCase()) {
                throw new Error('Ownership transfer failed. Please contact support.');
            }

            deAutoApp.showNotification(`Car purchased successfully! You are now the owner of Token #${tokenId}`, 'success');

            // Reload data
            if (deAutoApp.currentPage === 'marketplace') {
                await marketplaceManager.loadListings();
            }
            if (deAutoApp.currentPage === 'my-garage') {
                await myGarageManager.loadMyCars();
            }

            return { tx, receipt, tokenId };
        } catch (error) {
            this.hideLoading();
            console.error('Error buying car:', error);

            let errorMessage = 'Error buying car: ';
            if (error.code === 4001) {
                errorMessage += 'Transaction rejected by user';
            } else if (error.message.includes('insufficient funds')) {
                errorMessage += 'Insufficient funds';
            } else if (error.message.includes('execution reverted')) {
                errorMessage += 'Transaction failed - car may no longer be available';
            } else {
                errorMessage += error.message;
            }

            deAutoApp.showNotification(errorMessage, 'error');
            throw error;
        }
    }

    // Get user's owned cars
    static async getMyCars() {
        try {
            const contracts = await this.getContracts();
            if (!contracts || !deAutoApp.currentUser) return [];

            const { nft } = contracts;

            // Get balance of user
            const balance = await nft.balanceOf(deAutoApp.currentUser);
            const cars = [];

            // Get each token owned by user
            for (let i = 0; i < balance.toNumber(); i++) {
                try {
                    const tokenId = await nft.tokenOfOwnerByIndex(deAutoApp.currentUser, i);
                    const tokenURI = await nft.tokenURI(tokenId);

                    // Fetch metadata from IPFS/URI
                    let metadata = {};
                    try {
                        if (tokenURI.startsWith('http')) {
                            const response = await fetch(tokenURI);
                            metadata = await response.json();
                        }
                    } catch (metaError) {
                        console.warn('Could not fetch metadata for token', tokenId);
                    }

                    cars.push({
                        tokenId: tokenId.toString(),
                        name: metadata.name || `Car #${tokenId}`,
                        image: metadata.image || "https://via.placeholder.com/400x300?text=Car+NFT",
                        description: metadata.description || "",
                        attributes: metadata.attributes || [],
                        isListed: false // You'll need to check marketplace contract
                    });
                } catch (tokenError) {
                    console.warn('Error fetching token at index', i, tokenError);
                }
            }

            return cars;
        } catch (error) {
            console.error('Error getting my cars:', error);
            return [];
        }
    }

    // Get marketplace listings with real blockchain data
    static async getListings() {
        try {
            const contracts = await this.getContracts();
            if (!contracts) return [];

            const { market, nft } = contracts;

            this.showLoading('Loading marketplace listings...');

            // Get all listing events from the marketplace contract
            const listingFilter = market.filters.CarListed();
            const listingEvents = await market.queryFilter(listingFilter, -10000); // Last 10k blocks

            const listings = [];

            for (const event of listingEvents) {
                try {
                    const { tokenId, seller, price } = event.args;

                    // Check if still listed (not sold or removed)
                    const listing = await market.listings(tokenId);
                    if (!listing.active) continue;

                    // Get NFT metadata
                    const tokenURI = await nft.tokenURI(tokenId);
                    let metadata = {
                        name: `Car NFT #${tokenId}`,
                        description: 'Unique car NFT',
                        image: 'https://via.placeholder.com/400x300?text=Car+NFT'
                    };

                    // Try to fetch metadata from URI
                    try {
                        if (tokenURI.startsWith('http')) {
                            const response = await fetch(tokenURI);
                            const fetchedMetadata = await response.json();
                            metadata = { ...metadata, ...fetchedMetadata };
                        }
                    } catch (metaError) {
                        console.warn('Could not fetch metadata for token', tokenId);
                    }

                    // Get car details if available
                    let carDetails = {};
                    try {
                        carDetails = await nft.getCarDetails(tokenId);
                    } catch (e) {
                        console.log('Car details not available for token', tokenId);
                    }

                    listings.push({
                        tokenId: tokenId.toString(),
                        name: metadata.name || `${carDetails.make || 'Unknown'} ${carDetails.model || 'Car'} #${tokenId}`,
                        price: ethers.utils.formatEther(price),
                        priceWei: price,
                        image: metadata.image,
                        seller: seller,
                        description: metadata.description,
                        attributes: metadata.attributes || [],
                        carDetails: carDetails,
                        listingTimestamp: event.blockNumber
                    });
                } catch (tokenError) {
                    console.warn('Error processing token', event.args.tokenId, tokenError);
                }
            }

            this.hideLoading();

            // Sort by most recent listings first
            return listings.sort((a, b) => b.listingTimestamp - a.listingTimestamp);

        } catch (error) {
            this.hideLoading();
            console.error('Error getting listings:', error);

            // Return sample data if blockchain query fails
            return [
                {
                    tokenId: "1",
                    name: "Sample Car NFT #1",
                    price: "0.1",
                    priceWei: ethers.utils.parseEther("0.1"),
                    image: "https://via.placeholder.com/400x300?text=Sample+Car+1",
                    seller: "0x123...abc",
                    description: "Sample car for demonstration"
                }
            ];
        }
    }

    // Remove listing
    static async removeListing(tokenId) {
        try {
            const contracts = await this.getContracts();
            if (!contracts) {
                throw new Error('Please connect your wallet first');
            }

            const { market } = contracts;

            this.showLoading('Removing listing...');

            const tx = await market.removeListing(tokenId);
            await tx.wait();

            this.hideLoading();
            deAutoApp.showNotification("Listing removed successfully!", 'success');

            // Reload data
            if (deAutoApp.currentPage === 'marketplace') {
                await deAutoApp.loadMarketplace();
            }
            if (deAutoApp.currentPage === 'my-garage') {
                await deAutoApp.loadMyGarage();
            }

            return tx;
        } catch (error) {
            this.hideLoading();
            console.error('Error removing listing:', error);
            deAutoApp.showNotification('Error removing listing: ' + error.message, 'error');
            throw error;
        }
    }
}

// Make ContractManager available globally
window.ContractManager = ContractManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    await loadABIs();
    deAutoApp.init();
});