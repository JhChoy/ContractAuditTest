import { increaseTime, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';

const JChoyToken = artifacts.require("JChoyToken");
const Crowdsale = artifacts.require("Crowdsale");

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract("Crowdsale", function(accounts){
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
        instance = await Crowdsale.deployed();
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
    it("should receive ethers after start time", async () =>{
        console.log(START_TIME, duration.days(1));
        // instance.send(web3.toWei(10, 'ether'), {from : accounts[2]}).should.be.fulfilled;
        // instance.buyTokens(accounts[0], {from : accounts[2], value : web3.toWei(10, 'ether')}).should.be.fulfilled;
    })
});
