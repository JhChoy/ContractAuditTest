import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import { advanceBlock } from 'openzeppelin-solidity/test/helpers/advanceToBlock';

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
        await advanceBlock();
        let balance = await token.balanceOf(accounts[0]);
        token.transfer(instance.address, balance, {from : accounts[0]}).should.be.fulfilled;
    });
    it("should be activated", async () =>{
        await instance.activeSale({from : accounts[0]});
        increaseTimeTo(START_TIME);
    });
    it("should receive 5*99 ether", async () => {
        for(let i= 0; i < 99; i++){
            instance.sendTransaction({from : accounts[i], value : web3.toWei(5, 'ether')}).should.be.fulfilled;
        }
        await advanceBlock();
        // for(let i= 0; i < 99; i++){
        //     let balance = await instance.getContributors.call(accounts[i])
        //     assert.equal(balance.toNumber(),
        //                 web3.toWei(5,'ether')*rate,
        //                 balance.toNumber() +"is not equal to"+web3.toWei(5,'ether')*rate);
        // }
        // good, but too much time
        let balance = (await web3.eth.getBalance(instance.address)).toNumber();
        console.log(balance, instance.address)
        assert.equal(balance, web3.toWei(5*99, 'ether'),balance +'and'+ web3.toWei(5*99, 'ether'));
    });
    it("shouldn't receive ether after end time", async () => {
        increaseTimeTo(END_TIME);
        instance.sendTransaction({from : accounts[3], value : web3.toWei(5, 'ether')}).should.be.rejectedWith('revert');
        instance.buyTokens(accounts[0], {from : accounts[0], value : web3.toWei(5, 'ether')}).should.be.rejectedWith('revert');
    });
    it("shouldn't active any functions after end time and not over soft cap", async () => {
        instance.activeSale().should.be.rejectedWith('revert');
        instance.finalizeSale().should.be.rejectedWith('revert');
        instance.finishSale().should.be.rejectedWith('revert');
        instance.receiveTokens().should.be.rejectedWith('revert');
        instance.refund().should.be.rejectedWith('revert');
    });
    it("should be changed to REFUND", async () =>{
        await instance.activeRefund({from : accounts[3]}).should.be.fulfilled;
        let state = await instance.getCurrentSate.call();
        assert.equal(state, "REFUND", "state isn't REFUND");
    });
    it("shouldn't active any functions after refund", async () =>{
        instance.activeSale().should.be.rejectedWith('revert');
        instance.finalizeSale().should.be.rejectedWith('revert');
        instance.finishSale().should.be.rejectedWith('revert');
        instance.receiveTokens().should.be.rejectedWith('revert');
        instance.activeRefund().should.be.rejectedWith('revert');
        instance.sendTransaction({from : accounts[3], value : web3.toWei(5, 'ether')}).should.be.rejectedWith('revert');
        instance.buyTokens(accounts[0], {from : accounts[0], value : web3.toWei(5, 'ether')}).should.be.rejectedWith('revert');
    });
    it("should give refund ethers to only contributors once", async () => {
        await (async () => {
            for(let i = 0; i < 99; i++){
                instance.refund({from : accounts[i]}).should.be.fulfilled;
            }
            instance.refund({from : accounts[99]}).should.be.rejectedWith('revert');
        })();
        await instance.refund({from : accounts[0]}).should.be.rejectedWith('revert');
        await advanceBlock();
        let balance = (await web3.eth.getBalance(instance.address)).toNumber();
        assert.equal(balance, 0, balance +'and'+ 0);
    });

});