// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MockV3Aggregator {
    uint256 public constant version = 4;
    uint8 public decimals;
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint256 public latestRound;
    
    mapping(uint256 => int256) public getAnswer;
    mapping(uint256 => uint256) public getTimestamp;
    mapping(uint256 => uint256) private getStartedAt;
    
    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        updateAnswer(_initialAnswer);
    }
    
    function updateAnswer(int256 _answer) public {
        latestAnswer = _answer;
        latestTimestamp = block.timestamp;
        latestRound++;
        getAnswer[latestRound] = _answer;
        getTimestamp[latestRound] = block.timestamp;
        getStartedAt[latestRound] = block.timestamp;
    }
    
    function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) {
        return (_roundId, getAnswer[_roundId], getStartedAt[_roundId], getTimestamp[_roundId], _roundId);
    }
    
    function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) {
        return (uint80(latestRound), getAnswer[latestRound], getStartedAt[latestRound], getTimestamp[latestRound], uint80(latestRound));
    }
    
    function description() external pure returns (string memory) { return "v0.8/tests/MockV3Aggregator.sol"; }
}