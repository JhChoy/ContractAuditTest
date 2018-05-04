pragma solidity ^0.4.23;

import "../math/SafeMath.sol";
import "../ownership/Ownable.sol";
import "../token/IERC20.sol";

contract Crowdsale is Ownable{

    using SafeMath for uint256;

    enum STATE {PREPARE, ACTIVE, FINISHED, FINALIZED, REFUND}

    uint public constant rate = 10 * 1000;
    uint public constant HARD_CAP = 1000 ether;
    uint public constant SOFT_CAP = 500 ether;
    uint public constant START_TIME = 1525824000000; // UTC 2018 May 8th Tuesday PM 3:00:00
    uint public constant END_TIME = 1526036400000; // UTC 2018 May 11st Friday AM 2:00:00

    IERC20 public mToken;
    address public mTeamWallet;
    STATE mCurrentState = STATE.PREPARE;

    mapping(address => uint) public mContributors;

    event TokenPurchase(address indexed _purchaser, address indexed _receiver, uint _tokens);

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
    function getCurrentSate() view external returns(string){
        if(mCurrentState == STATE.PREPARE){
            return "PREPARE";
        } else if(mCurrentState == STATE.ACTIVE){
            return "ACTIVE";
        } else if(mCurrentState == STATE.FINISHED){
            return "FINISHED";
        } else if(mCurrentState == STATE.FINALIZED){
            return "FINALIZED";
        } else if(mCurrentState == STATE.REFUND){
            return "REFUND";
        } else
            return "SOMETHING WORNG";
    }

    function activeSale() public onlyOwner period(STATE.PREPARE) {
        require(mToken.balanceOf(address(this)) == mToken.totalSupply());
        mCurrentState = STATE.ACTIVE;
    }
    function finishSale() public onlyOwner period(STATE.ACTIVE){
        require(now >= END_TIME);
        require(address(this).balance > SOFT_CAP);
        _finish();
    }
    function finalizeSale() public period(STATE.FINISHED){
        _finalize();
        mCurrentState = STATE.FINALIZED;
    }
    function activeRefund() public period(STATE.ACTIVE){
        require(now > END_TIME);
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
        uint tokens = 0;
        if(address(this).balance.add(amount) > HARD_CAP){
            //should pay back left ethers
            uint changes = amount.sub(address(this).balance.add(amount).sub(HARD_CAP));
            msg.sender.transfer(changes);
            tokens = rate.mul(amount.sub(changes));
            emit TokenPurchase(msg.sender, _receiver, tokens);
            _addContributors(_receiver, tokens);
            _finish();
        }
        tokens = rate.mul(amount);
        emit TokenPurchase(msg.sender, _receiver, tokens);
        _addContributors(_receiver, tokens);
    }

    function _addContributors(address _contributor, uint _additionalToken) private {
        if(mContributors[_contributor] > 0) {
            mContributors[_contributor] = mContributors[_contributor].add(_additionalToken);
        } else {
            mContributors[_contributor] = _additionalToken;
        }
    }
    
    function _finish() private period(STATE.ACTIVE){
        mCurrentState = STATE.FINISHED;
    }
    function _finalize() private{
        mTeamWallet.transfer(address(this).balance);
        mToken.transfer(mTeamWallet, mToken.balanceOf(address(this)));
    }


    function receiveTokens() public period(STATE.FINALIZED){
        require(mContributors[msg.sender] > 0);
        mToken.transfer(msg.sender, mContributors[msg.sender]);
        delete mContributors[msg.sender];
    }

    function refund() public period(STATE.REFUND){
        require(mContributors[msg.sender] > 0);
        msg.sender.transfer(mContributors[msg.sender].div(rate));
        delete mContributors[msg.sender];
    }

}

