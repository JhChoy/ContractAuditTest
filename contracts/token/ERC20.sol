pragma solidity ^0.4.21;

import "./IERC20.sol";
import "../math/SafeMath.sol";


/**
 * @title ERC20Token - ERC20 base implementation
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is IERC20 {
    using SafeMath for uint256;

    mapping (address => uint256) public balances;
    mapping (address => mapping (address => uint256)) internal allowed;

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        require(balances[msg.sender] >= _value);

        balances[msg.sender] = balances[msg.sender].safeSub(_value);
        balances[_to] = balances[_to].safeAdd(_value);
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        require(balances[_from] >= _value && allowed[_from][msg.sender] >= _value);

        balances[_to] = balances[_to].safeAdd(_value);
        balances[_from] = balances[_from].safeSub(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].safeSub(_value);
        emit Transfer(_from, _to, _value);
        return true;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowed[_owner][_spender];
    }
}