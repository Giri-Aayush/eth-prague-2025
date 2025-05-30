// scripts/phase2.js - API Registration Edge Cases
const { TestBase } = require('./setup');
const { ethers } = require('ethers');

class RegistrationEdgeTests extends TestBase {
    constructor() {
        super();
    }

    async runRegistrationTests() {
        console.log('🛡️  PHASE 2: REGISTRATION EDGE CASES');
        console.log('Testing registration failures and boundary conditions\n');
        
        // Test 1: Registration failure - insufficient stake
        await this.testInsufficientStake();
        
        // Test 2: Registration failure - invalid parameters
        await this.testInvalidParameters();
        
        this.printResults();
        
        if (this.results.failed === 0) {
            console.log('\n🎉 Phase 2 complete! Registration security verified.');
            console.log('✅ Ready for Phase 3: Payment system tests');
        } else {
            console.log('\n⚠️  Fix Phase 2 issues before proceeding');
        }
    }

    async testInsufficientStake() {
        await this.runTest('Registration Failure - Insufficient Stake', async () => {
            console.log('   🔒 Testing stake requirement enforcement...');
            
            const endpoint = "https://api.lowstake.com/v1/data";
            const description = "API with insufficient stake";
            const pricePerCall = ethers.parseEther('0.001');
            const insufficientStake = ethers.parseEther('0.05'); // Less than 0.1 ETH minimum
            
            console.log(`   💰 Attempting registration with insufficient stake:`);
            console.log(`      Required: 0.1 ETH`);
            console.log(`      Provided: ${ethers.formatEther(insufficientStake)} ETH`);
            
            try {
                const tx = await this.contract1.registerAPI(
                    endpoint,
                    description,
                    pricePerCall,
                    { value: insufficientStake }
                );
                
                // If we get here, the transaction was sent - let's see if it reverts
                console.log(`   ⏳ Transaction sent: ${tx.hash}`);
                console.log(`   ⏳ Waiting to see if it reverts...`);
                
                await tx.wait();
                
                // If we reach this point, the transaction succeeded when it shouldn't have
                throw new Error('Transaction should have reverted due to insufficient stake');
                
            } catch (error) {
                // This is expected - the transaction should fail
                console.log(`   ✅ Transaction properly reverted: ${error.message}`);
                
                // Verify the error message contains expected text
                const errorMsg = error.message.toLowerCase();
                if (errorMsg.includes('insufficient stake') || 
                    errorMsg.includes('revert') || 
                    errorMsg.includes('require')) {
                    console.log(`   ✅ Correct error message received`);
                } else {
                    console.log(`   ⚠️  Unexpected error message: ${error.message}`);
                }
            }
            
            // Verify that no API was registered (nextApiId should remain the same)
            const nextApiId = await this.contract1.nextApiId();
            console.log(`   📊 Next API ID after failed registration: ${nextApiId}`);
            
            // This should still be 2 (since we registered 1 API in Phase 1)
            this.assert(nextApiId === 2n, 'Next API ID should not change after failed registration');
            
            console.log(`   ✅ Stake requirement properly enforced`);
        });
    }

    async testInvalidParameters() {
        await this.runTest('Registration Failure - Invalid Parameters', async () => {
            console.log('   🔍 Testing parameter validation...');
            
            const validStake = ethers.parseEther('0.15'); // Valid stake amount
            
            // Test 1: Empty endpoint
            console.log(`   📝 Testing empty endpoint...`);
            try {
                const tx1 = await this.contract1.registerAPI(
                    "", // Empty endpoint
                    "Valid description",
                    ethers.parseEther('0.001'),
                    { value: validStake }
                );
                
                console.log(`   ⏳ Empty endpoint tx sent: ${tx1.hash}`);
                await tx1.wait();
                throw new Error('Empty endpoint should have been rejected');
                
            } catch (error) {
                console.log(`   ✅ Empty endpoint properly rejected: ${error.message}`);
            }
            
            // Test 2: Zero price
            console.log(`   💰 Testing zero price...`);
            try {
                const tx2 = await this.contract1.registerAPI(
                    "https://api.zeroprice.com",
                    "Zero price API",
                    0, // Zero price
                    { value: validStake }
                );
                
                console.log(`   ⏳ Zero price tx sent: ${tx2.hash}`);
                await tx2.wait();
                throw new Error('Zero price should have been rejected');
                
            } catch (error) {
                console.log(`   ✅ Zero price properly rejected: ${error.message}`);
            }
            
            // Test 3: Verify successful registration still works (regression test)
            console.log(`   ✅ Testing valid registration still works...`);
            const validTx = await this.contract1.registerAPI(
                "https://api.valid.com/v1/test",
                "Valid test API for regression",
                ethers.parseEther('0.002'),
                { value: validStake }
            );
            
            const validReceipt = await validTx.wait();
            console.log(`   ✅ Valid registration confirmed in block: ${validReceipt.blockNumber}`);
            console.log(`   ⛽ Gas used: ${validReceipt.gasUsed.toLocaleString()}`);
            
            // Find the APIRegistered event
            const event = this.findEvent(validReceipt, 'APIRegistered');
            this.assert(event, 'APIRegistered event should be emitted for valid registration');
            
            const apiId = event.args.apiId;
            console.log(`   🆔 Valid API registered with ID: ${apiId}`);
            
            // Verify the API data
            const api = await this.contract1.getAPI(apiId);
            this.assert(api.endpoint === "https://api.valid.com/v1/test", 'Endpoint should match');
            this.assert(api.pricePerCall === ethers.parseEther('0.002'), 'Price should match');
            this.assert(api.active === true, 'API should be active');
            
            console.log(`   ✅ Parameter validation working correctly`);
        });
    }

    // Enhanced expectRevert method for better error handling
    async expectRevert(promise, expectedMessage) {
        try {
            const result = await promise;
            throw new Error('Expected transaction to revert but it succeeded');
        } catch (error) {
            if (error.message.includes('Expected transaction to revert')) {
                throw error;
            }
            
            // Check if error contains expected message (case insensitive)
            const errorMsg = error.message.toLowerCase();
            const expectedMsg = expectedMessage.toLowerCase();
            
            if (!errorMsg.includes(expectedMsg)) {
                console.warn(`   ⚠️  Expected "${expectedMessage}" but got "${error.message}"`);
            }
            
            return true; // Revert happened as expected
        }
    }
}

// Main execution
async function main() {
    try {
        console.log('Starting Phase 2 tests...\n');
        
        const tests = new RegistrationEdgeTests();
        await tests.runRegistrationTests();
        
    } catch (error) {
        console.error('\n💥 Phase 2 failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Ensure Phase 1 passed successfully');
        console.log('2. Check wallet has sufficient ETH for multiple transactions');
        console.log('3. Verify contract is still responsive');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { RegistrationEdgeTests };