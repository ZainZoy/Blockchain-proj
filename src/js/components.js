// Shared components and utilities
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

        const address = this.currentUser.substring(0, 6) + '...' + this.currentUser.substring(this.currentUser.length - 4);
        const balanceFormatted = parseFloat(balance).toFixed(4);

        walletButtons.forEach(btn => {
            btn.innerHTML = `<span class="truncate">${address}</span>`;
            btn.classList.add('connected');
            btn.style.background = 'linear-gradient(45deg, #0da6f2, #00d4aa)';

            // Add disconnect functionality
            btn.onclick = () => this.showWalletMenu();
        });

        walletInfo.forEach(info => {
            if (info) {
                info.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-white text-sm">Connected: <span class="text-primary font-mono">${address}</span></p>
                            <p class="text-white/60 text-xs">Network: ${networkInfo?.name || 'Unknown'} | Balance: ${balanceFormatted} ${networkInfo?.currency || 'ETH'}</p>
                        </div>
                        <button onclick="deAutoApp.disconnectWallet()" class="text-red-400 hover:text-red-300 text-xs">Disconnect</button>
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
        const menu = document.createElement('div');
        menu.className = 'fixed top-16 right-4 bg-background-dark border border-white/10 rounded-lg p-4 z-50 min-w-64';
        menu.innerHTML = `
            <div class="space-y-3">
                <div class="text-white text-sm font-semibold">Wallet Menu</div>
                <div class="text-white/80 text-xs font-mono">${this.currentUser}</div>
                <hr class="border-white/10">
                <button onclick="deAutoApp.copyAddress()" class="w-full text-left text-white/80 hover:text-primary text-sm py-1">Copy Address</button>
                <button onclick="deAutoApp.viewOnExplorer()" class="w-full text-left text-white/80 hover:text-primary text-sm py-1">View on Explorer</button>
                <button onclick="deAutoApp.disconnectWallet()" class="w-full text-left text-red-400 hover:text-red-300 text-sm py-1">Disconnect</button>
            </div>
        `;

        // Remove existing menu
        document.querySelector('.wallet-menu')?.remove();
        menu.classList.add('wallet-menu');
        document.body.appendChild(menu);

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
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
    init() {
        this.setupEventListeners();
        this.checkWalletConnection();
        this.loadPageContent();
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

        walletButtons.forEach(btn => {
            btn.innerHTML = '<span class="truncate">Connect Wallet</span>';
            btn.classList.remove('connected');
        });

        walletInfo.forEach(info => {
            if (info) {
                info.classList.add('hidden');
            }
        });
    }

    async checkWalletConnection() {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                this.currentUser = accounts[0];
                this.updateWalletUI();
                await this.loadContracts();
            }
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

// Initialize the app
const deAutoApp = new DeAutoApp();

// Export for use in other files
window.deAutoApp = deAutoApp;