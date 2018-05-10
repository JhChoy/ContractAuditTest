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
    let mTeamWallet;
    let gatheredEther;
    let mContributedTokens;
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
        mTeamWallet = await instance.mTeamWallet.call();
        await advanceBlock();
        let balance = await token.balanceOf(accounts[0]);
        token.transfer(instance.address, balance, {from : accounts[0]}).should.be.fulfilled;
    });
    it("should list users", async () => {
        for(let i = 2; i<36; i++){
            instance.addWhitelist(accounts[i], web3.toWei(30, 'ether'));
        }
    })
    //receive all tokens
    it("should be activated", async () =>{
        await instance.activeSale({from : accounts[0]});
        increaseTimeTo(START_TIME);
    });

    //choose one

    // it("should receive exactly same amount of HARD_CAP", async () => {
    //     for(let i= 2; i < 52; i++){
    //         instance.sendTransaction({from : accounts[i], value : web3.toWei(20, 'ether')}).should.be.fulfilled;
    //     }
    //     await advanceBlock();
    //     for(let i= 2; i < 52; i++){
    //         let balance = await instance.getContributors.call(accounts[i])
    //         assert.equal(
    //             balance.toNumber(),
    //             web3.toWei(20,'ether')*rate,
    //             balance.toNumber() +" is not equal to "+web3.toWei(20,'ether')*rate);
    //     }
    //     // good, but too much time
    //     let balance = (await web3.eth.getBalance(instance.address)).toNumber();
    //     console.log(balance, instance.address)
    //     assert.equal(balance, HARD_CAP, balance +'and'+ HARD_CAP);
        
    //     let state = await instance.getCurrentSate.call();
    //     assert.equal(state, "FINISHED", "state isn't FINISHED");
    // });

    it("should receive exactly same amount of HARD_CAP", async () => {
        for(let i= 2; i < 35; i++){
            instance.sendTransaction({from : accounts[i], value : web3.toWei(30, 'ether')}).should.be.fulfilled;
        }
        await advanceBlock();
        await instance.sendTransaction({from : accounts[35], value : web3.toWei(30, 'ether')}).should.be.fulfilled;
        // for(let i= 2; i < 35; i++){
        //     let balance = await instance.getContributors.call(accounts[i])
        //     assert.equal(
        //         balance.toNumber(),
        //         web3.toWei(30,'ether')*rate,
        //         balance.toNumber() +" is not equal to "+web3.toWei(30,'ether')*rate);
        // }
        // let balance35 = await instance.getContributors.call(accounts[35])
        // assert.equal(
        //     balance35.toNumber(),
        //     web3.toWei(10,'ether')*rate,
        //     balance35.toNumber() +" is not equal to "+web3.toWei(10,'ether')*rate);
        // good, but too much time
        let balance = (await web3.eth.getBalance(instance.address)).toNumber();
        console.log(balance, instance.address)
        assert.equal(balance, HARD_CAP, balance +'and'+ HARD_CAP);
        
        let state = await instance.getCurrentSate.call();
        assert.equal(state, "FINISHED", "state isn't FINISHED");
    });
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
            for(let i = 2; i <= 35; i++){
                instance.receiveTokens({from : accounts[i]}).should.be.fulfilled;
            }
            instance.receiveTokens({from : accounts[0]}).should.be.rejectedWith('revert');
        })();
        await advanceBlock();
        await instance.receiveTokens({from : accounts[6]}).should.be.rejectedWith('revert');

        for(let i= 2; i < 36; i++){
            let balance = (await token.balanceOf(accounts[i])).toNumber();
            if(i==35){
                assert.equal(
                    balance,
                    web3.toWei(10,'ether')*rate,
                    balance +"is not equal to"+web3.toWei(10,'ether')*rate);
                continue;
            }
            assert.equal(
                balance,
                web3.toWei(30,'ether')*rate,
                balance +"is not equal to"+web3.toWei(30,'ether')*rate);
        }
        // good, but too much time

        //balance check
        let crowdsaleBalance = (await web3.eth.getBalance(instance.address)).toNumber();
        assert.equal(crowdsaleBalance, 0, crowdsaleBalance +'and'+ 0);
        let leftTokens = (await token.balanceOf(instance.address)).toNumber();
        assert.equal(leftTokens, 0, leftTokens +" : "+0);
    })
});