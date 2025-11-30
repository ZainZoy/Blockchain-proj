// Shared components and utilities

// Check if ethers is available
function waitForEthers(callback, maxAttempts = 50) {
    let attempts = 0;
    const check = () => {
        if (typeof ethers !== 'undefined') {
            callback();
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(check, 100);
        } else {
            console.error('Ethers.js failed to load after multiple attempts');
            alert('Failed to load blockchain library. Please refresh the page or check your internet connection.');
        }
    };
    check();
}

class DeAutoApp {
    constructor() {
        this.currentPage = 'home';
        this.contracts = null;
        this.currentUser = null;
    }

    // Navigation
    navigateTo(page) {
        this.currentPage = page;
        this.updateActiveNav();
        this.loadPageContent();
    }

    updateActiveNav() {
        // Update navigation active states
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('text-primary', 'font-bold');
            link.classList.add('text-white/80', 'font-medium');
        });

        const activeLink = document.querySelector(`nav a[href="#${this.currentPage}"]`);
        if (activeLink) {
            activeLink.classList.remove('text-white/80', 'font-medium');
            activeLink.classList.add('text-primary', 'font-bold');
        }
    }

    // Wallet connection
    async connectWallet() {
        if (!window.ethereum) {
            alert("Please install MetaMask first!");
            return;
        }

        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });

            if (accounts.length > 0) {
                this.currentUser = accounts[0];
                this.updateWalletUI();
                await this.loadContracts();

                // Load page-specific data
                if (this.currentPage === 'marketplace') {
                    await this.loadMarketplace();
                } else if (this.currentPage === 'my-garage') {
                    await this.loadMyGarage();
                }
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Error connecting wallet. Please try again.');
        }
    }

    updateWalletUI(networkInfo = null, balance = '0') {
        const walletButtons = document.querySelectorAll('#connectWalletBtn, .connect-wallet-btn');
        const walletInfo = document.querySelectorAll('#walletInfo, .wallet-info');
        const switchWalletButtons = document.querySelectorAll('#switchWalletBtn');

        const address = this.currentUser.substring(0, 6) + '...' + this.currentUser.substring(this.currentUser.length - 4);
        const balanceFormatted = parseFloat(balance).toFixed(4);

        walletButtons.forEach(btn => {
            btn.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span class="truncate font-mono">${address}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            `;
            btn.classList.add('connected');
            btn.style.background = 'linear-gradient(135deg, #0da6f2 0%, #00d4aa 100%)';
            btn.style.minWidth = '160px';

            // Add click handler for wallet menu
            btn.onclick = (e) => {
                e.stopPropagation();
                this.showWalletMenu();
            };
        });

        // Show the static Switch Wallet button when connected
        switchWalletButtons.forEach(btn => {
            console.log('Showing switch wallet button:', btn);
            btn.classList.remove('hidden');
            btn.style.display = 'flex';
        });

        walletInfo.forEach(info => {
            if (info) {
                info.innerHTML = `
                    <div class="flex items-center justify-between gap-4">
                        <div>
                            <p class="text-white text-sm">Connected: <span class="text-primary font-mono">${address}</span></p>
                            <p class="text-white/60 text-xs">Network: ${networkInfo?.name || 'Unknown'} | Balance: ${balanceFormatted} ${networkInfo?.currency || 'ETH'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="deAutoApp.switchWallet()" class="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                                <span class="material-symbols-outlined text-base">swap_horiz</span>
                                Switch Wallet
                            </button>
                            <button onclick="deAutoApp.disconnectWallet()" class="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-red-500/30">
                                Disconnect
                            </button>
                        </div>
                    </div>
                `;
                info.classList.remove('hidden');
            }
        });

        // Update contract addresses in footer
        document.querySelectorAll('#contractAddress').forEach(el => {
            el.textContent = `${carNftAddress.substring(0, 6)}...${carNftAddress.slice(-4)}`;
            el.title = carNftAddress;
        });
    }

    showWalletMenu() {
        // Remove existing menu first
        document.querySelector('.wallet-menu')?.remove();

        const menu = document.createElement('div');
        menu.className = 'wallet-menu fixed top-20 right-4 sm:right-8 md:right-16 lg:right-24 xl:right-40 bg-background-dark border border-white/20 rounded-xl p-4 z-[100] min-w-72 shadow-2xl shadow-black/50';
        menu.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <div class="text-white text-sm font-bold">Wallet Connected</div>
                    <div class="flex items-center gap-1">
                        <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span class="text-green-400 text-xs">Active</span>
                    </div>
                </div>
                
                <div class="bg-white/5 rounded-lg p-3">
                    <div class="text-white/60 text-xs mb-1">Address</div>
                    <div class="text-white text-sm font-mono break-all">${this.currentUser}</div>
                </div>
                
                <hr class="border-white/10">
                
                <div class="space-y-1">
                    <button onclick="deAutoApp.switchWallet()" class="w-full flex items-center gap-3 text-white hover:bg-white/10 rounded-lg px-3 py-2.5 transition-colors">
                        <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                        </svg>
                        <span class="font-medium">Switch Wallet</span>
                    </button>
                    
                    <button onclick="deAutoApp.copyAddress()" class="w-full flex items-center gap-3 text-white hover:bg-white/10 rounded-lg px-3 py-2.5 transition-colors">
                        <svg class="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                        <span>Copy Address</span>
                    </button>
                    
                    <button onclick="deAutoApp.viewOnExplorer()" class="w-full flex items-center gap-3 text-white hover:bg-white/10 rounded-lg px-3 py-2.5 transition-colors">
                        <svg class="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                        <span>View on Explorer</span>
                    </button>
                </div>
                
                <hr class="border-white/10">
                
                <button onclick="deAutoApp.disconnectWallet()" class="w-full flex items-center gap-3 text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-2.5 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    <span class="font-medium">Disconnect Wallet</span>
                </button>
            </div>
        `;

        document.body.appendChild(menu);

        // Close menu when clicking outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target) && !e.target.closest('#connectWalletBtn')) {
                    menu.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }

    async switchWallet() {
        document.querySelector('.wallet-menu')?.remove();
        try {
            // Request MetaMask to show account picker
            await window.ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }]
            });
            
            // Get the newly selected account
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                this.currentUser = accounts[0];
                // Reload contracts with new signer
                await this.loadContracts();
                // Update the wallet UI
                this.updateWalletUI();
                // Reload page content to reflect new wallet state
                await this.loadPageContent();
                this.showNotification('Wallet switched successfully!', 'success');
            }
        } catch (error) {
            console.error('Error switching wallet:', error);
            if (error.code !== 4001) { // User didn't reject
                this.showNotification('Failed to switch wallet', 'error');
            }
        }
    }

    async copyAddress() {
        try {
            await navigator.clipboard.writeText(this.currentUser);
            this.showNotification('Address copied to clipboard!', 'success');
        } catch (error) {
            console.error('Failed to copy address:', error);
        }
        document.querySelector('.wallet-menu')?.remove();
    }

    viewOnExplorer() {
        const network = window.ethereum.networkVersion;
        let explorerUrl = 'https://etherscan.io';

        if (network === '137') explorerUrl = 'https://polygonscan.com';
        else if (network === '80001') explorerUrl = 'https://mumbai.polygonscan.com';
        else if (network === '11155111') explorerUrl = 'https://sepolia.etherscan.io';

        window.open(`${explorerUrl}/address/${this.currentUser}`, '_blank');
        document.querySelector('.wallet-menu')?.remove();
    }

    disconnectWallet() {
        this.currentUser = null;
        this.contracts = null;
        this.resetWalletUI();
        this.showNotification('Wallet disconnected', 'info');
        document.querySelector('.wallet-menu')?.remove();

        // Reload page content to show disconnected state
        this.loadPageContent();
    }

    // Contract management
    async loadContracts() {
        if (!this.currentUser) return;

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            // Handle both wrapped {abi: [...]} and raw [...] ABI formats
            const nftAbi = CarNFT.abi || CarNFT;
            const marketAbi = CarMarketplace.abi || CarMarketplace;

            const nft = new ethers.Contract(carNftAddress, nftAbi, signer);
            const market = new ethers.Contract(marketplaceAddress, marketAbi, signer);

            this.contracts = { nft, market, signer };
            return this.contracts;
        } catch (error) {
            console.error('Error loading contracts:', error);
            return null;
        }
    }

    // Modal management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Initialize app
    async init() {
        this.setupEventListeners();
        await this.checkWalletConnection();
        await this.loadPageContent();
    }

    setupEventListeners() {
        // Wallet connection
        document.addEventListener('click', (e) => {
            if (e.target.closest('#connectWalletBtn') || e.target.closest('.connect-wallet-btn')) {
                this.connectWallet();
            }
        });

        // Modal close buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-modal')) {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            }
        });

        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Navigation
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('nav a');
            if (navLink && navLink.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const page = navLink.getAttribute('href').substring(1);
                this.navigateTo(page);
            }
        });

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.currentUser = null;
                    this.resetWalletUI();
                } else {
                    this.currentUser = accounts[0];
                    this.updateWalletUI();
                }
            });
        }
    }

    resetWalletUI() {
        const walletButtons = document.querySelectorAll('#connectWalletBtn, .connect-wallet-btn');
        const walletInfo = document.querySelectorAll('#walletInfo, .wallet-info');
        const switchWalletButtons = document.querySelectorAll('#switchWalletBtn');

        walletButtons.forEach(btn => {
            btn.innerHTML = '<span class="truncate">Connect Wallet</span>';
            btn.classList.remove('connected');
            btn.style.background = '';
            btn.style.minWidth = '';
        });

        // Hide the static Switch Wallet button when disconnected
        switchWalletButtons.forEach(btn => {
            btn.style.display = 'none';
            btn.classList.add('hidden');
        });

        walletInfo.forEach(info => {
            if (info) {
                info.classList.add('hidden');
            }
        });
    }

    async checkWalletConnection() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.currentUser = accounts[0];
                    this.updateWalletUI();
                    await this.loadContracts();
                } else {
                    // Even without a connected wallet, try to load contracts for read-only access
                    await this.loadContractsReadOnly();
                }
            } catch (error) {
                console.error('Error checking wallet:', error);
                // Try read-only access
                await this.loadContractsReadOnly();
            }
        } else {
            console.log('MetaMask not installed');
        }
    }

    // Load contracts in read-only mode (no signer needed)
    async loadContractsReadOnly() {
        try {
            // Use a public RPC for Sepolia
            const provider = window.ethereum 
                ? new ethers.providers.Web3Provider(window.ethereum)
                : new ethers.providers.JsonRpcProvider('https://rpc.sepolia.org');

            // Handle both wrapped {abi: [...]} and raw [...] ABI formats
            const nftAbi = CarNFT.abi || CarNFT;
            const marketAbi = CarMarketplace.abi || CarMarketplace;

            const nft = new ethers.Contract(carNftAddress, nftAbi, provider);
            const market = new ethers.Contract(marketplaceAddress, marketAbi, provider);

            this.contracts = { nft, market, provider, signer: null };
            console.log('Contracts loaded in read-only mode');
            return this.contracts;
        } catch (error) {
            console.error('Error loading contracts in read-only mode:', error);
            return null;
        }
    }

    async loadPageContent() {
        try {
            console.log(`Loading content for: ${this.currentPage}`);

            switch (this.currentPage) {
                case 'home':
                    if (typeof this.loadMarketplacePreview === 'function') {
                        await this.loadMarketplacePreview();
                    }
                    break;

                case 'marketplace':
                    if (typeof marketplaceManager !== 'undefined') {
                        await marketplaceManager.init();
                    }
                    break;

                case 'my-garage':
                    if (typeof myGarageManager !== 'undefined') {
                        await myGarageManager.init();
                    }
                    break;

                case 'car-details':
                    if (typeof carDetailsManager !== 'undefined') {
                        await carDetailsManager.init();
                    }
                    break;

                case 'community':
                    // Community page doesn't need special loading
                    console.log('Community page loaded');
                    break;

                default:
                    console.log('No specific content loading for this page');
            }
        } catch (error) {
            console.error('Error loading page content:', error);
        }
    }

    // Notification system
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg border z-50 transition-all duration-300 transform translate-x-full`;

        const colors = {
            success: 'bg-green-600 border-green-500 text-white',
            error: 'bg-red-600 border-red-500 text-white',
            info: 'bg-blue-600 border-blue-500 text-white',
            warning: 'bg-yellow-600 border-yellow-500 text-white'
        };

        notification.className += ` ${colors[type] || colors.info}`;
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white/80 hover:text-white">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Network checking
    async checkNetwork() {
        if (!window.ethereum) return false;

        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const supportedChains = ['0x1', '0x89', '0xaa36a7']; // Mainnet, Polygon, Sepolia

            if (!supportedChains.includes(chainId)) {
                this.showNotification('Please switch to a supported network (Ethereum, Polygon, or Sepolia)', 'warning');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error checking network:', error);
            return false;
        }
    }

    // Enhanced wallet connection with comprehensive network and error handling
    async connectWallet() {
        if (!window.ethereum) {
            this.showNotification("Please install MetaMask first! Visit metamask.io to download.", 'error');
            return;
        }

        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });

            if (accounts.length === 0) {
                throw new Error('No accounts found. Please unlock MetaMask.');
            }

            this.currentUser = accounts[0];

            // Get network info
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const network = await provider.getNetwork();
            const networkInfo = SUPPORTED_NETWORKS[network.chainId];

            if (!networkInfo) {
                this.showNotification(`Unsupported network. Please switch to Ethereum, Polygon, or Sepolia testnet.`, 'warning');
                // Still allow connection but warn user
            }

            // Get balance
            const balance = await provider.getBalance(this.currentUser);
            const balanceEth = ethers.utils.formatEther(balance);

            this.updateWalletUI(networkInfo, balanceEth);
            await this.loadContracts();

            this.showNotification(`Wallet connected! Network: ${networkInfo?.name || 'Unknown'} | Balance: ${parseFloat(balanceEth).toFixed(4)} ${networkInfo?.currency || 'ETH'}`, 'success');

            // Load page-specific data
            await this.loadPageContent();

        } catch (error) {
            console.error('Error connecting wallet:', error);

            let errorMessage = 'Error connecting wallet: ';
            if (error.code === 4001) {
                errorMessage += 'Connection rejected by user';
            } else if (error.code === -32002) {
                errorMessage += 'Connection request already pending';
            } else {
                errorMessage += error.message;
            }

            this.showNotification(errorMessage, 'error');
        }
    }
}

// Initialize the app after ethers is available
let deAutoApp;

waitForEthers(() => {
    deAutoApp = new DeAutoApp();
    window.deAutoApp = deAutoApp;
    
    // Auto-init on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => deAutoApp.init());
    } else {
        deAutoApp.init();
    }
});

// Export for use in other files (will be set when ethers loads)
window.deAutoApp = null;