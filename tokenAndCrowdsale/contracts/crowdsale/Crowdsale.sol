pragma solidity ^0.4.23;

import "../math/SafeMath.sol";
import "../ownership/Ownable.sol";
import "../token/IERC20.sol";

contract Crowdsale is Ownable{

    using SafeMath for uint256;

    uint public constant rate = 10 * 1000;
    uint public constant MAX_CAP = 1000 ether;
    uint public constant SOFT_CAP = 500 ether;
    uint public constant START_TIME = 1525824000000; // UTC 2018 May 8th Tuesday PM 3:00:00
    uint public constant END_TIME = 1526036400000; // UTC 2018 May 11st Friday AM 2:00:00

    IERC20 mToken;
    address mTeamWallet;


    constructor(
        address _tokenAddress,
        address _teamWallet
    ) public Ownable(msg.sender){
        mToken = IERC20(_tokenAddress);
        mTeamWallet = _teamWallet;
    }

    function () payable public{
        buyTokens(msg.sender);
    }

    function buyTokens(address _receiver) payable public{

    }
}

