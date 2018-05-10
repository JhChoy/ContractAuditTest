import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import { advanceBlock } from 'openzeppelin-solidity/test/helpers/advanceToBlock';

const JChoyToken = artifacts.require("JChoyToken");
const WhitelistCrowdsale = artifacts.require("WhitelistCrowdsale");

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract("WhitelistCrowdsale", function(accounts){
    let instance ;
    let token ;
    let rate ;
    let HARD_CAP;
    let SOFT_CAP;
    let START_TIME;
    let END_TIME ;
    let totalSupply;
    let decimals;
    let owner;
    before(async () => {
        await advanceBlock();

        instance = await WhitelistCrowdsale.deployed();
        token = await JChoyToken.deployed();
        totalSupply = await token.totalSupply.call();
        decimals = await token.decimals.call();
        rate = await instance.rate.call();
        HARD_CAP = await instance.HARD_CAP.call();
        SOFT_CAP = await instance.SOFT_CAP.call();
        START_TIME = await instance.START_TIME.call();
        END_TIME = await instance.END_TIME.call();
    })
    it("shouldn't active when its balance is not totalSupply", async () => {
        await token.transfer(instance.address, 10, {from : accounts[0]});
        let balance = await token.balanceOf(instance.address);
        console.log(balance.toNumber()/(10 ** decimals))
        await instance.activeSale({from : accounts[0]}).should.be.rejectedWith('revert');
        let leftBalance = await token.balanceOf(accounts[0]);
        token.transfer(instance.address, leftBalance, {from : accounts[0]}).should.be.fulfilled;
    });
    it("should have same owner with deployer", async () => {
        owner = await instance.owner.call();
        console.log(owner);
        assert.equal(owner, accounts[0], "not same owner");
    });
    it("shouldn't receive ether when preparing process", async () =>{
        instance.send(web3.toWei(10, 'ether'), {from : accounts[0]}).should.be.rejectedWith('revert');
        instance.buyTokens(accounts[0], {from : accounts[0], value : web3.toWei(10, 'ether')}).should.be.rejectedWith('revert');
    });
    it("shouldn't active onlyOwner function", async () => {
        instance.activeSale({from : accounts[1]}).should.be.rejectedWith('revert');
        
    });
    it("should add whitelist", async () =>{
        //just accounts[0] and accounts[2]
        instance.addWhitelist(accounts[0], web3.toWei(10, 'ether')).should.be.fulfilled;
        instance.addWhitelist(accounts[2], web3.toWei(5, 'ether')).should.be.fulfilled;
    });
    it("shouldn't active other processes before start time even if state is ACTIVE", async () => {
        let state = await instance.getCurrentSate.call();
        assert.equal(state, "PREPARE", "state isn't PREPARE");
        await instance.activeSale({from : accounts[0]});
        state = await instance.getCurrentSate.call();
        assert.equal(state, "ACTIVE", "state isn't ACTIVE");

        instance.activeSale({from : accounts[0]}).should.be.rejectedWith('revert'); //not call twice

        instance.finishSale({from : accounts[0]}).should.be.rejectedWith('revert');
        instance.send(web3.toWei(10, 'ether'), {from : accounts[0]}).should.be.rejectedWith('revert');
        instance.buyTokens(accounts[0], {from : accounts[0], value : web3.toWei(10, 'ether')}).should.be.rejectedWith('revert');
        instance.activeRefund({from : accounts[0]}).should.be.rejectedWith('revert');
    });
    it("should receive ethers of listed people after start time", async () =>{
        await increaseTimeTo(START_TIME);
        await instance.sendTransaction({from : accounts[2], value : web3.toWei(1, 'ether')}).should.be.fulfilled;
        instance.buyTokens(accounts[0], {from : accounts[2], value : web3.toWei(1, 'ether')}).should.be.fulfilled;
        instance.sendTransaction({from : accounts[4], value : web3.toWei(1, 'ether')}).should.be.rejectedWith('revert');
        instance.sendTransaction({from : accounts[2], value : web3.toWei(10, 'ether')}).should.be.rejectedWith('revert');

        let tokenBalance0 = await instance.getContributors.call(accounts[0]);
        let tokenBalance2 = await instance.getContributors.call(accounts[2]);
        console.log(tokenBalance0.toNumber()/10**decimals, tokenBalance2.toNumber()/10**decimals);//FIX
    });
    it("shouldn't active other processes before sale finished", async () =>{
        instance.activeSale({from : accounts[0]}).should.be.rejectedWith('revert');
        instance.activeRefund({from : accounts[0]}).should.be.rejectedWith('revert');
        instance.finalizeSale({from : accounts[0]}).should.be.rejectedWith('revert');
        instance.finishSale({from : accounts[0]}).should.be.rejectedWith('revert');
        instance.receiveTokens({from : accounts[0]}).should.be.rejectedWith('revert');
        instance.refund({from : accounts[0]}).should.be.rejectedWith('revert');
    });
    
});
