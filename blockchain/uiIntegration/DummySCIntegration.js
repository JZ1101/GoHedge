/**
 * GOHEDGE DUMMY INSURANCE CONTRACT - UI INTEGRATION REFERENCE
 * 
 * Complete frontend integration guide for UI designers and developers
 * Contract Address: 0xc62C15AD56f54757bb074e0779aE85e54FD67861
 * Network: Avalanche Fuji Testnet
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import DUMMY_ABI from './DummyABI.js';

// ===========================
// CONTRACT CONFIGURATION
// ===========================

const CONTRACT_CONFIG = {
    address: "0xc62C15AD56f54757bb074e0779aE85e54FD67861",
    network: "Avalanche Fuji",
    chainId: 43113,
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    explorer: "https://testnet.snowtrace.io",
    contractType: "DummyInsurance",
    mode: "Test Mode (Manual Price Setting)"
};

// Network configuration for wagmi/ethers
const AVALANCHE_FUJI = {
    id: 43113,
    name: 'Avalanche Fuji',
    network: 'avalanche-fuji',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
    },
    blockExplorers: {
        default: { name: 'SnowTrace', url: 'https://testnet.snowtrace.io' },
    },
};

// Use imported ABI
const CONTRACT_ABI = DUMMY_ABI;

// ===========================
// DATA MODELS FOR UI
// ===========================

/**
 * Contract Display Model
 * Use this structure for displaying contracts in UI components
 */
const ContractDisplayModel = {
    id: "1",                              // Contract ID (string)
    status: "available",                  // available|purchased|triggered|expired|claimed
    
    // Parties
    seller: "0x...",                      // Seller address
    buyer: "0x..." || null,               // Buyer address (null if not purchased)
    
    // Financial Data (formatted for display)
    triggerPrice: "30.0",                 // AVAX amount (formatted)
    reserveAmount: "1.0",                 // Coverage amount (formatted)
    insuranceFee: "0.1",                  // Fee to purchase (formatted)
    
    // Time Data
    startDate: "2024-01-01T00:00:00Z",    // ISO string
    endDate: "2024-01-02T00:00:00Z",      // ISO string
    timeRemaining: "23h 45m",             // Human readable
    
    // State Flags
    isActive: true,                       // Has buyer purchased
    isTriggered: false,                   // Payout condition met
    isClaimed: false,                     // Payout claimed by buyer
    isExpired: false,                     // Past end date
    
    // User Context
    userRole: "seller",                   // seller|buyer|none
    availableActions: ["purchase"]        // Array of available actions
};

/**
 * User Portfolio Model
 * Use this for user dashboard/portfolio views
 */
const UserPortfolioModel = {
    userAddress: "0x...",
    totalContracts: 5,
    
    // Seller Statistics
    sellerStats: {
        contractsCreated: 3,
        totalReserveDeposited: "3.5",      // AVAX
        totalFeesEarned: "0.3",            // AVAX
        activeContracts: 2,
        expiredContracts: 1
    },
    
    // Buyer Statistics
    buyerStats: {
        contractsPurchased: 2,
        totalFeesSpent: "0.3",             // AVAX
        totalPayoutsReceived: "2.0",       // AVAX
        activeInsurance: 1,
        claimedPayouts: 1
    },
    
    contracts: [] // Array of ContractDisplayModel
};

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Format time remaining in human readable format
 */
const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return "Expired";
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

/**
 * Format raw contract data for UI display
 */
const formatContractForDisplay = (id, rawContract) => {
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > rawContract.endDate;
    const timeRemaining = isExpired ? "Expired" : formatTimeRemaining(rawContract.endDate - now);
    
    let status = "available";
    if (rawContract.claimed) status = "claimed";
    else if (rawContract.triggered) status = "triggered";
    else if (rawContract.active) status = "purchased";
    else if (isExpired) status = "expired";
    
    return {
        id,
        status,
        seller: rawContract.seller,
        buyer: rawContract.buyer === ethers.ZeroAddress ? null : rawContract.buyer,
        triggerPrice: ethers.formatEther(rawContract.triggerPrice),
        reserveAmount: ethers.formatEther(rawContract.reserveAmount),
        insuranceFee: ethers.formatEther(rawContract.insuranceFee),
        startDate: new Date(rawContract.startDate * 1000).toISOString(),
        endDate: new Date(rawContract.endDate * 1000).toISOString(),
        timeRemaining,
        isActive: rawContract.active,
        isTriggered: rawContract.triggered,
        isClaimed: rawContract.claimed,
        isExpired
    };
};

// ===========================
// REACT INTEGRATION HOOKS
// ===========================

/**
 * Hook for contract data
 */
const useGoHedgeContract = () => {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.rpcUrl);
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, provider);
    
    // Fetch all contracts
    const fetchContracts = async () => {
        try {
            setLoading(true);
            const contractIds = await contract.getAllContracts();
            const contractsData = [];
            
            for (const id of contractIds) {
                const contractData = await contract.getContract(id);
                const formattedContract = formatContractForDisplay(id.toString(), contractData);
                contractsData.push(formattedContract);
            }
            
            setContracts(contractsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchContracts();
    }, []);
    
    return { contracts, loading, error, refetch: fetchContracts };
};

/**
 * Hook for user-specific contracts
 */
const useUserContracts = (userAddress) => {
    const [userContracts, setUserContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.rpcUrl);
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, provider);
    
    const fetchUserContracts = async () => {
        if (!userAddress) return;
        
        try {
            setLoading(true);
            const contractIds = await contract.getContractsByUser(userAddress);
            const contractsData = [];
            
            for (const id of contractIds) {
                const contractData = await contract.getContract(id);
                const formattedContract = formatContractForDisplay(id.toString(), contractData);
                
                // Add user role
                if (contractData.seller.toLowerCase() === userAddress.toLowerCase()) {
                    formattedContract.userRole = 'seller';
                } else if (contractData.buyer.toLowerCase() === userAddress.toLowerCase()) {
                    formattedContract.userRole = 'buyer';
                }
                
                contractsData.push(formattedContract);
            }
            
            setUserContracts(contractsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchUserContracts();
    }, [userAddress]);
    
    return { userContracts, loading, error, refetch: fetchUserContracts };
};

// ===========================
// TRANSACTION FUNCTIONS
// ===========================

/**
 * Create new insurance contract
 */
const createContract = async (signer, params) => {
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, signer);
    
    const {
        triggerPrice,    // In AVAX (e.g., "30")
        reserveAmount,   // In AVAX (e.g., "1")
        insuranceFee,    // In AVAX (e.g., "0.1")
        duration         // In hours (e.g., 24)
    } = params;
    
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + (duration * 60 * 60);
    
    const tx = await contract.createContract(
        "AVAX",                                    // triggerToken
        ethers.parseEther(triggerPrice),           // triggerPrice in wei
        startTime,                                 // startDate
        endTime,                                   // endDate
        "AVAX",                                    // reserveToken
        ethers.parseEther(reserveAmount),          // reserveAmount in wei
        ethers.parseEther(insuranceFee),           // insuranceFee in wei
        { value: ethers.parseEther(reserveAmount) } // Send reserve amount
    );
    
    return tx.wait();
};

/**
 * Purchase insurance contract
 */
const purchaseInsurance = async (signer, contractId, insuranceFee) => {
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, signer);
    
    const tx = await contract.purchaseInsurance(
        contractId,
        { value: ethers.parseEther(insuranceFee) }
    );
    
    return tx.wait();
};

/**
 * Claim payout from triggered contract
 */
const claimPayout = async (signer, contractId) => {
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, signer);
    const tx = await contract.claimPayout(contractId);
    return tx.wait();
};

/**
 * Withdraw reserve from expired untriggered contract
 */
const withdrawReserve = async (signer, contractId) => {
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, signer);
    const tx = await contract.withdrawReserve(contractId);
    return tx.wait();
};

/**
 * Trigger payout (test mode only)
 */
const triggerPayout = async (signer, contractId) => {
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, signer);
    const tx = await contract.triggerPayout(contractId);
    return tx.wait();
};

/**
 * Set test price (owner only, test mode)
 */
const setTestPrice = async (signer, price) => {
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, signer);
    const tx = await contract.setTestPrice(ethers.parseEther(price));
    return tx.wait();
};

// ===========================
// UI COMPONENTS EXAMPLES
// ===========================

/**
 * Contract Card Component
 */
const ContractCard = ({ contract, userAddress, onAction }) => {
    const getUserRole = () => {
        if (!userAddress) return 'none';
        if (contract.seller.toLowerCase() === userAddress.toLowerCase()) return 'seller';
        if (contract.buyer?.toLowerCase() === userAddress.toLowerCase()) return 'buyer';
        return 'none';
    };
    
    const getAvailableActions = () => {
        const role = getUserRole();
        const actions = [];
        
        // Purchase logic
        if (role === 'none' && contract.status === 'available') {
            actions.push('purchase');
        }
        
        // Claim logic
        if (role === 'buyer' && contract.status === 'triggered') {
            actions.push('claim');
        }
        
        // Withdraw logic
        if (role === 'seller' && contract.status === 'expired' && !contract.isTriggered) {
            actions.push('withdraw');
        }
        
        return actions;
    };
    
    const getStatusColor = () => {
        switch (contract.status) {
            case 'available': return 'green';
            case 'purchased': return 'blue';
            case 'triggered': return 'orange';
            case 'claimed': return 'purple';
            case 'expired': return 'gray';
            default: return 'black';
        }
    };

    return (
        <div className="contract-card">
            <div className="contract-header">
                <h3>Contract #{contract.id}</h3>
                <span className="status-badge" style={{ color: getStatusColor() }}>
                    {contract.status.toUpperCase()}
                </span>
            </div>
            
            <div className="contract-details">
                <div className="price-info">
                    <label>Trigger Price:</label>
                    <span>{contract.triggerPrice} AVAX</span>
                </div>
                
                <div className="financial-info">
                    <label>Coverage:</label>
                    <span>{contract.reserveAmount} AVAX</span>
                    
                    <label>Fee:</label>
                    <span>{contract.insuranceFee} AVAX</span>
                </div>
                
                <div className="time-info">
                    <label>Time Remaining:</label>
                    <span>{contract.timeRemaining}</span>
                </div>
                
                {contract.buyer && (
                    <div className="buyer-info">
                        <label>Buyer:</label>
                        <span>{contract.buyer.slice(0, 6)}...{contract.buyer.slice(-4)}</span>
                    </div>
                )}
            </div>
            
            <div className="contract-actions">
                {getAvailableActions().map(action => (
                    <button 
                        key={action}
                        onClick={() => onAction(action, contract)}
                        className={`action-btn ${action}`}
                    >
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
};

/**
 * Contract Creation Form
 */
const CreateContractForm = ({ onSubmit, isSubmitting }) => {
    const [formData, setFormData] = useState({
        triggerPrice: '',
        reserveAmount: '',
        insuranceFee: '',
        duration: 24
    });
    
    const [errors, setErrors] = useState({});
    
    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.triggerPrice || parseFloat(formData.triggerPrice) < 0.01) {
            newErrors.triggerPrice = 'Trigger price must be at least 0.01 AVAX';
        }
        
        if (!formData.reserveAmount || parseFloat(formData.reserveAmount) < 0.1) {
            newErrors.reserveAmount = 'Reserve amount must be at least 0.1 AVAX';
        }
        
        if (!formData.insuranceFee || parseFloat(formData.insuranceFee) < 0.01) {
            newErrors.insuranceFee = 'Insurance fee must be at least 0.01 AVAX';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="create-contract-form">
            <div className="form-group">
                <label>Trigger Price (AVAX)</label>
                <input
                    type="number"
                    step="0.01"
                    value={formData.triggerPrice}
                    onChange={(e) => setFormData({...formData, triggerPrice: e.target.value})}
                    placeholder="30.0"
                    required
                />
                {errors.triggerPrice && <span className="error">{errors.triggerPrice}</span>}
            </div>
            
            <div className="form-group">
                <label>Reserve Amount (AVAX)</label>
                <input
                    type="number"
                    step="0.01"
                    value={formData.reserveAmount}
                    onChange={(e) => setFormData({...formData, reserveAmount: e.target.value})}
                    placeholder="1.0"
                    required
                />
                {errors.reserveAmount && <span className="error">{errors.reserveAmount}</span>}
            </div>
            
            <div className="form-group">
                <label>Insurance Fee (AVAX)</label>
                <input
                    type="number"
                    step="0.01"
                    value={formData.insuranceFee}
                    onChange={(e) => setFormData({...formData, insuranceFee: e.target.value})}
                    placeholder="0.1"
                    required
                />
                {errors.insuranceFee && <span className="error">{errors.insuranceFee}</span>}
            </div>
            
            <div className="form-group">
                <label>Duration (hours)</label>
                <select
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={72}>3 days</option>
                    <option value={168}>1 week</option>
                </select>
            </div>
            
            <button 
                type="submit" 
                disabled={isSubmitting}
                className="submit-btn"
            >
                {isSubmitting ? 'Creating Contract...' : 'Create Insurance Contract'}
            </button>
        </form>
    );
};

// ===========================
// ERROR HANDLING
// ===========================

const ERROR_MESSAGES = {
    // Contract creation errors
    "execution reverted: Must send enough AVAX for reserve": "Insufficient AVAX sent for reserve amount",
    "execution reverted: End date must be after start date": "Invalid contract duration",
    
    // Purchase errors
    "execution reverted: Contract does not exist": "Insurance contract not found",
    "execution reverted: Contract already purchased": "This insurance has already been purchased",
    "execution reverted: Must pay full insurance fee": "Incorrect insurance fee amount",
    "execution reverted: Contract has expired": "This insurance contract has expired",
    "execution reverted: Contract not started yet": "Insurance contract not yet active",
    
    // Claim errors
    "execution reverted: Only buyer can claim payout": "Only the insurance buyer can claim payout",
    "execution reverted: Payout not triggered yet": "Payout conditions have not been met",
    "execution reverted: Payout already claimed": "Payout has already been claimed",
    
    // Withdraw errors
    "execution reverted: Only seller can withdraw reserve": "Only the contract creator can withdraw reserve",
    "execution reverted: Contract not expired yet": "Cannot withdraw from active contract",
    "execution reverted: Cannot withdraw reserve - contract was triggered": "Cannot withdraw reserve after payout was triggered",
    
    // General errors
    "insufficient funds": "Insufficient AVAX balance",
    "user rejected transaction": "Transaction was rejected by user",
    "network error": "Network connection error"
};

const getErrorMessage = (error) => {
    const errorStr = error.message || error.toString();
    
    for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
        if (errorStr.includes(key)) {
            return message;
        }
    }
    
    return "An unexpected error occurred. Please try again.";
};

// ===========================
// EXPORT FOR FRONTEND USE
// ===========================

export {
    CONTRACT_CONFIG,
    AVALANCHE_FUJI,
    CONTRACT_ABI,
    ContractDisplayModel,
    UserPortfolioModel,
    useGoHedgeContract,
    useUserContracts,
    formatContractForDisplay,
    formatTimeRemaining,
    createContract,
    purchaseInsurance,
    claimPayout,
    withdrawReserve,
    triggerPayout,
    setTestPrice,
    ContractCard,
    CreateContractForm,
    ERROR_MESSAGES,
    getErrorMessage
};

/*
USAGE EXAMPLE:

import { 
    useGoHedgeContract, 
    createContract, 
    ContractCard,
    CONTRACT_CONFIG 
} from './uiIntegration/DummySCIntegration';

function App() {
    const { contracts, loading, error } = useGoHedgeContract();
    
    return (
        <div>
            <h1>GoHedge Insurance - {CONTRACT_CONFIG.network}</h1>
            {contracts.map(contract => (
                <ContractCard 
                    key={contract.id} 
                    contract={contract} 
                    userAddress={userAddress}
                    onAction={handleContractAction}
                />
            ))}
        </div>
    );
}
*/