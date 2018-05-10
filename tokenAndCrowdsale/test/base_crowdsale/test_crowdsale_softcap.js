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
    let mTeamWallet;
    let gatheredEther;
    let mContributedTokens;
    before(async () => {
        await advanceBlock();

        instance = await Crowdsale.deployed();
        token = await JChoyToken.deployed();
        totalSupply = await token.totalSupply.call();
        decimals = await token.decimals.call();
        rate = await instance.rate.call();
        HARD_CAP = await instance.HARD_CAP.call();
        SOFT_CAP = await instance.SOFT_CAP.call();
        START_TIME = await instance.START_TIME.call();
        END_TIME = await instance.END_TIME.call();
        mTeamWallet = await instance.mTeamWallet.call();
        await advanceBlock();
        let balance = await token.balanceOf(accounts[0]);
        token.transfer(instance.address, balance, {from : accounts[0]}).should.be.fulfilled;  
    });
    //receive all tokens
    it("should be activated", async () =>{
        await instance.activeSale({from : accounts[0]});
        increaseTimeTo(START_TIME);
    });
    it("should receive 5*98 ether", async () => {
        for(let i= 2; i < 100; i++){
            instance.sendTransaction({from : accounts[i], value : web3.toWei(5, 'ether')}).should.be.fulfilled;
        }
        await advanceBlock();
        // for(let i= 2; i < 98; i++){
        //     let balance = await instance.getContributors.call(accounts[i])
        //     assert.equal(balance.toNumber(),
        //                 web3.toWei(5,'ether')*rate,
        //                 balance.toNumber() +"is not equal to"+web3.toWei(5,'ether')*rate);
        // }
        // good, but too much time
        let balance = (await web3.eth.getBalance(instance.address)).toNumber();
        console.log(balance, instance.address)
        assert.equal(balance, web3.toWei(5*98, 'ether'),balance +'and'+ web3.toWei(5*98, 'ether'));
    });
    //add perfectly
    it("should add additional ether perfectly", async () =>{
        instance.sendTransaction({from : accounts[3], value : web3.toWei(10, 'ether')}).should.be.fulfilled;
        let balance = await instance.getContributors.call(accounts[3])
        assert.equal(balance.toNumber(),
                    web3.toWei(15,'ether')*rate,
                    balance.toNumber() +"is not equal to"+web3.toWei(15,'ether')*rate);
    });
    //after soft cap function X called
    it("shouldn't receive ether after end time", async () => {
        increaseTimeTo(END_TIME);
        instance.sendTransaction({from : accounts[3], value : web3.toWei(5, 'ether')}).should.be.rejectedWith('revert');
        instance.buyTokens(accounts[0], {from : accounts[0], value : web3.toWei(5, 'ether')}).should.be.rejectedWith('revert');
    });
    it("shouldn't active any functions after end time and over soft cap", async () => {
        instance.activeSale().should.be.rejectedWith('revert');
        instance.finalizeSale().should.be.rejectedWith('revert');
        instance.activeRefund().should.be.rejectedWith('revert');
        instance.receiveTokens().should.be.rejectedWith('revert');
        instance.refund().should.be.rejectedWith('revert');
    });
    //finish sale
    it("should finish sale", async () => {
        await instance.finishSale({from : accounts[3]}).should.be.rejectedWith('revert');
        await instance.finishSale().should.be.fulfilled;
        await instance.finishSale().should.be.rejectedWith('revert');
        let state = await instance.getCurrentSate.call();
        assert.equal(state, "FINISHED", "state isn't FINISHED");
    });
    //after finish sale
    it("shouldn't active any functions after finished", async () => {
        instance.activeSale().should.be.rejectedWith('revert');
        instance.finishSale().should.be.rejectedWith('revert');
        instance.activeRefund().should.be.rejectedWith('revert');
        instance.receiveTokens().should.be.rejectedWith('revert');
        instance.refund().should.be.rejectedWith('revert');
    });
    //finalize
    it("should finalize sale", async () => {
        gatheredEther = (await web3.eth.getBalance(instance.address)).toNumber();
        console.log("gatheredEther : " + gatheredEther);
        mContributedTokens = (await instance.mContributedTokens.call()).toNumber();
        // it is public
        await instance.finalizeSale({from : accounts[3]}).should.be.fulfilled;
        await instance.finalizeSale().should.be.rejectedWith('revert');
        let state = await instance.getCurrentSate.call();
        assert.equal(state, "FINALIZED", "state isn't FINALIZED");
    });
    //receiving
    it("should give tokens to contributors", async () =>{
        await (async () => {
            for(let i = 2; i < 100; i++){
                instance.receiveTokens({from : accounts[i]}).should.be.fulfilled;
            }
            instance.receiveTokens({from : accounts[0]}).should.be.rejectedWith('revert');
        })();
        await advanceBlock();
        await instance.receiveTokens({from : accounts[6]}).should.be.rejectedWith('revert'); 

        for(let i= 2; i < 100; i++){
            let balance = (await token.balanceOf(accounts[i])).toNumber();
            if(i==3){
                assert.equal(balance,
                    web3.toWei(15,'ether')*rate,
                    balance +"is not equal to"+web3.toWei(15,'ether')*rate);
                continue;
            }
            assert.equal(balance,
                        web3.toWei(5,'ether')*rate,
                        balance +"is not equal to"+web3.toWei(5,'ether')*rate);
        }
        // good, but too much time

        //balance check
        let crowdsaleBalance = (await web3.eth.getBalance(instance.address)).toNumber();
        assert.equal(crowdsaleBalance, 0, crowdsaleBalance +'and'+ 0);
        let leftTokens = (await token.balanceOf(instance.address)).toNumber();
        assert.equal(leftTokens, 0, leftTokens +" : "+0);
    })
});