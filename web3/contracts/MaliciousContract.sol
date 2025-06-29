// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDummyUpgrade {
    function purchaseInsurance(uint256 _contractId) external payable;
    function claimPayout(uint256 _contractId) external;
    function withdrawReserve(uint256 _contractId) external;
    function createContract(
        string calldata _triggerToken,
        uint256 _triggerPrice,
        uint256 _startDate,
        uint256 _endDate,
        string calldata _reserveToken,
        uint256 _reserveAmount,
        uint256 _insuranceFee,
        bool _autoExecute
    ) external payable;
}

contract MaliciousContract {
    uint256 public reentryCount;
    address public targetContract;
    uint256 public targetContractId;
    bool public attacking;
    
    event ReentryAttempt(uint256 count);
    event AttackResult(bool success, string reason);

    function resetState() external {
        reentryCount = 0;
        attacking = false;
    }

    function purchaseInsurance(address _contract, uint256 _contractId) external payable {
        IDummyUpgrade(_contract).purchaseInsurance{value: msg.value}(_contractId);
    }

    function createContract(
        address _contract,
        string calldata _triggerToken,
        uint256 _triggerPrice,
        uint256 _startDate,
        uint256 _endDate,
        string calldata _reserveToken,
        uint256 _reserveAmount,
        uint256 _insuranceFee,
        bool _autoExecute
    ) external payable {
        IDummyUpgrade(_contract).createContract{value: msg.value}(
            _triggerToken,
            _triggerPrice,
            _startDate,
            _endDate,
            _reserveToken,
            _reserveAmount,
            _insuranceFee,
            _autoExecute
        );
    }

    function attemptReentrancy(address _contract, uint256 _contractId) external {
        targetContract = _contract;
        targetContractId = _contractId;
        attacking = true;
        reentryCount = 0;
        
        try IDummyUpgrade(_contract).claimPayout(_contractId) {
            emit AttackResult(true, "Initial claim succeeded");
        } catch Error(string memory reason) {
            emit AttackResult(false, reason);
            revert(reason);
        } catch {
            emit AttackResult(false, "Unknown error");
            revert("Unknown error in reentrancy attempt");
        }
    }

    function attemptWithdrawReentrancy(address _contract, uint256 _contractId) external {
        targetContract = _contract;
        targetContractId = _contractId;
        attacking = true;
        reentryCount = 0;
        
        try IDummyUpgrade(_contract).withdrawReserve(_contractId) {
            emit AttackResult(true, "Initial withdraw succeeded");
        } catch Error(string memory reason) {
            emit AttackResult(false, reason);
            revert(reason);
        } catch {
            emit AttackResult(false, "Unknown error");
            revert("Unknown error in withdraw reentrancy attempt");
        }
    }

    function claimNormally(address _contract, uint256 _contractId) external {
        attacking = false;
        reentryCount = 0;
        IDummyUpgrade(_contract).claimPayout(_contractId);
    }

    // This function gets called when ETH is sent to this contract
    receive() external payable {
        if (attacking && reentryCount < 2) {
            reentryCount++;
            emit ReentryAttempt(reentryCount);
            
            try IDummyUpgrade(targetContract).claimPayout(targetContractId) {
                // If this succeeds, reentrancy protection failed
            } catch {
                // If this fails, reentrancy protection worked
            }
        }
    }

    // Allow contract to receive ETH
    fallback() external payable {}
}