# DAX - Decentralized Automotive Exchange

A decentralized car NFT marketplace built on Ethereum, allowing users to mint, buy, sell, and trade car NFTs with real blockchain transactions and verified ownership transfer.

## Features

- 🚗 **Mint Car NFTs**: Create unique digital car assets with VIN, make, model, and year
- 🛒 **Marketplace**: Browse and purchase car NFTs from other users
- 🏠 **My Garage**: View and manage your owned car NFTs
- 💰 **Trading**: List your cars for sale and remove listings
- 👥 **Community**: Connect with other car enthusiasts and collectors
- 🔗 **Blockchain Integration**: Built on Ethereum with MetaMask support

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Blockchain**: Ethereum, Ethers.js
- **Wallet**: MetaMask integration
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Modern web browser
- MetaMask wallet extension
- Ethereum testnet ETH (for testing)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd dax-website
```

2. Install dependencies (if using a local server):

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8000`

### Deployment

#### Vercel Deployment

1. Install Vercel CLI:

```bash
npm install -g vercel
```

2. Deploy to Vercel:

```bash
vercel
```

3. Follow the prompts to configure your deployment

#### Manual Deployment

1. Upload all files to your web server
2. Ensure your server supports static file serving
3. Configure your server to serve the correct MIME types for CSS and JS files

## Smart Contract Configuration

Before using the application, you need to update the contract addresses in `src/js/app.js`:

```javascript
// Update these with your deployed contract addresses
const carNftAddress = "YOUR_CAR_NFT_CONTRACT_ADDRESS";
const marketplaceAddress = "YOUR_MARKETPLACE_CONTRACT_ADDRESS";
```

## File Structure

```
dax-website/
├── index.html              # Homepage
├── marketplace.html         # Marketplace page
├── my-garage-new.html      # User's garage page
├── car-details.html        # Individual car details
├── community.html          # Community page
├── package.json            # Project configuration
├── vercel.json            # Vercel deployment config
├── src/
│   ├── css/
│   │   └── style.css      # Custom styles
│   ├── js/
│   │   ├── app.js         # Main application logic
│   │   ├── components.js  # Shared components
│   │   ├── marketplace.js # Marketplace functionality
│   │   └── my-garage.js   # Garage functionality
│   └── abi/
│       ├── CarNFT.json    # Car NFT contract ABI
│       └── CarMarketplace.json # Marketplace contract ABI
└── README.md              # This file
```

## Usage

### Connecting Wallet

1. Click "Connect Wallet" in the navigation
2. Approve the MetaMask connection
3. Ensure you're on a supported network (Ethereum, Polygon, or Sepolia)

### Minting a Car NFT

1. Click "Mint Car" button
2. Fill in the car details:
   - VIN (17 characters)
   - Make and Model
   - Year
   - Metadata URI (IPFS link to car metadata)
   - Image URL (optional)
3. Confirm the transaction in MetaMask

### Buying a Car

1. Browse the marketplace
2. Click on a car you want to purchase
3. Click "Buy Now"
4. Confirm the transaction in MetaMask

### Listing a Car for Sale

1. Go to "My Garage"
2. Find the car you want to sell
3. Click "List for Sale"
4. Set your price in ETH
5. Confirm the transaction in MetaMask

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please join our Discord community or create an issue on GitHub.

## Roadmap

- [ ] Mobile app development
- [ ] Layer 2 integration (Polygon, Arbitrum)
- [ ] Advanced filtering and search
- [ ] Car history tracking
- [ ] Integration with real-world car data
- [ ] Auction functionality
- [ ] Social features and profiles
