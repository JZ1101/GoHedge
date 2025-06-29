// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CCIP Interfaces
 * @dev Complete CCIP interface definitions for cross-chain communication
 */

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/**
 * @title Client Library
 * @dev Contains structs and helper functions for CCIP messages
 */
library Client {
    struct EVMTokenAmount {
        address token; // token address on the local chain
        uint256 amount; // Amount of tokens
    }

    struct Any2EVMMessage {
        bytes32 messageId; // MessageId corresponding to ccipSend on source
        uint64 sourceChainSelector; // Source chain selector
        bytes sender; // abi.decode(sender) if coming from an EVM chain
        bytes data; // payload sent in original message
        EVMTokenAmount[] destTokenAmounts; // Tokens and their amounts in their destination chain representation
    }

    struct EVM2AnyMessage {
        bytes receiver; // abi.encode(receiver address) for dest EVM chains
        bytes data; // Data payload
        EVMTokenAmount[] tokenAmounts; // Token transfers
        address feeToken; // Address of feeToken. address(0) means you will send msg.value.
        bytes extraArgs; // Populate this with _argsToBytes(EVMExtraArgsV1)
    }

    // EVMExtraArgsV1 struct for gas limit specification
    struct EVMExtraArgsV1 {
        uint256 gasLimit;
    }

    // Encode extra arguments for EVM chains
    function _argsToBytes(EVMExtraArgsV1 memory extraArgs) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(0x97a657c9, extraArgs);
    }
}

/**
 * @title IRouterClient
 * @dev Interface for CCIP Router Client
 */
interface IRouterClient {
    error UnsupportedDestinationChain(uint64 destinationChainSelector);

    /// @notice Checks if the given chain ID is supported for sending/receiving
    /// @param destinationChainSelector The chain to check
    /// @return supported is true if it is supported, false if not
    function isChainSupported(uint64 destinationChainSelector) external view returns (bool supported);

    /// @notice Gets a list of all supported tokens which can be sent or received
    /// to/from a given chain id
    /// @param destinationChainSelector The chain to check
    /// @return tokens The addresses of all supported tokens
    function getSupportedTokens(uint64 destinationChainSelector) external view returns (address[] memory tokens);

    /// @notice Gets the fee for a given CCIP message
    /// @param destinationChainSelector The destination chain ID
    /// @param message The message to get quote for
    /// @return fee returns the fee in juels
    function getFee(uint64 destinationChainSelector, Client.EVM2AnyMessage memory message) external view returns (uint256 fee);

    /// @notice Request a message to be sent to the destination chain
    /// @param destinationChainSelector The destination chain ID
    /// @param message The cross-chain CCIP message including data and/or tokens
    /// @return messageId The message ID
    function ccipSend(uint64 destinationChainSelector, Client.EVM2AnyMessage memory message) external payable returns (bytes32);
}

/**
 * @title IAny2EVMMessageReceiver
 * @dev Interface for contracts that can receive CCIP messages
 */
interface IAny2EVMMessageReceiver {
    /// @notice Called by the Router to deliver a message
    /// @param message CCIP Message
    /// @dev Note ensure you check the msg.sender is the OffRampRouter
    function ccipReceive(Client.Any2EVMMessage calldata message) external;
}

/**
 * @title CCIPReceiver
 * @dev Base contract for receiving CCIP messages
 */
abstract contract CCIPReceiver is IAny2EVMMessageReceiver, IERC165 {
    address private immutable i_router;

    constructor(address router) {
        if (router == address(0)) revert InvalidRouter(address(0));
        i_router = router;
    }

    /// @notice IERC165 supports an interfaceId
    /// @param interfaceId The interfaceId to check
    /// @return true if the interfaceId is supported
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    /// @inheritdoc IAny2EVMMessageReceiver
    function ccipReceive(Client.Any2EVMMessage calldata message) external virtual override onlyRouter {
        _ccipReceive(message);
    }

    /// @notice Override this function in your implementation
    /// @param message Any2EVMMessage
    function _ccipReceive(Client.Any2EVMMessage memory message) internal virtual;

    /////////////////////////////////////////////////////////////////////
    // Plumbing
    /////////////////////////////////////////////////////////////////////

    /// @notice Return the current router
    /// @return i_router address
    function getRouter() public view returns (address) {
        return address(i_router);
    }

    error InvalidRouter(address router);

    /// @dev only calls from the set router are accepted.
    modifier onlyRouter() {
        if (msg.sender != i_router) revert InvalidRouter(msg.sender);
        _;
    }
}

/**
 * @title OwnerIsCreator
 * @notice A contract with helpers for basic contract ownership.
 */
abstract contract OwnerIsCreator {
    address private s_owner;

    event OwnershipTransferRequested(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    constructor() {
        s_owner = msg.sender;
    }

    /**
     * @notice Allows an owner to begin transferring ownership to a new address,
     * pending.
     */
    function transferOwnership(address to) public onlyOwner {
        require(to != address(0), "Cannot transfer to zero address");
        emit OwnershipTransferRequested(s_owner, to);
        s_owner = to;
        emit OwnershipTransferred(s_owner, to);
    }

    /**
     * @notice Get the current owner
     */
    function owner() public view returns (address) {
        return s_owner;
    }

    /**
     * @notice Reverts if called by anyone other than the contract owner.
     */
    modifier onlyOwner() {
        require(msg.sender == s_owner, "Only callable by owner");
        _;
    }
}