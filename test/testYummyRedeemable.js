/*
* Tests the Redeemable functionality
*/

const RedeemableShop = artifacts.require('RedeemableShop');

const tUtils = require('./testUtils.js');

///////////////////////////////////////////////////////////////////////
//                        USEFUL GLOBALS                             //
///////////////////////////////////////////////////////////////////////

let redeemableShop;
let baseYummyCost = web3.toWei(0.043, 'ether');       //10$ in 24/09/2018
let baseYummyIncrement = web3.toWei(0.0017, 'ether'); //40 cents in 24/09/2018

const ownerCut = 500;
const veryFarDate = 32522601600; //year 3000
const veryFarDatePlusOneYear = 32546188800; //year 3001

///////////////////////////////////////////////////////////////////////
//                           UTILITIES                               //
///////////////////////////////////////////////////////////////////////


async function createRedeemable(specieId, baseCost, increment, maxBuyDate, redeemDate, account){
    await redeemableShop.createNewRedeemable(
        specieId,
        baseCost,
        increment,
        maxBuyDate,
        redeemDate,
        {
            from: account
        }
    );
}

async function getRedeemable(specieId){
    let redeemable = await redeemableShop.getRedeemable(specieId);
    return {
        id: redeemable[0],
        basePrice: redeemable[1],
        increment: redeemable[2],
        numUnitsSold: redeemable[3],
        maxBuyDate: redeemable[4],
        redeemDate: redeemable[5],
    }
}

async function createRedeemableAndGet(from, raceId){
    await createRedeemable(raceId, baseYummyCost, baseYummyIncrement, veryFarDate, veryFarDatePlusOneYear, from);
    return await getRedeemable(0);
}


contract('Redeemable Shop (Create and Update)', async accounts => {

    beforeEach('setup contract for each test', async () => {
        redeemableShop = await RedeemableShop.new({from: accounts[0]});
    });

    ///////////////////////////////////////////////////////////////////////
    //                       CREATE REDEEMABLE                           //
    ///////////////////////////////////////////////////////////////////////

    it(tUtils.getTestNumber() + 'Should create a redeemable with id 0', async () => {
        let redeemable = await createRedeemableAndGet(accounts[0], 0);
        let numRedemables = await redeemableShop.numRedeemable();
        assert.equal(numRedemables, 1, "Redemable hasn't been created");
        assert.equal(redeemable.id, 0, "Incorrect id");
        assert.equal(redeemable.basePrice, baseYummyCost, "Base price is incorrect!");
        assert.equal(redeemable.increment, baseYummyIncrement, "Increment is incorrect!");
        assert.equal(redeemable.numUnitsSold, 0, "Incorrect num yummies sold");
        assert.equal(redeemable.maxBuyDate, veryFarDate, "Max buy date is incorrect!");
        assert.equal(redeemable.redeemDate, veryFarDatePlusOneYear, "Redeem Time is incorrect!");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible to create a redemable if a user is not CLevel', async ()=> {
        assert.ok(await tUtils.shouldFail(async ()=>{
            await createRedeemable(0, baseYummyCost, baseYummyIncrement, veryFarDate, veryFarDatePlusOneYear, accounts[1]);
        }), "Create redeemable should fail because not CLevel");
        let numRedemables = await redeemableShop.numRedeemable();
        assert.equal(numRedemables, 0, "Incorrect number of redemables");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible to create two redemable with the same id', async ()=> {
        try{
            for(var i =0;i<2;++i){
                await createRedeemable(0, baseYummyCost, baseYummyIncrement, veryFarDate, veryFarDatePlusOneYear, accounts[0]);
            }
        }catch(ex){}
        let numRedemables = await redeemableShop.numRedeemable();
        assert.equal(numRedemables, 1);
    });

    it(tUtils.getTestNumber() + 'Should be possible to create 10 redeemable if the ids are correct', async ()=> {
        for(let i = 0; i < 10; ++i){
            await createRedeemable(i, baseYummyCost, baseYummyIncrement, veryFarDate, veryFarDatePlusOneYear, accounts[0]);
        }
        let numRedemables = await redeemableShop.numRedeemable();
        assert.equal(numRedemables, 10, "Incorrect number of redemables");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible to create a redemable if the ids are not sequential', async ()=> {
        //Note: I add the +1 to have a way to distinguish the first redemable from the second
        await createRedeemable(0, baseYummyCost + 1, baseYummyIncrement + 1, veryFarDate + 1, veryFarDatePlusOneYear +1, accounts[0]);

        assert.ok(await tUtils.shouldFail(async ()=>{
            await createRedeemable(2, baseYummyCost, baseYummyIncrement, veryFarDate, veryFarDatePlusOneYear, accounts[0]);
        }), "This line should not be reached, because an exception should occur");

        let numRedemables = await redeemableShop.numRedeemable();
        // Only one redemable should be created
        assert.equal(numRedemables, 1, "Incorrect number of redemables");
        let redeemable = await getRedeemable(0);

        assert.equal(redeemable.id, 0, "Incorrect id");
        assert.equal(redeemable.basePrice, baseYummyCost + 1, "Base price is incorrect!");
        assert.equal(redeemable.increment, baseYummyIncrement + 1, "Increment is incorrect!");
        assert.equal(redeemable.numUnitsSold, 0, "Incorrect num yummies sold");
        assert.equal(redeemable.maxBuyDate, veryFarDate + 1, "Max buy date is incorrect!");
        assert.equal(redeemable.redeemDate, veryFarDatePlusOneYear + 1, "Redeem Time is incorrect!");
    });

    ///////////////////////////////////////////////////////////////////////
    //                      CHANGE BASE PRICE                            //
    ///////////////////////////////////////////////////////////////////////
    it(tUtils.getTestNumber() + 'Should be possible to change the base price of a redeemable for CLevel users', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.basePrice, baseYummyCost, "Yummy price is incorrect");
        let newPrice = web3.toWei(0.1, "ether");
        await redeemableShop.setBasePrice(0, newPrice);
        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.basePrice, newPrice, "New yummy price is incorrect");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible for non CLevel to change the price', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.basePrice, baseYummyCost, "Incorrect base price!");
        let newPrice = web3.toWei(0.1, "ether");

        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.setBasePrice(0, newPrice, {
                from: accounts[1]
            });
        }), "This line should not be reached, because an exception should occur");

        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.basePrice, baseYummyCost, "Base price needs to be the same!");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible to change the base price of an id that does not exist', async () => {
        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.setBasePrice(1, 100, {
                from: accounts[0]
            });
        }), "This line should not be reached, because an exception should occur");
    });

    it(tUtils.getTestNumber() + 'Should be possible to set the base yummy price to 0 (free yummies)', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.basePrice, baseYummyCost, "Yummy price is incorrect");
        let newPrice = web3.toWei(0, "ether");
        await redeemableShop.setBasePrice(0, newPrice);
        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.basePrice, newPrice, "New yummy price is incorrect");
    });


    ///////////////////////////////////////////////////////////////////////
    //                       CHANGE INCREMENT                            //
    ///////////////////////////////////////////////////////////////////////

    it(tUtils.getTestNumber() + 'Should be possible to change the icrement of a redeemable for CLevel users', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.increment, baseYummyIncrement, "Yummy increment is incorrect");
        let newIncrement = web3.toWei(0.1, "ether");
        await redeemableShop.setIncrement(0, newIncrement);
        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.increment, newIncrement, "New yummy increment is incorrect");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible for non CLevel to change the increment', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.increment, baseYummyIncrement, "Incorrect increment!");
        let newIncrement = web3.toWei(0.1, "ether");

        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.setIncrement(0, newIncrement, {
                from: accounts[1]
            });
        }), "Non authorized user changed increment!");

        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.increment, baseYummyIncrement, "Increment is correct!");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible to change the increment of an id that does not exist', async () => {
        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.setIncrement(1, 100, {
                from: accounts[0]
            });
        }), "Changed increment of non existing redeemable");
    });

    it(tUtils.getTestNumber() + 'Should be possible to set the increment to 0', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.increment, baseYummyIncrement, "Yummy increment is incorrect");
        let newIncrement = web3.toWei(0, "ether");
        await redeemableShop.setIncrement(0, newIncrement);
        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.increment, newIncrement, "New increment is incorrect");
    });

    ///////////////////////////////////////////////////////////////////////
    //                      CHANGE MAX BUY DATE                          //
    ///////////////////////////////////////////////////////////////////////

    it(tUtils.getTestNumber() + 'Should be possible to change the max buy date of a redeemable', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.maxBuyDate, veryFarDate, "Initial max buy date is incorrect");
        let newMaxBuyDate = veryFarDate + 10;
        await redeemableShop.setMaxBuyDate(0, newMaxBuyDate);
        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.maxBuyDate, newMaxBuyDate, "New Yummy Max buy date is incorrect!");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible for non CLevel to change the max buy date', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.maxBuyDate, veryFarDate, "Initial max buy date is incorrect!");
        let newMaxBuyDate = veryFarDate + 10;

        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.setMaxBuyDate(0, newMaxBuyDate, {
                from: accounts[1]
            });
        }), "Non authorized user changed max buy date");

        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.maxBuyDate, veryFarDate, "New max buy date is incorrect!");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible to change the max buy date of an id that does not exist', async () => {
        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.setMaxBuyDate(1, veryFarDatePlusOneYear, {
                from: accounts[0]
            });
        }), "Changed max date of non existing redeemable");
    });

    ///////////////////////////////////////////////////////////////////////
    //                       CHANGE REDEEM DATE                          //
    ///////////////////////////////////////////////////////////////////////

    it(tUtils.getTestNumber() + 'Should be possible to change the reddem date of a redeemable', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.redeemDate, veryFarDatePlusOneYear, "Initial redeem date is incorrect");
        let newRedeemDate = veryFarDate + 10;
        await redeemableShop.setRedeemDate(0, newRedeemDate);
        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.redeemDate, newRedeemDate, "New Yummy redeem date is incorrect!");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible for non CLevel to change the reddeem date', async () => {
        let redeemableInfo1 = await createRedeemableAndGet(accounts[0], 0);
        assert.equal(redeemableInfo1.redeemDate, veryFarDatePlusOneYear, "Initial redeem date is incorrect!");
        let newRedeemDate = veryFarDate + 10;

        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.setRedeemDate(0, newRedeemDate, {
                from: accounts[1]
            });
        }), "New Redeem date changed by a non authorized user");

        let redeemableInfo2 = await getRedeemable(0);
        assert.equal(redeemableInfo2.redeemDate, veryFarDatePlusOneYear, "New max buy date is incorrect!");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible to change the redeem date of an id that does not exist', async () => {
        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.setRedeemDate(1, veryFarDatePlusOneYear + 15, {
                from: accounts[0]
            });
        }), "Redeem date changed for a non existing redeemable");
    });

    ///////////////////////////////////////////////////////////////////////
    //                      CHANGE REDEEM LOGIC                          //
    ///////////////////////////////////////////////////////////////////////


    it(tUtils.getTestNumber() + 'It should NOT be possible to set a new redeem logic if the contract does not implement redeem logic', async () => {
        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.setRedeemLogic(accounts[2]);
        }), "Added a user as redeem logic contract!");
        let logicAddress = await redeemableShop.redeemLogic();
        assert.equal(0, logicAddress, "Address should be 0");
    });
});

///////////////////////////////////////////////////////////////////////
//                            GIVEAWAY                               //
///////////////////////////////////////////////////////////////////////
contract('Redeemable Shop (Redeem Function)', async accounts =>{
    
    let CFO = accounts[2];
    let receiver = accounts[3];
    let redeemableInfo;

    beforeEach('setup contract for each test', async () => {
        redeemableShop = await RedeemableShop.new({from: accounts[0]});
        await redeemableShop.setCFO(CFO);
        redeemableInfo = await createRedeemableAndGet(accounts[0], 0);
    });

    it(tUtils.getTestNumber() + "It should be possible to giveaway 1 yummy and price should remain the same ", async ()=> {
        
        // Get the initial number of redemables for the buyer
        let initialNumRedeemable = await redeemableShop.numOwnedRedeemable(receiver, 0);
        let initialPrice = await redeemableShop.redeemPrice(0);
        
        // GiveAway
        await redeemableShop.giveawayRedeemable(0, 1, receiver, {from: CFO});

        // Get the initial number of redemables for the buyer
        let finalNumber = await redeemableShop.numOwnedRedeemable(receiver, 0);
        let finalPrice = await redeemableShop.redeemPrice(0);

        assert.ok(initialPrice.eq(finalPrice), "Price should remain the same");
        assert.equal(initialNumRedeemable.toNumber() + 1, finalNumber.toNumber(), "Incorrect amount of redeemable");
    });

    it(tUtils.getTestNumber() + "It should be possible to giveaway different quantities of yummies of each race", async ()=> {
        
        // Create 2 more redeemables
        await createRedeemableAndGet(accounts[0], 1);
        await createRedeemableAndGet(accounts[0], 2);

        let initialPriceRace0 = await redeemableShop.redeemPrice(0);
        let initialPriceRace1 = await redeemableShop.redeemPrice(1);
        let initialPriceRace2 = await redeemableShop.redeemPrice(2);

        // Get the initial number of redemables for the buyer
        let initialNumRace0 = await redeemableShop.numOwnedRedeemable(receiver, 0);
        let initialNumRace1 = await redeemableShop.numOwnedRedeemable(receiver, 1);
        let initialNumRace2 = await redeemableShop.numOwnedRedeemable(receiver, 2);

        // GiveAway
        await redeemableShop.giveawayRedeemable(0, 1, receiver, {from: CFO});
        await redeemableShop.giveawayRedeemable(1, 2, receiver, {from: CFO});
        await redeemableShop.giveawayRedeemable(2, 3, receiver, {from: CFO});

        // Get the initial number of redemables for the buyer
        let finalNumRace0 = await redeemableShop.numOwnedRedeemable(receiver, 0);
        let finalNumRace1 = await redeemableShop.numOwnedRedeemable(receiver, 1);
        let finalNumRace2 = await redeemableShop.numOwnedRedeemable(receiver, 2);

        let finalPriceRace0 = await redeemableShop.redeemPrice(0);
        let finalPriceRace1 = await redeemableShop.redeemPrice(1);
        let finalPriceRace2 = await redeemableShop.redeemPrice(2);

        assert.equal(initialNumRace0.toNumber() + 1, finalNumRace0.toNumber(), "Incorrect amount of redeemable race 0");
        assert.equal(initialNumRace1.toNumber() + 2, finalNumRace1.toNumber(), "Incorrect amount of redeemable race 1");
        assert.equal(initialNumRace2.toNumber() + 3, finalNumRace2.toNumber(), "Incorrect amount of redeemable race 2");
        
        assert.ok(initialPriceRace0.eq(finalPriceRace0), "Price should remain the same for race 0");
        assert.ok(initialPriceRace1.eq(finalPriceRace1), "Price should remain the same for race 1");
        assert.ok(initialPriceRace2.eq(finalPriceRace2), "Price should remain the same for race 2");
    });

    async function performGiveAwayWithBadParameters(raceId, amount, receiver, sender, message){
        
        let initialPriceRace = await redeemableShop.redeemPrice(0);
        
        // Get the initial number of redemables for the buyer
        let initialNumRedeemable = await redeemableShop.numOwnedRedeemable(receiver, 0);

        // Try to giveaway 
        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.giveawayRedeemable(raceId, amount, receiver, {from: sender });
        }), message);
        

        // Get the initial number of redemables for the buyer
        let finalNumber = await redeemableShop.numOwnedRedeemable(receiver, 0);
        let finalPriceRace = await redeemableShop.redeemPrice(0);

        assert.equal(initialNumRedeemable.toNumber(), finalNumber.toNumber(), "Incorrect amount of redeemable");
        assert.ok(initialPriceRace.eq(finalPriceRace), "Price should remain the same");
    }

    it(tUtils.getTestNumber() + "It should NOT be possible to giveaway yummies if not CLevel ", async ()=> {
        await performGiveAwayWithBadParameters(0, 1, receiver, receiver, "Non privileged user managed to steal one yummy");
    });

    it(tUtils.getTestNumber() + "It should NOT be possible to giveaway yummies quantity is 0", async ()=> {
        await performGiveAwayWithBadParameters(0, 0, receiver, CFO,  "Incorrect quantity given away");
    });

    it(tUtils.getTestNumber() + "It should NOT be possible to giveaway if race is incorrect", async ()=> {
        await performGiveAwayWithBadParameters(10, 1, receiver, CFO,  "Incorrect race id");
    });

    it(tUtils.getTestNumber() + "It should NOT be possible if contract is paused", async ()=> {
        await redeemableShop.pause({from: accounts[0]});
        await performGiveAwayWithBadParameters(0, 1, receiver, CFO, "CFO managed to giveaway yummies even if the contract was paused");
    });
});

contract('Redeemable Shop (Buy Function)', async accounts => {

    let CFO = accounts[2];
    let buyer = accounts[3];
    let initialRedeemableStatus;
    let initialCFOBalance;
    let initialRedeemPrice;
    let increment;
    let initialOwnedRedeemables;
    let initialBuyerBalance;

    async function addGasExpensesToRedeemPrice(transactionHash, price){
        let expendInGas = await tUtils.getGasExpensesForTransaction(transactionHash);
        return price.add(expendInGas);
    }

    beforeEach('setup contract for each test', async () => {
        redeemableShop = await RedeemableShop.new({from: accounts[0]});
        await redeemableShop.setCFO(CFO);
        initialRedeemableStatus = await createRedeemableAndGet(accounts[0], 0);

        initialCFOBalance = await web3.eth.getBalance(CFO);
        initialRedeemPrice = await redeemableShop.redeemPrice(0);
        increment = initialRedeemableStatus.increment;
        initialOwnedRedeemables = await redeemableShop.numOwnedRedeemable(buyer, 0);
        initialBuyerBalance = await web3.eth.getBalance(buyer);
    });

    ///////////////////////////////////////////////////////////////////////
    //                         BUY REDEEMABLE                            //
    ///////////////////////////////////////////////////////////////////////

    function initialBalancesAndBuyCostsCheck(){
        assert.equal(initialRedeemableStatus.numUnitsSold, 0, "Initial number of sold redeemables should be 0");
        assert.equal(initialOwnedRedeemables, 0, "Initial number of redemables for user should be 0");
        assert.equal(initialRedeemPrice, baseYummyCost, "Initial Redeem Price is incorrect!");
    }

    async function afterSuccessfullBuyChecks(transactionInfo){
        let redeemableStatus = await getRedeemable(0);
        let updatedRedeemPrice = await redeemableShop.redeemPrice(0);
        let ownedRedeemables = await redeemableShop.numOwnedRedeemable(buyer, 0);
        let updatedCFOBalance = await web3.eth.getBalance(CFO);
        let updateBuyerBalance = await web3.eth.getBalance(buyer);

        let expectedBuyerBalance = initialBuyerBalance.sub(await addGasExpensesToRedeemPrice(transactionInfo['tx'], initialRedeemPrice));

        assert.equal(redeemableStatus.numUnitsSold, 1, "Incorrect number of units sold");
        assert.equal(ownedRedeemables, 1, "Incorrect number of redeemables after buy");
        assert.ok(updatedRedeemPrice.eq(initialRedeemPrice.add(increment)), "Incorrect new price");
        assert.ok(updatedCFOBalance.eq(initialCFOBalance.add(initialRedeemPrice)), "Incorrect new balance for CFO");
        assert.ok(updateBuyerBalance.eq(expectedBuyerBalance), "Expected balance is incorrect after change");
    }

    it(tUtils.getTestNumber() + 'Should be possible to buy a redeemable and the balances should be correct', async () => {
        initialBalancesAndBuyCostsCheck();
        let transactionInfo = await redeemableShop.buyRedeemable(0, {from: buyer, value: initialRedeemPrice.add(increment.mul(10))});
        await afterSuccessfullBuyChecks(transactionInfo);
    });


    it(tUtils.getTestNumber() + 'Should be possible to buy a redeemable with the exact ether ammount (Risky for the user but possible)', async () => {
        initialBalancesAndBuyCostsCheck();
        let transactionInfo = await redeemableShop.buyRedeemable(0, {from: buyer, value: initialRedeemPrice});
        await afterSuccessfullBuyChecks(transactionInfo);
    });

    /**
    * Computes the price of n ammounts of redeems in a certain period
    * @param {How many redeemables have been bought before} numberOfPreviousPurchases
    * @param {How many purchases are going to be made} numPurchases
    * @param {Current base cost} baseCost
    * @param {Current increment} increment
    */
    function getPriceOfNumYummyPurchases(numberOfPreviousPurchases, numPurchases, baseCost, increment){
        let price = web3.toBigNumber('0');
        let baseCostBN = web3.toBigNumber(baseCost);
        let incrementBN = web3.toBigNumber(increment);
        for(var i=numberOfPreviousPurchases; i < numberOfPreviousPurchases + numPurchases; ++i){
            price = price.add(baseCostBN.add(incrementBN.mul(i)));
        }
        return price;
    }

    function isBigNumberBetween(current, minNumber, maxNumber){
        return current.gt(minNumber) && current.lt(maxNumber);
    }

    it(tUtils.getTestNumber() + 'Should NOT be possible to buy a redeemable after the max buy date', async () => {
        initialBalancesAndBuyCostsCheck();

        // Buy one redeemable
        let transactionInfo = await redeemableShop.buyRedeemable(0, {from: buyer, value: initialRedeemPrice.add(increment.mul(10))});
        await afterSuccessfullBuyChecks(transactionInfo);

        // Change the buy date to now -10 seconds
        await redeemableShop.setMaxBuyDate(0, tUtils.getNowUnixTimestamp() -10);

        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.buyRedeemable(0, {from: buyer, value: initialRedeemPrice.add(increment.mul(10))});
        }), "Transaction 2 should fail due to max date");

        let secondRedeemPrice = await redeemableShop.redeemPrice(0);

        // Change the buy date to now +10 seconds
        await redeemableShop.setMaxBuyDate(0, tUtils.getNowUnixTimestamp() + 10);
        await redeemableShop.buyRedeemable(0, {from: buyer, value: initialRedeemPrice.add(increment.mul(10))});

        let redeemableStatus = await getRedeemable(0);
        let updatedRedeemPrice = await redeemableShop.redeemPrice(0);
        let ownedRedeemables = await redeemableShop.numOwnedRedeemable(buyer, 0);
        let updatedCFOBalance = await web3.eth.getBalance(CFO);
        let updateBuyerBalance = await web3.eth.getBalance(buyer);

        let priceOf2YummyPurchases = getPriceOfNumYummyPurchases(0, 2, baseYummyCost, baseYummyIncrement);
        let priceOf3YummyPurchases = getPriceOfNumYummyPurchases(0, 3, baseYummyCost, baseYummyIncrement);

        let expectedCFOBalance = initialCFOBalance.add(priceOf2YummyPurchases);

        assert.equal(redeemableStatus.numUnitsSold, 2, "Incorrect number of units sold");
        assert.equal(ownedRedeemables, 2, "Incorrect number of redeemables after buy");
        assert.ok(updatedRedeemPrice.eq(initialRedeemPrice.add(increment.add(increment))), "Incorrect new price");
        assert.ok(updatedCFOBalance.eq(expectedCFOBalance), "Incorrect new balance for CFO");

        // NOTE: We know that updateBuyerBalance should be 2 yummy redeems - 3 gas feees, so it needs to be between 2 and 3 yummy redeems
        assert.ok(isBigNumberBetween(updateBuyerBalance, initialBuyerBalance.sub(priceOf3YummyPurchases), initialBuyerBalance.sub(priceOf2YummyPurchases)), "Buyer balance should be somewhere between 2 yummy redeems and 3");

    });

    it(tUtils.getTestNumber() + 'Should NOT be possible to buy a redeemable that does not exist', async () => {
        initialBalancesAndBuyCostsCheck();

        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.buyRedeemable(1, {from: buyer, value: initialRedeemPrice.add(increment.mul(10))});
        }), "Transaction should fail due to non existing redeemable");

        // Everything should remain the same
        initialBalancesAndBuyCostsCheck();
        let updatedCFOBalance = await web3.eth.getBalance(CFO);
        assert.ok(initialCFOBalance.eq(updatedCFOBalance), "CFO Should remain the same");
    });

    it(tUtils.getTestNumber() + 'Should NOT be possible to buy a redeemable if there is not enought money send', async () => {
        initialBalancesAndBuyCostsCheck();

        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.buyRedeemable(0, {from: buyer, value: initialRedeemPrice.sub(1)});
        }), "Transaction should fail due to non enough money sent");

        // This needs to be still correct
        initialBalancesAndBuyCostsCheck();
        let updatedCFOBalance = await web3.eth.getBalance(CFO);
        assert.ok(initialCFOBalance.eq(updatedCFOBalance), "CFO balance Should remain the same");
    });

    async function performNumPurchasesWithExactMoney(previousPurchases, numPurchases, basePrice, increment){
        let moneySpendInGasFees = web3.toBigNumber('0');
        let baseCostToBN = web3.toBigNumber(basePrice);
        let incrementToBN = web3.toBigNumber(increment);
        for(var i = 0; i < numPurchases; i++){
            let currentPrice = await redeemableShop.redeemPrice(0);
            let expectedPrice = baseCostToBN.add(incrementToBN.mul(previousPurchases + i));
            assert.ok(currentPrice.eq(expectedPrice), "Expected and current price should be the same");
            // Try to buy each redeemable with the expected price after a buy
            let transaction = await redeemableShop.buyRedeemable(0, {from: buyer, value: expectedPrice});
            moneySpendInGasFees = moneySpendInGasFees.add(await tUtils.getGasExpensesForTransaction(transaction['tx']));
        }
        return moneySpendInGasFees;
    }

    it(tUtils.getTestNumber() + 'Redeem price should be computed correctly after each buy', async () => {

        // Perform 10 purchases using always the exact money needed to buy
        let moneySpendInGasFees = await performNumPurchasesWithExactMoney(0, 10, baseYummyCost, baseYummyIncrement);

        let redeemableStatus = await getRedeemable(0);
        let updatedCFOBalance = await web3.eth.getBalance(CFO);
        let updateBuyerBalance = await web3.eth.getBalance(buyer);
        let ownedRedeemables = await redeemableShop.numOwnedRedeemable(buyer, 0);

        assert.equal(redeemableStatus.numUnitsSold, 10, "Num units sold needs to be 10");
        assert.equal(ownedRedeemables, 10, "Num owned redeemables should be 10 for specie 0");

        let etherExpendInYummies = getPriceOfNumYummyPurchases(0, 10, baseYummyCost, baseYummyIncrement);
        let expectedBuyerBalance = initialBuyerBalance.sub(moneySpendInGasFees.add(etherExpendInYummies));
        assert.ok(expectedBuyerBalance.eq(updateBuyerBalance), "Buyer balance is incorrect!");

        let expectedCFOBalance = initialCFOBalance.add(etherExpendInYummies);
        assert.ok(updatedCFOBalance.eq(expectedCFOBalance), "CF0 balance is incorrect!");
    });


    async function prurchaseAndTestPriceComputation(numPreviousPurchases, basePrice, baseIncrement, numPurchases){

        let currentRedeemPrice = await redeemableShop.redeemPrice(0);
        let expectedRedeemPrice = getPriceOfNumYummyPurchases(numPreviousPurchases, 1, basePrice, baseIncrement);

        assert.ok(currentRedeemPrice.eq(expectedRedeemPrice), "Price is incorrect after change");

        // Perform 3 purchases and check if everything is correct
        let etherSpendInGas = await performNumPurchasesWithExactMoney(numPreviousPurchases, numPurchases, basePrice, baseIncrement);
        let etherExpendInYummies = getPriceOfNumYummyPurchases(numPreviousPurchases, numPurchases, basePrice, baseIncrement);

        return {
            etherExpendInYummies: web3.toBigNumber(etherExpendInYummies),
            etherExpendInGasFees: web3.toBigNumber(etherSpendInGas)
        }
    }

    async function checksAfterPriceChanges(buysPerIteration, priceArray, totalEtherExpendInYummies, totalEtherExpendInGas){
        let expectedCFOEther = initialCFOBalance.add(totalEtherExpendInYummies);
        let currentCFOBalance = await web3.eth.getBalance(CFO);
        assert.ok(currentCFOBalance.eq(expectedCFOEther), "Incorrect CFO ether after purchases");

        let expectedBuyerBalance = initialBuyerBalance.sub(totalEtherExpendInYummies.add(totalEtherExpendInGas));
        let currentBuyerBalance =  await web3.eth.getBalance(buyer);
        assert.ok(expectedBuyerBalance.eq(currentBuyerBalance), "Incorrect buyer balance");

        assert.equal(await redeemableShop.numOwnedRedeemable(buyer, 0), buysPerIteration * priceArray.length, "Incorrect number of redeemables for buyer");
    }

    it(tUtils.getTestNumber() + 'It should be possible to change the redeem base price and the computations need to be correct', async () => {

        let expectedInitialPrice = baseYummyCost;
        let realInitialPrice = await redeemableShop.redeemPrice(0);
        assert.ok(realInitialPrice.eq(expectedInitialPrice), "Initial price is incorrect");

        let basePriceArray = [0.25, 0, 1.2, 0.043];
        let totalEtherExpendInYummies = web3.toBigNumber(0);
        let totalEtherExpendInGas = web3.toBigNumber(0);
        let buysPerIteration = 3;

        for(let i = 0; i < basePriceArray.length; i++){
            // Change the increment once
            let newBasePrice = web3.toWei(basePriceArray[i], 'ether');
            await redeemableShop.setBasePrice(0, newBasePrice);

            let costsBuy = await prurchaseAndTestPriceComputation(i * buysPerIteration, newBasePrice, baseYummyIncrement, buysPerIteration);
            totalEtherExpendInYummies = totalEtherExpendInYummies.add(costsBuy.etherExpendInYummies);
            totalEtherExpendInGas = totalEtherExpendInGas.add(costsBuy.etherExpendInGasFees);
        }

        await checksAfterPriceChanges(buysPerIteration, basePriceArray, totalEtherExpendInYummies, totalEtherExpendInGas);

    });

    it(tUtils.getTestNumber() + 'It should be possible to change the redeem increment and the computations need to be correct', async () => {
        let expectedInitialPrice = baseYummyCost;
        let realInitialPrice = await redeemableShop.redeemPrice(0);
        assert.ok(realInitialPrice.eq(expectedInitialPrice), "Initial price is incorrect");

        let increases = [0.25, 0, 0.12, 0.0017];
        let totalEtherExpendInYummies = web3.toBigNumber(0);
        let totalEtherExpendInGas = web3.toBigNumber(0);
        let buysPerIteration = 3;

        for(let i = 0; i < increases.length; i++){
            // Change the increment once
            let newIncrement = web3.toWei(increases[i], 'ether');
            await redeemableShop.setIncrement(0, newIncrement);

            let costsBuy = await prurchaseAndTestPriceComputation(i * buysPerIteration, baseYummyCost, newIncrement, buysPerIteration);
            totalEtherExpendInYummies = totalEtherExpendInYummies.add(costsBuy.etherExpendInYummies);
            totalEtherExpendInGas = totalEtherExpendInGas.add(costsBuy.etherExpendInGasFees);
        }

        await checksAfterPriceChanges(buysPerIteration, increases, totalEtherExpendInYummies, totalEtherExpendInGas);
    });

    it(tUtils.getTestNumber() + 'It should not be possible to buy a reddemable if the contract is paused', async () => {

        await redeemableShop.pause();

        assert.ok(await tUtils.shouldFail(async ()=>{
            await redeemableShop.buyRedeemable(0, {from: buyer, value: baseYummyCost});
        }), "This should't be reached because contract paused");

        assert.equal(await redeemableShop.numOwnedRedeemable(accounts[0], 0), 0, "Buyer's number of redeemable should be 0");
    });
});


contract('Redeemable Shop (Buy Function multiple species)', async accounts => {

    let CFO;
    let intialCFOBalance;

    beforeEach('setup contract for each test', async () => {
        redeemableShop = await RedeemableShop.new({from: accounts[0]});
        CFO = accounts[2];
        initialCFOBalance = await web3.eth.getBalance(CFO);
        await redeemableShop.setCFO(CFO);
    });

    it(tUtils.getTestNumber() + 'It should be possible to buy some quantities of 10 different species for 5 different users and balances should be correct', async () => {

        let numPurchases = 10;
        let numYummies = 10;

        let buyers = [];
        let yummies = [];

        // Create 10 redeemable
        for(let i = 0; i < numYummies; ++i){
            let basePrice = web3.toWei(i * 0.01, 'ether');
            let increase = web3.toWei(i * 0.001, 'ether');
            yummies.push({
                id: i,
                basePrice: web3.toBigNumber(basePrice),
                increase: web3.toBigNumber(increase),
                numUnitsSold: 0
            });
            await createRedeemable(i, basePrice, increase, veryFarDate, veryFarDatePlusOneYear, accounts[0]);
        }

        assert.equal(await redeemableShop.numRedeemable(), 10, "Incorrect number of redeemable!");

        // Prepare 5 buyers
        for(let i = 4; i < 9; ++i){
            buyers.push({
                address: accounts[i],
                yummiesBought: new Array(yummies.length).fill(0),
                initialBalance: web3.toBigNumber(await web3.eth.getBalance(accounts[i])),
                etherSpendInGas: web3.toBigNumber(0),
                etherSpendInYummies: web3.toBigNumber(0)
            });
        }

        for(var i = 0; i < numPurchases; i++){
            let yummyToBuyId = Math.floor(Math.random() * numYummies);
            let buyerID = Math.floor(Math.random() * 5);

            let yummyInfo = yummies[yummyToBuyId];
            let selectedBuyerInfo = buyers[buyerID];

            // Compute theorical Price for yummy
            let theoricalYummyPrice = yummyInfo.basePrice.add(yummyInfo.increase.mul(yummyInfo.numUnitsSold));
            let realYummyPrice = await redeemableShop.redeemPrice(yummyToBuyId);
            assert.ok(theoricalYummyPrice.eq(realYummyPrice), "Predicted and real price should be the same! " + theoricalYummyPrice.toString() + " != " + realYummyPrice.toString());

            // Perform the purchase
            let transaction;
            // Use exact price
            if(i % 2 == 0){
                transaction = await redeemableShop.buyRedeemable(yummyToBuyId, {from: selectedBuyerInfo.address, value: theoricalYummyPrice});
            }else{ // Use more ether (Like this we test also the change functionality)
                transaction = await redeemableShop.buyRedeemable(yummyToBuyId, {from: selectedBuyerInfo.address, value: web3.toWei(5, 'ether')});
            }

            // Update the values in order to perform the post checks
            let etherSpendInTransactionGas = await tUtils.getGasExpensesForTransaction(transaction.tx);
            ++yummyInfo.numUnitsSold;
            ++selectedBuyerInfo.yummiesBought[yummyToBuyId];
            selectedBuyerInfo.etherSpendInGas = selectedBuyerInfo.etherSpendInGas.add(etherSpendInTransactionGas);
            selectedBuyerInfo.etherSpendInYummies = selectedBuyerInfo.etherSpendInYummies.add(theoricalYummyPrice);
        }

        let expectedCFOBalance = web3.toBigNumber(initialCFOBalance);

        for(let buyerId = 0; buyerId < buyers.length; ++buyerId){
            let bInfo = buyers[buyerId];

            // Compute buyer balance
            let expectedBalance = bInfo.initialBalance.sub(bInfo.etherSpendInYummies.add(bInfo.etherSpendInGas));
            let realBalance = await web3.eth.getBalance(bInfo.address);
            assert.ok(expectedBalance.eq(realBalance), "Incorrect balance for buyer " + buyerId + " Expected: " + expectedBalance + " Real: " + realBalance);
            expectedCFOBalance = expectedCFOBalance.add(bInfo.etherSpendInYummies);

            // Compute expected yummies bought for selected user
            for(let i = 0; i < yummies.length; ++i){
                let expectedNumYummies = bInfo.yummiesBought[i];
                let realYummies = await redeemableShop.numOwnedRedeemable(bInfo.address, i);
                assert.equal(realYummies, expectedNumYummies, "Buyer with id: " + buyerId + "Should have " + expectedNumYummies + "of id " + i);
            }
        }

        // CFO Balance should be predictable and correct.
        let realCFOBalance = await web3.eth.getBalance(CFO);

        assert.ok(expectedCFOBalance.eq(realCFOBalance), "CFO balance is incorrect! " + expectedCFOBalance.toString() + " != " + realCFOBalance.toString());

        for(let i = 0; i < yummies.length; ++i){

            let yummyInfo = yummies[i];
            // Every unit sold should be predictable and correct
            let boughtYummies = yummyInfo.numUnitsSold;
            let redeemInfo = await getRedeemable(i);
            assert.equal(redeemInfo.numUnitsSold.toNumber(), boughtYummies, "Incorrect number of units sold for id " + i);

            // Every yummy price should be predictable and correct
            let theoricalYummyPrice = yummyInfo.basePrice.add(yummyInfo.increase.mul(yummyInfo.numUnitsSold));
            let realYummyPrice = await redeemableShop.redeemPrice(i);
            assert.ok(theoricalYummyPrice.eq(realYummyPrice), "Predicted and real price should be the same! " + theoricalYummyPrice.toString() + " != " + realYummyPrice.toString());
        }
    });
});
