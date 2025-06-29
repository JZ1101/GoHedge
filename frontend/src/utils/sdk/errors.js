
/**
 * ERROR HANDLING UTILITIES
 */

export const ERROR_MESSAGES = {
    "execution reverted: Must send enough AVAX for reserve": "Insufficient AVAX sent for reserve amount",
    "execution reverted: End date must be after start date": "Invalid contract duration",
    "execution reverted: Contract does not exist": "Insurance contract not found",
    "execution reverted: Contract already purchased": "This insurance has already been purchased",
    "execution reverted: Must pay full insurance fee": "Incorrect insurance fee amount",
    "execution reverted: Contract has expired": "This insurance contract has expired",
    "execution reverted: Contract not started yet": "Insurance contract not yet active",
    "execution reverted: Only buyer can claim payout": "Only the insurance buyer can claim payout",
    "execution reverted: Payout not triggered yet": "Payout conditions have not been met",
    "execution reverted: Payout already claimed": "Payout has already been claimed",
    "execution reverted: Only seller can withdraw reserve": "Only the contract creator can withdraw reserve",
    "execution reverted: Contract not expired yet": "Cannot withdraw from active contract",
    "execution reverted: Cannot withdraw reserve - contract was triggered": "Cannot withdraw reserve after payout was triggered",
    "insufficient funds": "Insufficient AVAX balance",
    "user rejected transaction": "Transaction was rejected by user",
    "network error": "Network connection error"
};

export const getErrorMessage = (error) => {
    const errorStr = error.message || error.toString();
    
    for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
        if (errorStr.includes(key)) {
            return message;
        }
    }
    
    return "An unexpected error occurred. Please try again.";
};
