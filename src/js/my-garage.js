// My Garage specific functionality
class MyGarageManager {
    constructor() {
        this.myCars = [];
        this.selectedCar = null;
    }

    async init() {
        await this.loadMyCars();
        this.setupEventListeners();
    }

    async loadMyCars() {
        try {
            const garageGrid = document.getElementById('garageGrid');
            if (garageGrid) {
                garageGrid.innerHTML = `
                    <div class="col-span-full flex items-center justify-center py-12">
                        <div class="text-center">
                            <div class="spinner mx-auto mb-4"></div>
                            <p class="text-white/60">Loading your garage...</p>
                        </div>
                    </div>
                `;
            }

            if (!deAutoApp.currentUser) {
                this.renderEmptyState('Please connect your wallet to view your cars');
                return;
            }

            this.myCars = await ContractManager.getMyCars();
            this.renderMyCars();
        } catch (error) {
            console.error('Error loading my cars:', error);
            this.renderEmptyState('Error loading your cars. Please try again.');
        }
    }

    renderMyCars() {
        const grid = document.getElementById('garageGrid');
        if (!grid) return;

        if (this.myCars.length === 0) {
            this.renderEmptyState();
            return;
        }

        grid.innerHTML = this.myCars.map(car => this.createCarCard(car)).join('');
    }

    renderEmptyState(message = null) {
        const grid = document.getElementById('garageGrid');
        if (!grid) return;

        const defaultMessage = deAutoApp.currentUser ?
            "You don't own any car NFTs yet. Buy a car from the marketplace or list your own!" :
            "Please connect your wallet to view your cars";

        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">🏠</div>
                <h3 class="text-white text-xl mb-2">Empty Garage</h3>
                <p class="text-white/60 mb-6">${message || defaultMessage}</p>
                ${deAutoApp.currentUser ? `
                    <div class="flex gap-3 justify-center flex-wrap">
                        <a href="marketplace.html" 
                            class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors inline-block font-semibold">
                            Browse Marketplace
                        </a>
                        <button onclick="deAutoApp.showModal('listModal')" 
                            class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold">
                            + List Your Car
                        </button>
                    </div>
                ` : `
                    <button onclick="deAutoApp.connectWallet()" 
                        class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                        Connect Wallet
                    </button>
                `}
            </div>
        `;
    }

    createCarCard(car) {
        return `
            <div class="flex flex-col gap-4 p-4 rounded-xl bg-background-dark/50 border border-white/10 card-glow hover:border-primary/50 transition-all duration-300">
                <div class="relative">
                    <div class="w-full aspect-video rounded-lg overflow-hidden bg-background-dark/80 flex items-center justify-center">
                        <div class="text-center">
                            <div class="text-4xl mb-2">🚗</div>
                            <div class="text-white/60 text-sm">${car.make}</div>
                        </div>
                    </div>
                    <div class="absolute top-2 right-2">
                        <span class="status-owned px-2 py-1 rounded text-xs font-medium bg-green-600/80 text-white">Owned</span>
                    </div>
                </div>
                
                <div class="flex flex-col gap-3 flex-1">
                    <div>
                        <h3 class="text-white text-lg font-bold leading-normal">${car.name}</h3>
                        <p class="text-white/60 text-sm">${car.year} ${car.make} ${car.model}</p>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-white/60 text-xs">Token ID</p>
                            <p class="text-white/80 text-sm font-mono">#${car.tokenId}</p>
                        </div>
                        ${car.isListed ? `
                            <div class="text-right">
                                <p class="text-white/60 text-xs">Listed for</p>
                                <p class="text-primary text-sm font-bold">${car.listPrice} ETH</p>
                            </div>
                        ` : ''}
                    </div>

                    <div class="flex gap-2 mt-auto">
                        <button onclick="myGarageManager.viewDetails('${car.tokenId}')" 
                            class="flex-1 bg-white/10 text-white/80 hover:text-white hover:bg-white/20 py-2 px-4 rounded-lg transition-colors text-sm">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    viewDetails(tokenId) {
        // Navigate to car details page - car-details.html accepts both carId and tokenId
        window.location.href = `car-details.html?tokenId=${tokenId}`;
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshGarageBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadMyCars());
        }
    }
}

// Initialize garage manager
const myGarageManager = new MyGarageManager();

// Make it globally available
window.myGarageManager = myGarageManager;