// test/phase1-foundation.js - Most critical foundation tests
const { TestBase } = require('./setup');
const { ethers } = require('ethers');

class FoundationTests extends TestBase {
    constructor() {
        super();
    }

    async runFoundationTests() {
        console.log('🏗️  PHASE 1: FOUNDATION TESTS');
        console.log('Testing the absolute basics that everything depends on\n');
        
        // Test 1: Contract deployment and constants
        await this.testContractConstants();
        
        // Test 2: Basic API registration
        await this.testBasicAPIRegistration();
        
        this.printResults();
        
        if (this.results.failed === 0) {
            console.log('\n🎉 Phase 1 complete! Foundation is solid.');
            console.log('✅ Ready for Phase 2: API Registration edge cases');
        } else {
            console.log('\n⚠️  Fix Phase 1 issues before proceeding');
        }
    }

    async testContractConstants() {
        await this.runTest('Contract Constants and Setup', async () => {
            // Check that contract is deployed and accessible
            const minStake = await this.contract1.MIN_STAKE();
            const slashPercentage = await this.contract1.SLASH_PERCENTAGE();
            const withdrawalDelay = await this.contract1.WITHDRAWAL_DELAY();
            const nextApiId = await this.contract1.nextApiId();
            const oracle = await this.contract1.oracle();
            const owner = await this.contract1.owner();
            
            console.log(`   📋 Contract Details:`);
            console.log(`      Min stake: ${ethers.formatEther(minStake)} ETH`);
            console.log(`      Slash %: ${slashPercentage}%`);
            console.log(`      Withdrawal delay: ${Number(withdrawalDelay) / 86400} days`);
            console.log(`      Next API ID: ${nextApiId}`);
            console.log(`      Oracle: ${oracle}`);
            console.log(`      Owner: ${owner}`);
            
            // Verify expected values
            this.assert(minStake === ethers.parseEther('0.1'), 'Min stake should be 0.1 ETH');
            this.assert(slashPercentage === 10n, 'Slash percentage should be 10%');
            this.assert(withdrawalDelay === 7n * 24n * 60n * 60n, 'Withdrawal delay should be 7 days');
            this.assert(nextApiId >= 1n, 'Next API ID should be at least 1');
            
            // Check wallet balances
            const balance1 = await this.provider.getBalance(this.wallet1.address);
            const balance2 = await this.provider.getBalance(this.wallet2.address);
            
            console.log(`   💰 Wallet Balances:`);
            console.log(`      Wallet 1: ${ethers.formatEther(balance1)} ETH`);
            console.log(`      Wallet 2: ${ethers.formatEther(balance2)} ETH`);
            
            // Fund wallet 2 if needed
            if (balance2 < ethers.parseEther('0.1')) {
                console.log(`   💸 Funding wallet 2...`);
                const fundTx = await this.wallet1.sendTransaction({
                    to: this.wallet2.address,
                    value: ethers.parseEther('0.2')
                });
                await fundTx.wait();
                console.log(`   ✅ Wallet 2 funded`);
            }
            
            this.assert(balance1 > ethers.parseEther('0.2'), 'Wallet 1 needs at least 0.2 ETH for testing');
        });
    }

    async testBasicAPIRegistration() {
        await this.runTest('Basic API Registration', async () => {
            const endpoint = "https://api.weather.com/v1/current";
            const description = "Real-time weather data API";
            const pricePerCall = ethers.parseEther('0.001'); // 0.001 ETH per call
            const stake = ethers.parseEther('0.15'); // 0.15 ETH stake (above minimum)
            
            console.log(`   📝 Registering API:`);
            console.log(`      Endpoint: ${endpoint}`);
            console.log(`      Price: ${ethers.formatEther(pricePerCall)} ETH per call`);
            console.log(`      Stake: ${ethers.formatEther(stake)} ETH`);
            
            // Check state before registration
            const nextIdBefore = await this.contract1.nextApiId();
            const stakeBefore = await this.contract1.providerStakes(this.wallet1.address);
            
            console.log(`   📊 Before registration:`);
            console.log(`      Next API ID: ${nextIdBefore}`);
            console.log(`      Provider stake: ${ethers.formatEther(stakeBefore)} ETH`);
            
            // Register the API
            const tx = await this.contract1.registerAPI(
                endpoint,
                description,
                pricePerCall,
                { value: stake }
            );
            
            console.log(`   ⏳ Transaction sent: ${tx.hash}`);
            console.log(`   ⏳ Waiting for confirmation...`);
            
            const receipt = await tx.wait();
            console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
            console.log(`   ⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
            
            // Check for APIRegistered event
            const event = this.findEvent(receipt, 'APIRegistered');
            this.assert(event, 'APIRegistered event should be emitted');
            
            const apiId = event.args.apiId;
            console.log(`   🆔 API registered with ID: ${apiId}`);
            
            // Verify API details
            const api = await this.contract1.getAPI(apiId);
            console.log(`   📋 API Details:`);
            console.log(`      ID: ${api.id}`);
            console.log(`      Endpoint: ${api.endpoint}`);
            console.log(`      Description: ${api.description}`);
            console.log(`      Price: ${ethers.formatEther(api.pricePerCall)} ETH`);
            console.log(`      Stake: ${ethers.formatEther(api.stake)} ETH`);
            console.log(`      Provider: ${api.provider}`);
            console.log(`      Active: ${api.active}`);
            console.log(`      Total calls: ${api.totalCalls}`);
            console.log(`      Successful calls: ${api.successfulCalls}`);
            
            // Assertions
            this.assert(api.endpoint === endpoint, 'Endpoint should match');
            this.assert(api.description === description, 'Description should match');
            this.assert(api.pricePerCall === pricePerCall, 'Price should match');
            this.assert(api.stake === stake, 'Stake should match');
            this.assert(api.provider === this.wallet1.address, 'Provider should match');
            this.assert(api.active === true, 'API should be active');
            this.assert(api.totalCalls === 0n, 'Total calls should be 0');
            this.assert(api.successfulCalls === 0n, 'Successful calls should be 0');
            
            // Check state after registration
            const nextIdAfter = await this.contract1.nextApiId();
            const stakeAfter = await this.contract1.providerStakes(this.wallet1.address);
            
            console.log(`   📊 After registration:`);
            console.log(`      Next API ID: ${nextIdAfter}`);
            console.log(`      Provider stake: ${ethers.formatEther(stakeAfter)} ETH`);
            
            this.assert(nextIdAfter === nextIdBefore + 1n, 'Next API ID should increment');
            this.assert(stakeAfter === stakeBefore + stake, 'Provider stake should increase');
            
            // Store API ID for future tests
            this.apiId = apiId;
        });
    }
}

// Main execution
async function main() {
    try {
        const tests = new FoundationTests();
        await tests.runFoundationTests();
    } catch (error) {
        console.error('\n💥 Phase 1 failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check CONTRACT_ADDRESS is set in .env');
        console.log('2. Ensure contract is deployed on Sepolia');
        console.log('3. Verify wallet has sufficient ETH');
        console.log('4. Check RPC_URL is working');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { FoundationTests };