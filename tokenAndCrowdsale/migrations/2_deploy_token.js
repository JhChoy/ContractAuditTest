const JChoyToken = artifacts.require("./JChoyToken.sol");
const SafeMath = artifacts.require("./SafeMath.sol");

module.exports = function(deployer, network, accounts){
    console.log(accounts[0]);
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, JChoyToken);
    deployer.deploy(JChoyToken, {from: accounts[0], gasLimit: 50000000});
}