// Marketplace specific functionality
class MarketplaceManager {
    constructor() {
        this.currentFilter = 'all';
        this.sortBy = 'price-low';
        this.listings = [];
    }

    async init() {
        await this.loadListings();
        this.setupEventListeners();
        this.setupFilters();
    }

    async loadListings() {
        try {
            const loadingGrid = document.getElementById('marketplaceGrid');
            if (loadingGrid) {
                loadingGrid.innerHTML = `
                    <div class="col-span-full flex items-center justify-center py-12">
                        <div class="text-center">
                            <div class="spinner mx-auto mb-4"></div>
                            <p class="text-white/60">Loading marketplace...</p>
                        </div>
                    </div>
                `;
            }

            this.listings = await ContractManager.getListings();
            this.renderListings();
        } catch (error) {
            console.error('Error loading marketplace:', error);
            const grid = document.getElementById('marketplaceGrid');
            if (grid) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <p class="text-red-400 mb-4">Error loading marketplace</p>
                        <button onclick="marketplaceManager.loadListings()" 
                            class="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    renderListings() {
        const grid = document.getElementById('marketplaceGrid');
        if (!grid) return;

        if (this.listings.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">🚗</div>
                    <h3 class="text-white text-xl mb-2">No cars listed yet</h3>
                    <p class="text-white/60 mb-6">Be the first to mint and list a car!</p>
                    <button onclick="deAutoApp.showModal('mintModal')" 
                        class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                        Mint Your First Car
                    </button>
                </div>
            `;
            return;
        }

        const filteredListings = this.filterListings();
        const sortedListings = this.sortListings(filteredListings);

        grid.innerHTML = sortedListings.map(listing => this.createListingCard(listing)).join('');
    }

    createListingCard(listing) {
        const isOwner = deAutoApp.currentUser &&
            listing.seller.toLowerCase() === deAutoApp.currentUser.toLowerCase();

        return `
            <div class="flex flex-col gap-4 p-4 rounded-xl bg-background-dark/50 border border-white/10 card-glow hover:border-primary/50 transition-all duration-300">
                <div class="relative">
                    <div class="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg overflow-hidden" 
                         style="background-image: url('${listing.image}')">
                        <img src="${listing.image}" alt="${listing.name}" 
                             class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                             onerror="this.src='https://via.placeholder.com/400x300?text=Car+NFT'">
                    </div>
                    ${isOwner ? '<div class="absolute top-2 right-2 bg-primary/80 text-white text-xs px-2 py-1 rounded">Your Car</div>' : ''}
                </div>
                
                <div class="flex flex-col gap-3 flex-1">
                    <div>
                        <h3 class="text-white text-lg font-bold leading-normal">${listing.name}</h3>
                        <p class="text-white/60 text-sm line-clamp-2">${listing.description || 'No description available'}</p>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-primary text-xl font-bold">${listing.price} ETH</p>
                            <p class="text-white/40 text-xs">~$${(parseFloat(listing.price) * 2000).toLocaleString()}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-white/60 text-xs">Token ID</p>
                            <p class="text-white/80 text-sm font-mono">#${listing.tokenId}</p>
                        </div>
                    </div>

                    <div class="text-white/60 text-xs">
                        <p>Seller: ${listing.seller.substring(0, 6)}...${listing.seller.slice(-4)}</p>
                    </div>

                    <div class="flex gap-2 mt-auto">
                        ${isOwner ?
                `<button onclick="marketplaceManager.removeListing('${listing.carId}')" 
                                class="flex-1 bg-red-600/20 text-red-400 border border-red-600/30 py-2 px-4 rounded-lg hover:bg-red-600/30 transition-colors text-sm font-medium">
                                Remove Listing
                            </button>` :
                `<button onclick="marketplaceManager.buyNow('${listing.carId}', '${listing.priceWei}')" 
                                class="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-sm font-bold">
                                Buy Now
                            </button>`
            }
                        <button onclick="marketplaceManager.viewDetails('${listing.carId}')" 
                            class="bg-white/10 text-white/80 hover:text-white hover:bg-white/20 py-2 px-4 rounded-lg transition-colors text-sm">
                            Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    filterListings() {
        // Implement filtering logic based on this.currentFilter
        return this.listings;
    }

    sortListings(listings) {
        switch (this.sortBy) {
            case 'price-low':
                return [...listings].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            case 'price-high':
                return [...listings].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            case 'newest':
                return [...listings].sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
            case 'oldest':
                return [...listings].sort((a, b) => parseInt(a.tokenId) - parseInt(b.tokenId));
            default:
                return listings;
        }
    }

    async buyNow(carId, priceWei) {
        if (!deAutoApp.currentUser) {
            deAutoApp.showNotification('Please connect your wallet first', 'error');
            return;
        }

        // priceWei is passed as string from template, convert back to BigNumber
        const priceBN = ethers.BigNumber.from(priceWei);
        const priceEth = ethers.utils.formatEther(priceBN);
        
        const confirmed = confirm(`Are you sure you want to buy this car for ${priceEth} ETH?`);
        if (!confirmed) return;

        try {
            await ContractManager.buyCar(carId, priceBN);
            await this.loadListings(); // Refresh listings
        } catch (error) {
            console.error('Purchase failed:', error);
        }
    }

    async removeListing(carId) {
        const confirmed = confirm('Are you sure you want to remove this listing?');
        if (!confirmed) return;

        try {
            await ContractManager.removeListing(carId);
            await this.loadListings(); // Refresh listings
        } catch (error) {
            console.error('Remove listing failed:', error);
        }
    }

    viewDetails(carId) {
        // Navigate to car details page
        window.location.href = `car-details.html?carId=${carId}`;
    }

    setupEventListeners() {
        // Sort dropdown
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.renderListings();
            });
        }

        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-filter]')) {
                this.currentFilter = e.target.dataset.filter;
                this.updateFilterUI();
                this.renderListings();
            }
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadListings());
        }
    }

    setupFilters() {
        // Add filter controls to the page
        const filtersContainer = document.getElementById('filtersContainer');
        if (filtersContainer) {
            filtersContainer.innerHTML = `
                <div class="flex flex-wrap gap-2 mb-4">
                    <button data-filter="all" class="filter-btn active">All Cars</button>
                    <button data-filter="sports" class="filter-btn">Sports Cars</button>
                    <button data-filter="luxury" class="filter-btn">Luxury</button>
                    <button data-filter="electric" class="filter-btn">Electric</button>
                </div>
                <div class="flex items-center gap-4">
                    <select id="sortSelect" class="bg-background-dark border border-white/10 text-white rounded px-3 py-2">
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                    <button id="refreshBtn" class="bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded hover:bg-primary/30 transition-colors">
                        Refresh
                    </button>
                </div>
            `;
        }
    }

    updateFilterUI() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }
}

// Initialize marketplace manager
const marketplaceManager = new MarketplaceManager();

// Make it globally available
window.marketplaceManager = marketplaceManager;