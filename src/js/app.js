// Contract addresses - UPDATE THESE WITH YOUR ACTUAL DEPLOYED CONTRACTS
const carNftAddress = "0xc41b2099a5B9ed58C729B724d83055E4aD5aA366";
const marketplaceAddress = "0x2c535FcFC61077eb54091ae052D81371615DB620";

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
        // Remove any existing loading overlay first
        this.hideLoading();
        
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
        // Remove ALL loading overlays (in case multiple were created)
        const loadingDivs = document.querySelectorAll('#loading-overlay');
        loadingDivs.forEach(div => div.remove());
    }

    // List car for sale (this also mints the NFT)
    static async listCar(make, model, year, priceEther) {
        try {
            const contracts = await this.getContracts();
            if (!contracts) {
                throw new Error('Please connect your wallet first');
            }

            const { market, signer } = contracts;

            // Validate network
            const network = await signer.provider.getNetwork();
            if (!SUPPORTED_NETWORKS[network.chainId]) {
                throw new Error(`Unsupported network. Please switch to Ethereum, Polygon, or Sepolia testnet.`);
            }

            this.showLoading('Listing your car on the marketplace...');

            // Convert price to wei
            const priceWei = ethers.utils.parseEther(priceEther.toString());

            // Call listCar on marketplace - this mints the NFT and lists it
            const tx = await market.listCar(make, model, parseInt(year), priceWei);

            this.showLoading(`Waiting for confirmation... (Tx: ${tx.hash.substring(0, 10)}...)`);
            const receipt = await tx.wait();

            this.hideLoading();

            // Get the carId from the event
            const listEvent = receipt.events?.find(e => e.event === 'CarListed');
            const carId = listEvent?.args?.carId;
            const tokenId = listEvent?.args?.tokenId;

            deAutoApp.showNotification(`Car listed successfully! Car ID: ${carId}, Token ID: ${tokenId}`, 'success');

            // Reload relevant data
            if (typeof marketplaceManager !== 'undefined') {
                await marketplaceManager.loadListings();
            }

            return { tx, carId, tokenId, receipt };
        } catch (error) {
            this.hideLoading();
            console.error('Error listing car:', error);

            let errorMessage = 'Error listing car: ';
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

    // Buy car with comprehensive validation
    static async buyCar(carId, priceWei) {
        try {
            const contracts = await this.getContracts();
            if (!contracts) {
                throw new Error('Please connect your wallet first');
            }

            const { market, signer } = contracts;

            // Validate network
            const network = await signer.provider.getNetwork();
            const networkInfo = SUPPORTED_NETWORKS[network.chainId];
            if (!networkInfo) {
                throw new Error('Unsupported network. Please switch to a supported network.');
            }

            this.showLoading('Validating purchase...');

            // Check if listing still exists and is active
            const car = await market.getCar(carId);
            if (car.isSold) {
                throw new Error('This car is no longer available for sale');
            }

            // Check if user is not the seller
            if (car.seller.toLowerCase() === deAutoApp.currentUser.toLowerCase()) {
                throw new Error('You cannot buy your own car');
            }

            // Check user balance
            const balance = await signer.getBalance();
            const gasEstimate = await market.estimateGas.buyCar(carId, { value: priceWei });
            const gasPrice = await signer.provider.getGasPrice();
            const totalGasCost = gasEstimate.mul(gasPrice);
            const totalRequired = priceWei.add(totalGasCost);

            if (balance.lt(totalRequired)) {
                const currency = networkInfo.currency;
                throw new Error(`Insufficient ${currency}. Need ${ethers.utils.formatEther(totalRequired)} ${currency}`);
            }

            this.showLoading('Processing purchase...');

            const tx = await market.buyCar(carId, {
                value: priceWei,
                gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
            });

            this.showLoading(`Confirming transaction... (Tx: ${tx.hash.substring(0, 10)}...)`);
            const receipt = await tx.wait();

            this.hideLoading();

            deAutoApp.showNotification(`Car purchased successfully! You are now the owner.`, 'success');

            // Reload data
            if (typeof marketplaceManager !== 'undefined') {
                await marketplaceManager.loadListings();
            }
            if (typeof myGarageManager !== 'undefined') {
                await myGarageManager.loadMyCars();
            }

            return { tx, receipt, carId };
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

    // Get user's owned cars by checking Transfer events
    static async getMyCars() {
        try {
            const contracts = await this.getContracts();
            if (!contracts || !deAutoApp.currentUser) return [];

            const { nft, market } = contracts;

            // Get all CarMinted events and filter for current owner
            const mintFilter = nft.filters.CarMinted();
            const transferFilter = nft.filters.Transfer(null, deAutoApp.currentUser);
            
            // Get transfer events TO user
            const transferEvents = await nft.queryFilter(transferFilter, -50000);
            
            const cars = [];
            const processedTokens = new Set();

            for (const event of transferEvents) {
                try {
                    const tokenId = event.args.tokenId;
                    
                    // Skip if already processed
                    if (processedTokens.has(tokenId.toString())) continue;
                    processedTokens.add(tokenId.toString());

                    // Check if user still owns this token
                    const currentOwner = await nft.ownerOf(tokenId);
                    if (currentOwner.toLowerCase() !== deAutoApp.currentUser.toLowerCase()) continue;

                    // Get car details from NFT contract
                    const details = await nft.getCarDetails(tokenId);

                    // Check if it's listed in marketplace
                    let isListed = false;
                    let listPrice = "0";
                    try {
                        const car = await market.getCarByTokenId(tokenId);
                        if (car.carId.toString() !== "0" && !car.isSold) {
                            // If marketplace owns the NFT, it's listed
                            isListed = currentOwner.toLowerCase() === market.address.toLowerCase();
                            listPrice = ethers.utils.formatEther(car.price);
                        }
                    } catch (e) {
                        // Car not in marketplace
                    }

                    cars.push({
                        tokenId: tokenId.toString(),
                        name: `${details.make} ${details.model}`,
                        make: details.make,
                        model: details.model,
                        year: details.year.toString(),
                        image: "https://via.placeholder.com/400x300?text=" + encodeURIComponent(`${details.make} ${details.model}`),
                        description: `${details.year} ${details.make} ${details.model}`,
                        isListed: isListed,
                        listPrice: listPrice
                    });
                } catch (tokenError) {
                    console.warn('Error fetching token', tokenError);
                }
            }

            return cars;
        } catch (error) {
            console.error('Error getting my cars:', error);
            return [];
        }
    }

    // Get marketplace listings
    static async getListings() {
        try {
            const contracts = await this.getContracts();
            if (!contracts) return [];

            const { market, nft } = contracts;

            this.showLoading('Loading marketplace listings...');

            // Get all available cars directly from contract
            const availableCars = await market.getAllAvailableCars();

            const listings = availableCars.map(car => {
                // Check for stored image in localStorage
                let carImage = "https://via.placeholder.com/400x300?text=" + encodeURIComponent(`${car.make} ${car.model}`);
                if (typeof CarImageStorage !== 'undefined') {
                    const storedImage = CarImageStorage.get(car.tokenId.toString());
                    if (storedImage) {
                        carImage = storedImage;
                    }
                }
                
                return {
                    carId: car.carId.toString(),
                    tokenId: car.tokenId.toString(),
                    name: `${car.make} ${car.model}`,
                    make: car.make,
                    model: car.model,
                    year: car.year.toString(),
                    price: ethers.utils.formatEther(car.price),
                    priceWei: car.price,
                    image: carImage,
                    seller: car.seller,
                    description: `${car.year} ${car.make} ${car.model}`
                };
            });

            this.hideLoading();

            return listings;

        } catch (error) {
            this.hideLoading();
            console.error('Error getting listings:', error);
            return [];
        }
    }

    // Remove listing
    static async removeListing(carId) {
        try {
            const contracts = await this.getContracts();
            if (!contracts) {
                throw new Error('Please connect your wallet first');
            }

            const { market } = contracts;

            this.showLoading('Removing listing...');

            const tx = await market.removeCar(carId);
            await tx.wait();

            this.hideLoading();
            deAutoApp.showNotification("Listing removed successfully!", 'success');

            // Reload data
            if (typeof marketplaceManager !== 'undefined') {
                await marketplaceManager.loadListings();
            }
            if (typeof myGarageManager !== 'undefined') {
                await myGarageManager.loadMyCars();
            }

            return tx;
        } catch (error) {
            this.hideLoading();
            console.error('Error removing listing:', error);
            deAutoApp.showNotification('Error removing listing: ' + error.message, 'error');
            throw error;
        }
    }

    // Update car price
    static async updateCarPrice(carId, newPriceEther) {
        try {
            const contracts = await this.getContracts();
            if (!contracts) {
                throw new Error('Please connect your wallet first');
            }

            const { market } = contracts;

            this.showLoading('Updating price...');

            const priceWei = ethers.utils.parseEther(newPriceEther.toString());
            const tx = await market.updateCarPrice(carId, priceWei);
            await tx.wait();

            this.hideLoading();
            deAutoApp.showNotification("Price updated successfully!", 'success');

            // Reload data
            if (typeof marketplaceManager !== 'undefined') {
                await marketplaceManager.loadListings();
            }

            return tx;
        } catch (error) {
            this.hideLoading();
            console.error('Error updating price:', error);
            deAutoApp.showNotification('Error updating price: ' + error.message, 'error');
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