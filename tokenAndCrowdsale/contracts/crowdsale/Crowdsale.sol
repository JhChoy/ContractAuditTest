pragma solidity ^0.4.23;

import "../math/SafeMath.sol";
import "../ownership/Ownable.sol";
import "../token/IERC20.sol";

contract Crowdsale is Ownable{

    using SafeMath for uint256;

    enum STATE {PREPARE, ACTIVE, FINISH, FINALIZE, REFUND}

    uint public constant rate = 10 * 1000;
    uint public constant HARD_CAP = 1000 ether;
    uint public constant SOFT_CAP = 500 ether;
    uint public constant START_TIME = 1525824000000; // UTC 2018 May 8th Tuesday PM 3:00:00
    uint public constant END_TIME = 1526036400000; // UTC 2018 May 11st Friday AM 2:00:00

    IERC20 mToken;
    address mTeamWallet;
    STATE mCurrentState = STATE.PREPARE;

    modifier period(STATE _state){
        require(mCurrentState == _state);
        _;
    }


    constructor(
        address _tokenAddress,
        address _teamWallet
    ) public Ownable(msg.sender){
        mToken = IERC20(_tokenAddress);
        mTeamWallet = _teamWallet;
    }

    function activeSale() public period(STATE.PREPARE) {
        mCurrentState = STATE.ACTIVE;
    }
    function finalizeSale() public period(STATE.FINISH){
        mCurrentState = STATE.FINALIZE;
    }
    function activeRefund() public period(STATE.ACTIVE){
        require(now>END_TIME);
        require(address(this).balance < SOFT_CAP);
        mCurrentState = STATE.REFUND;
    }

    function () payable public{
        buyTokens(msg.sender);
    }

    function buyTokens(address _receiver) payable public period(STATE.ACTIVE){
        require(_receiver != address(0));
        require(msg.value > 0);
        require(now > START_TIME && now < END_TIME);
        uint amount = msg.value;
        if(address(this).balance.add(amount) > HARD_CAP){
            //should pay back left ethers
            uint changes = amount.sub(address(this).balance.add(amount).sub(HARD_CAP));
            msg.sender.transfer(changes);
            mToken.transfer(_receiver, rate.mul(amount.sub(changes)));
            //finalize Fund
        }
        mToken.transfer(_receiver, rate.mul(amount));
    }

    function refund() public period(STATE.REFUND){
        uint balance = mToken.balanceOf(msg.sender);
        require(balance > 0);
    }

}

