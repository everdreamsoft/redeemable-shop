const fs = require('fs');
const tools = require('web3-utils');

String.prototype.splice = function(start, delCount, newSubStr) {
    return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
};

/**
* Used to make the time pass on the current blockchain
* (Usefull to test functions based on time)
* param duration time to pass in seconds
*/
const increaseBlockTime = async (duration) => {
    const id = Date.now()

    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [duration],
            id: id,
        }, err1 => {
            if (err1) return reject(err1)

            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_mine',
                id: id + 1,
            }, (err2, res) => {
                return err2 ? reject(err2) : resolve(res)
            })
        })
    })
}


let lastStateId = 0;
const saveState = async () => {
    lastStateId = await web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_snapshot",
        id: 0
    });
}

const revertState = async () => {

    await web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_revert",
        params: [lastStateId],
        id: 0
    });
}

let testNumber = 0;

/**
* Gets the current test number and increses it
*/
function getTestNumber() {
    return (++testNumber) + "- ";
}

/**
* Gets the current time in Universal Unix Timestamp
*/
function getNowUnixTimestamp() {
    return toUnixTimestamp(new Date());
}

/**
* Converts a date into Universal Linux Timestamp
*/
function toUnixTimestamp(date) {
    return Math.round(date / 1000);
}

/**
* Returns the exact ammount of gas in wei expend on a transaction
* @param {Hash of the transaction to calculate the price} transactionHash
*/
async function getGasExpensesForTransaction(transactionHash) {
    let transaction = await web3.eth.getTransaction(transactionHash);
    let transactionReceipt = await web3.eth.getTransactionReceipt(transactionHash);
    let gasUsed = transactionReceipt['gasUsed'];
    let gasPrice = transaction['gasPrice'];
    return gasPrice.mul(gasUsed);
}

/**
* Avoids test to crash if a function that should fail, fails and returns
* true if the fucntion failed and false if the function diddnt failed
*/
async function shouldFail(transaction) {
    try {
        await transaction();
        return false;
    } catch (ex) {
        return true;
    }
}


// Used to check what are the maximum values that a gen can have
// for every position
const gen0Max = {

    0: 0,
    1: 2,
    2: 5,

    3: 0,
    4: 2,
    5: 5,

    6: 0,
    7: 2,
    8: 5,

    9: 0,
    10: 2,
    11: 5,

    12: 0,
    13: 2,
    14: 5,

    15: 0,
    16: 2,
    17: 5,

    18: 0,
    19: 2,
    20: 5,
    
    21: 1,
}

// Avaliaible gen0 genes for flavours
const whiteListedGen0Genes = [0, 1, 2, 4, 5, 15, 16, 17, 18, 19, 20, 23, 24, 25, 29];

/**
 * Checks if a generation 0 genome resprects the initial contraints
 * @param { Gene Structure } gene 
 * @param { Gen0 Rance } testingRace 
 * @param { Log object used to get info and errors } toLog 
 */
function checkGen0GenomeConstraints(gene, testingRace, toLog){
    let numIncorrectGenes = 0;
    for(let j = 0; j < 23; j++){
        let geneNum = gene.bArray[j];
        // Check for gene defects
        let maxAllowedValue = gen0Max[j];
        maxAllowedValue = maxAllowedValue == 0 ? testingRace : maxAllowedValue;
        if(j <= 21){
            if(geneNum < 0 || geneNum > maxAllowedValue){
                ++numIncorrectGenes;
                toLog.errors.push("Out of range gene " + geneNum + " in position " + j + " of yummy with id " + gene.id);
            }
        }else if(j == 22){
            // Check that the gene is on the white list
            if(whiteListedGen0Genes.indexOf(geneNum) == -1){
                ++numIncorrectGenes;
                toLog.errors.push("Non whitelisted gene detected on gene " + geneNum + " in position " + j + " of yummy with id " + i);  
            }
        }
    }

    return numIncorrectGenes;
}

function BnToHexAndBArray(number){
    let h = tools.numberToHex(number);

    // Add one more 0 to have 64 characters (if not every byte will be offset)
    while(h.length < 66){
        h = h.splice(2, 0, "0");
    }
        
    let toBytes = tools.hexToBytes(h);

    return {bArray: toBytes, hex: h}
}

/**
 * Checks that all the genomes are correct and doesn't contain errors or
 * collisions
 * @param {Path to the generated genomes} genomesPath 
 * @param {Yummy race under test} testingRace 
 */
function computeGenesQuality(genomesPath, testingRace){

    var data = [];
    
    if(fs.existsSync(genomesPath)){
        data = JSON.parse(fs.readFileSync(genomesPath, 'utf8'));
    }
    
    let foundGenomes = {};
    let gene;
    let collisions = {};

    let collisionCounter = 0;
    let numIncorrectGenes = 0;

    let toLog = {
        info: [],
        errors: []
    }

    let genesToFind = [];
    let missingGenes = 0;
    for(let i = 0; i < 22; i++){
        genesToFind.push([]);
        for(let j = 0; j < gen0Max[i]; j++){
            genesToFind[i].push(j);
            missingGenes++;
        }
        if(gen0Max[i] == 0){
            genesToFind[i].push(testingRace);
        }
    }
    
    // Clone the whitelisted array
    genesToFind.push(whiteListedGen0Genes.slice(0));
    
    missingGenes += genesToFind[22].length;

    for(let i = 0; i < data.length; i++){
        gene = data[i];
        if(gene.hex in foundGenomes){
            collisionCounter++;
            if(gene.hex in collisions){
                collisions[gene.hex].push(gene);
            }else{
                collisions[gene.hex] = [gene];
            }
        }else{
            foundGenomes[gene.hex] = gene;
            // Try to find missing genes
            if(missingGenes > 0){
                for(let j = 0; j < genesToFind.length; j++){
                    let toFind = genesToFind[j];
                    let geneNum = gene.bArray[j];
                    let index = toFind.indexOf(geneNum);
                    if(index > -1){
                        toLog.info.push("Found gene " + geneNum + " in position " + j + " of yummy with id " + i);
                        toFind.splice(index, 1);
                        missingGenes--;
                    }
                }
            }
            numIncorrectGenes += checkGen0GenomeConstraints(gene, testingRace, toLog);
        }
    }

    if(missingGenes > 0){
        console.log(genesToFind);
    }

    return{
        numGenesChecked: data.length,
        numCollisions: collisionCounter,
        numMissing: missingGenes,
        numIncorrectGenes: numIncorrectGenes,
        toLog: toLog
    }
}

var testUtils = {
    increaseBlockTime: increaseBlockTime,
    getTestNumber: getTestNumber,
    getNowUnixTimestamp: getNowUnixTimestamp,
    toUnixTimestamp: toUnixTimestamp,
    shouldFail: shouldFail,
    getGasExpensesForTransaction: getGasExpensesForTransaction,
    saveState: saveState,
    revertState: revertState,
    computeGenesQuality: computeGenesQuality,
    checkGen0GenomeConstraints: checkGen0GenomeConstraints,
    BnToHexAndBArray:BnToHexAndBArray,
}

module.exports = testUtils;
