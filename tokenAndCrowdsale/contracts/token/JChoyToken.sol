pragma solidity ^0.4.23;

import "./ERC20.sol";

contract JChoyToken is ERC20{
    constructor() public {
        decimals = 18;
        name = "JChoy";
        symbol = "CJH";
        totalSupply = 1000 * 1000 * 1000 * (10 ** uint(decimals));
        balances[msg.sender] = totalSupply;
    }
}