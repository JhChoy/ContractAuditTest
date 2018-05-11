pragma solidity ^0.4.23;

import "../math/SafeMath.sol";
import "../ownership/Ownable.sol";
import "../token/IERC20.sol";

contract WhitelistCrowdsale is Ownable{

    /* Library */

    using SafeMath for uint256;


    /* Enum and Structure */

    enum STATE {PREPARE, ACTIVE, FINISHED, FINALIZED, REFUND}

    struct Whitelist{
        bool isListed;
        uint maxcap;
    }


    /* Constants */

    uint public constant rate = 10 * 1000;
    uint public constant HARD_CAP = 1000 ether;
    uint public constant SOFT_CAP = 500 ether;
    uint public constant START_TIME = 1525791600000; // UTC 2018 May 8th Tuesday PM 3:00:00
    uint public constant END_TIME = 1526004000000; // UTC 2018 May 11st Friday AM 2:00:00



    /* Global Variables */

    IERC20 public mToken;
    address public mTeamWallet;
    STATE mCurrentState = STATE.PREPARE;

    mapping(address => Whitelist) public mWhitelist;
    mapping(address => uint) public mContributors;
    uint public mContributedTokens = 0;



    /* Event */

    event TokenPurchase(address indexed _purchaser, address indexed _receiver, uint _tokens);
    event RefundEthers(address indexed _receiver, uint _ethers);


    /* Modifier */

    modifier period(STATE _state){
        require(mCurrentState == _state);
        _;
    }



    /* Functions */
    // Constructor
    constructor(
        address _tokenAddress,
        address _teamWallet
    ) public Ownable(msg.sender){
        mToken = IERC20(_tokenAddress);
        mTeamWallet = _teamWallet;
    }

    // View functions
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


    // Set Functions
    function addWhitelist(address _whitelist, uint _maxcap) public onlyOwner{
        require(mCurrentState < STATE.FINISHED);
        mWhitelist[_whitelist].isListed = true;
        mWhitelist[_whitelist].maxcap = _maxcap;
    }


    // State Functions
    function activeSale() public onlyOwner period(STATE.PREPARE) {
        require(mToken.balanceOf(address(this)) == mToken.totalSupply());
        mCurrentState = STATE.ACTIVE;
    }
    function finishSale() public onlyOwner period(STATE.ACTIVE){
        require(now >= END_TIME);
        require(address(this).balance >= SOFT_CAP);
        _finish();
    }
    function finalizeSale() public period(STATE.FINISHED){
        _finalize();
        mCurrentState = STATE.FINALIZED;
    }
    function activeRefund() public period(STATE.ACTIVE){
        require(now >= END_TIME);
        require(address(this).balance < SOFT_CAP);
        mCurrentState = STATE.REFUND;
    }


    // Payable Functions
    function () payable public{
        buyTokens(msg.sender);
    }

    function buyTokens(address _receiver) payable public period(STATE.ACTIVE){
        require(_receiver != address(0));
        require(msg.value > 0);
        require(now >= START_TIME && now < END_TIME);
        require(mWhitelist[_receiver].isListed);
        uint amount = msg.value;
        require(mWhitelist[_receiver].maxcap >= mContributors[_receiver].div(rate).add(amount));
        uint tokens = 0;
        if(address(this).balance >= HARD_CAP){
            //should pay back left ethers
            uint changes = address(this).balance.sub(HARD_CAP);
            msg.sender.transfer(changes);
            tokens = rate.mul(amount.sub(changes));
            emit TokenPurchase(msg.sender, _receiver, tokens);
            _addContributors(_receiver, tokens);
            _finish();
            return;
        }
        tokens = rate.mul(amount);
        emit TokenPurchase(msg.sender, _receiver, tokens);
        _addContributors(_receiver, tokens);
    }


    // Public Functions
    function receiveTokens() public period(STATE.FINALIZED){
        require(mContributors[msg.sender] > 0);
        mToken.transfer(msg.sender, mContributors[msg.sender]);
        delete mContributors[msg.sender];
    }

    function refund() public period(STATE.REFUND){
        require(mContributors[msg.sender] > 0);
        uint ethers = mContributors[msg.sender].div(rate);
        msg.sender.transfer(ethers);
        delete mContributors[msg.sender];
        emit RefundEthers(msg.sender, ethers);
    }


    // private Functions
    function _addContributors(address _contributor, uint _additionalToken) private {
        mContributors[_contributor] = mContributors[_contributor].add(_additionalToken);
        mContributedTokens += _additionalToken;
    }
    
    function _finish() private period(STATE.ACTIVE){
        mCurrentState = STATE.FINISHED;
    }
    function _finalize() private{
        mTeamWallet.transfer(address(this).balance);
        mToken.transfer(mTeamWallet, mToken.balanceOf(address(this)).sub(mContributedTokens));
    }
}

