pragma solidity ^0.6.0;

contract LogicContract {
    address returnedAddress;
    event contractAddress(address returnedAddress);

    function print_address() public returns (address) {
        returnedAddress = address(this);
        emit contractAddress(returnedAddress);
    }
}

contract CallingContract {
    address returnedAddress;
    address logic_pointer = address(new LogicContract());

    function print_my_delegate_address() public returns (address) {
        logic_pointer.delegatecall(abi.encodeWithSignature("print_address()"));
    }

    function print_my_call_address() public returns (address) {
        logic_pointer.call(abi.encodeWithSignature("print_address()"));
    }
}
