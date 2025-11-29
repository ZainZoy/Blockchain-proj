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
            "You don't own any car NFTs yet" :
            "Please connect your wallet to view your cars";

        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">🏠</div>
                <h3 class="text-white text-xl mb-2">Empty Garage</h3>
                <p class="text-white/60 mb-6">${message || defaultMessage}</p>
                ${deAutoApp.currentUser ? `
                    <button onclick="deAutoApp.showModal('mintModal')" 
                        class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                        Mint Your First Car
                    </button>
                ` : `
                    <button onclick="deAutoApp.connectWallet()" 
                        class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
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
                    <div class="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg overflow-hidden" 
                         style="background-image: url('${car.image}')">
                        <img src="${car.image}" alt="${car.name}" 
                             class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                             onerror="this.src='https://via.placeholder.com/400x300?text=Car+NFT'">
                    </div>
                    <div class="absolute top-2 right-2">
                        ${car.isListed ?
                '<span class="status-listed px-2 py-1 rounded text-xs font-medium">Listed</span>' :
                '<span class="status-owned px-2 py-1 rounded text-xs font-medium">Owned</span>'
            }
                    </div>
                </div>
                
                <div class="flex flex-col gap-3 flex-1">
                    <div>
                        <h3 class="text-white text-lg font-bold leading-normal">${car.name}</h3>
                        <p class="text-white/60 text-sm line-clamp-2">${car.description || 'No description available'}</p>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-white/60 text-xs">Token ID</p>
                            <p class="text-white/80 text-sm font-mono">#${car.tokenId}</p>
                        </div>
                        ${car.isListed ? `
                            <div class="text-right">
                                <p class="text-white/60 text-xs">Listed Price</p>
                                <p class="text-primary text-lg font-bold">${car.listPrice} ETH</p>
                            </div>
                        ` : ''}
                    </div>

                    ${car.attributes && car.attributes.length > 0 ? `
                        <div class="flex flex-wrap gap-1">
                            ${car.attributes.slice(0, 3).map(attr => `
                                <span class="bg-white/10 text-white/80 text-xs px-2 py-1 rounded">
                                    ${attr.trait_type}: ${attr.value}
                                </span>
                            `).join('')}
                            ${car.attributes.length > 3 ? `<span class="text-white/60 text-xs">+${car.attributes.length - 3} more</span>` : ''}
                        </div>
                    ` : ''}

                    <div class="flex gap-2 mt-auto">
                        ${car.isListed ? `
                            <button onclick="myGarageManager.removeListing('${car.tokenId}')" 
                                class="flex-1 bg-red-600/20 text-red-400 border border-red-600/30 py-2 px-4 rounded-lg hover:bg-red-600/30 transition-colors text-sm font-medium">
                                Remove Listing
                            </button>
                        ` : `
                            <button onclick="myGarageManager.showListModal('${car.tokenId}')" 
                                class="flex-1 bg-green-600/20 text-green-400 border border-green-600/30 py-2 px-4 rounded-lg hover:bg-green-600/30 transition-colors text-sm font-medium">
                                List for Sale
                            </button>
                        `}
                        <button onclick="myGarageManager.viewDetails('${car.tokenId}')" 
                            class="bg-white/10 text-white/80 hover:text-white hover:bg-white/20 py-2 px-4 rounded-lg transition-colors text-sm">
                            Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showListModal(tokenId) {
        this.selectedCar = this.myCars.find(car => car.tokenId === tokenId);
        if (!this.selectedCar) return;

        // Create and show listing modal
        const modal = document.createElement('div');
        modal.id = 'listModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal text-white float-right text-2xl cursor-pointer">&times;</span>
                <h2 class="text-white text-xl mb-4">List Car for Sale</h2>
                <div class="mb-4">
                    <img src="${this.selectedCar.image}" alt="${this.selectedCar.name}" 
                         class="w-full h-32 object-cover rounded-lg mb-2">
                    <h3 class="text-white font-bold">${this.selectedCar.name}</h3>
                    <p class="text-white/60 text-sm">Token ID: #${this.selectedCar.tokenId}</p>
                </div>
                <form id="listForm" class="space-y-4">
                    <div>
                        <label class="block text-white/80 text-sm mb-2">Price (ETH)</label>
                        <input type="number" id="listPrice" step="0.001" min="0.001" placeholder="0.1" required
                            class="form-input w-full">
                        <small class="text-white/60 text-xs">Minimum: 0.001 ETH</small>
                    </div>
                    <button type="submit" id="listButton" 
                        class="w-full bg-primary text-white p-3 rounded hover:bg-primary/90 transition-colors font-semibold">
                        <span class="list-text">List for Sale</span>
                        <div class="list-loading hidden flex items-center justify-center gap-2">
                            <div class="spinner"></div>
                            <span>Listing...</span>
                        </div>
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Setup form handler
        document.getElementById('listForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleListSubmit();
        });

        // Setup close handlers
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async handleListSubmit() {
        const priceInput = document.getElementById('listPrice');
        const price = parseFloat(priceInput.value);

        if (!price || price < 0.001) {
            deAutoApp.showNotification('Please enter a valid price (minimum 0.001 ETH)', 'error');
            return;
        }

        const listButton = document.getElementById('listButton');
        const listText = listButton.querySelector('.list-text');
        const listLoading = listButton.querySelector('.list-loading');

        try {
            // Show loading state
            listButton.disabled = true;
            listText.classList.add('hidden');
            listLoading.classList.remove('hidden');

            await ContractManager.listCar(this.selectedCar.tokenId, price.toString());

            document.getElementById('listModal').remove();
            await this.loadMyCars(); // Refresh garage

        } catch (error) {
            console.error('Listing failed:', error);
        } finally {
            // Reset button state
            listButton.disabled = false;
            listText.classList.remove('hidden');
            listLoading.classList.add('hidden');
        }
    }

    async removeListing(tokenId) {
        const confirmed = confirm('Are you sure you want to remove this listing?');
        if (!confirmed) return;

        try {
            await ContractManager.removeListing(tokenId);
            await this.loadMyCars(); // Refresh garage
        } catch (error) {
            console.error('Remove listing failed:', error);
        }
    }

    viewDetails(tokenId) {
        // Navigate to car details page
        window.location.href = `car-details.html?tokenId=${tokenId}`;
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshGarageBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadMyCars());
        }

        // Mint button
        const mintBtn = document.getElementById('mintCarBtn');
        if (mintBtn) {
            mintBtn.addEventListener('click', () => deAutoApp.showModal('mintModal'));
        }
    }
}

// Initialize garage manager
const myGarageManager = new MyGarageManager();

// Make it globally available
window.myGarageManager = myGarageManager;