const JChoyToken = artifacts.require("JChoyToken");

contract("JChoyToken", function(accounts){
    it("should value is totalSupply", async () => {
        let instance = await JChoyToken.deployed();
        let initialBalance = await instance.balanceOf(accounts[0]);
        let totalSupply = await instance.totalSupply();

        console.log(initialBalance.toString(10));
        assert.equal(initialBalance, totalSupply, "initial == totalSupply");
        
    });
})