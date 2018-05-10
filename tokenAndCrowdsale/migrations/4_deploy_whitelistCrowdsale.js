const WhitelistCrowdsale = artifacts.require("./WhitelistCrowdsale.sol");
const SafeMath = artifacts.require("./SafeMath.sol");
const JChoyToken = artifacts.require("./JChoyToken.sol");


module.exports = async function(deployer, network, accounts){
    console.log(accounts[0]);
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, WhitelistCrowdsale);

    const _token = await JChoyToken.deployed();
    const _teamWallet = accounts[1];
    deployer.deploy(WhitelistCrowdsale, _token.address, _teamWallet, {from: accounts[0], gasLimit: 50000000});
}