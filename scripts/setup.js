// test/setup.js - Base test configuration and utilities
const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Contract ABI - Core functions only
const CONTRACT_ABI = [
    // View functions for constants
    "function MIN_STAKE() view returns (uint256)",
    "function SLASH_PERCENTAGE() view returns (uint256)",
    "function WITHDRAWAL_DELAY() view returns (uint256)",
    "function nextApiId() view returns (uint256)",
    "function oracle() view returns (address)",
    "function owner() view returns (address)",
    
    // Core functions
    "function registerAPI(string endpoint, string description, uint256 pricePerCall) payable",
    "function payForAPICall(uint256 apiId) payable",
    "function getAPI(uint256 apiId) view returns (tuple(uint256 id, string endpoint, string description, uint256 pricePerCall, uint256 stake, address provider, bool active, uint256 totalCalls, uint256 successfulCalls, uint256 createdAt))",
    
    // State tracking
    "function providerStakes(address) view returns (uint256)",
    
    // Events
    "event APIRegistered(uint256 indexed apiId, address indexed provider, string endpoint, uint256 stake)",
    "event APIPayment(uint256 indexed apiId, address indexed consumer, uint256 amount)"
];

class TestBase {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
        
        this.setupWallets();
    }

    setupWallets() {
        if (!CONTRACT_ADDRESS) {
            throw new Error('❌ Please set CONTRACT_ADDRESS in .env file');
        }
        
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.wallet1 = new ethers.Wallet(PRIVATE_KEY, this.provider);
        this.contract1 = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet1);
        
        // Create second wallet for consumer tests
        this.wallet2 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, this.provider);
        this.contract2 = this.contract1.connect(this.wallet2);
        
        console.log(`📋 Contract: ${CONTRACT_ADDRESS}`);
        console.log(`👤 Wallet 1: ${this.wallet1.address}`);
        console.log(`👤 Wallet 2: ${this.wallet2.address}`);
    }

    async runTest(testName, testFunction) {
        try {
            console.log(`\n🧪 ${testName}...`);
            await testFunction();
            console.log(`✅ PASSED: ${testName}`);
            this.results.passed++;
            return true;
        } catch (error) {
            console.log(`❌ FAILED: ${testName}`);
            console.log(`   Error: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`${testName}: ${error.message}`);
            return false;
        }
    }

    async expectRevert(promise, expectedMessage) {
        try {
            await promise;
            throw new Error('Expected transaction to revert but it succeeded');
        } catch (error) {
            if (error.message.includes('Expected transaction to revert')) {
                throw error;
            }
            
            if (expectedMessage && !error.message.toLowerCase().includes(expectedMessage.toLowerCase())) {
                console.warn(`   ⚠️  Expected "${expectedMessage}" but got "${error.message}"`);
            }
        }
    }

    findEvent(receipt, eventName) {
        return receipt.logs.find(log => {
            try {
                const parsed = this.contract1.interface.parseLog(log);
                return parsed.name === eventName;
            } catch {
                return false;
            }
        });
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    printResults() {
        const total = this.results.passed + this.results.failed;
        console.log(`\n📊 Results: ${this.results.passed}/${total} passed`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ Failures:');
            this.results.errors.forEach(error => console.log(`  • ${error}`));
        }
    }
}

module.exports = { TestBase, CONTRACT_ABI };