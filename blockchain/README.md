**Legacy Deployment:** [Avalanche Fuji Testnet](https://testnet.snowtrace.io/address/0xc62C15AD56f54757bb074e0779aE85e54FD67861)
**Contract Address:** `0xc62C15AD56f54757bb074e0779aE85e54FD67861`
# Dummy version of GoHedge Insurance Contract
# V1 Core Features
### Contract Creation:
The seller creates the insurance contract
Trigger condition: can alter (default: AVAX price <20USD)
Insurance fee: customized (default: 0.1 AVAX)
Start date: customized 
End date: customized 
Reserve token type: (Avax or any ERC20)
Reserve amount: customized, default 1 avax

### Seller Actions:
Cancel contract: Only if no buyer has taken the contract
Cannot cancel if a buyer is registered with the contract
Transfer reserve tokens: transfer when the contract is created or fund it later
Withdraw insurance fee: Only after the contract expiration date, AND the payout condition has not been triggered 
Withdraw reserve: Only after the contract expiration date, AND the payout condition has not been triggered 

### Buyer Actions:
Buy insurance: Pay the insurance fee
Trigger payout: Only before expiration date AND condition is met
Buyer registration: Register(pay the insurance fee) to the contract to become eligible for payout
Contract Rules:
One contract serves 1 buyer(s)
Condition check happens before expiry time
Automation handled by chainlink keeper

### Permission Structure:
Anyone can call: 
- triggerPayout()
- claimPayout() (funds automatically go to buyer's beneficiary address)
- checkContractStatus()
- getContractDetails() 
- [other read functions]

Only buyer can call: 
- changeBeneficiary()

Only seller can call: 
- withdrawInsuranceFee() (funds automatically go to seller's fee receiver address)
- changeFeeReceiver()
- cancelContract()
Technical Gaps:
Oracle failure handling - What if Chainlink feed fails? (Right now, the contract does not handle oracle failures.)
Dispute resolution - What if there's disagreement about conditions? (Right now, users must rely on Chainlink's dispute resolution, which is not implemented in this contract.)

Gas costs: Seller pays upfront automation deposit (0.01 AVAX)

Contract States: Created, Active (buyer joined), Triggered, Expired, Cancelled
Minimum/Maximum limits: Reserve amount, insurance fee
Emergency functions: Pause contract, emergency withdrawal
Emergency controls: one abort function return the reserve to the seller, and the insurance fee to the buyer

# V2 Upgrades：
### Service Fee:
Service fee: 0.01 avax + 0.1% of insurance fee
Fee recipient: 0xe2C3465d71D5A2EA1efc52CCaDd843bcC93ca18D

### Enhanced Buyer Options:
Buyer can cancel if seller agrees
### Enhanced Seller Options:
Seller can decide Buyer eligibility requirements: customized (default: balance > 1 AVAX)
Alternative eligibility: whitelist address

Beneficiary System:
Default beneficiary: the buyer
Buyer can set beneficiary: to some other address
Seller can change the recipient of the insurance fee: to some other address
Updated Permissions:
Funds can only go to:
Payout → buyer's beneficiary address
Insurance fee → seller's fee recipient address
Service fee → platform address
Trigger functions callable by: Anyone (maintains permissionless model)
Beneficiary changes require: Only buyer can change their beneficiary

### Technical Implementation
Oracle Integration:
Price feed source: chainlink oracle
Backup oracle: pusedo oracle
Update frequency: every minute
Failure handling: undecided (currently, the contract does not handle oracle failures)
Security Measures:
Minimum reserve:  0.1 AVAX
Maximum reserve: 10000 AVAX
Time locks: Time locks: 24 sec for beneficiary changes

