const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Getting DummyUpgradeUSDC contract ABI...");
    
    // Get ABI from compiled output
    const artifactPath = path.join(__dirname, '../artifacts/contracts/DummyUpgradeUSDC.sol/DummyUpgradeUSDC.json');
    
    try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        const abi = artifact.abi;
        const bytecode = artifact.bytecode;
        
        console.log("ABI retrieved successfully!");
        console.log("Number of ABI items:", abi.length);
        console.log("Bytecode size:", bytecode.length, "characters");
        
        // Save ABI to separate file
        const abiOutputPath = path.join(__dirname, '../abi/DummyUpgradeUSDC.json');
        
        // Ensure directory exists
        const abiDir = path.dirname(abiOutputPath);
        if (!fs.existsSync(abiDir)) {
            fs.mkdirSync(abiDir, { recursive: true });
        }
        
        // Save formatted ABI
        fs.writeFileSync(abiOutputPath, JSON.stringify(abi, null, 2));
        console.log("ABI saved to:", abiOutputPath);
        
        // Save complete artifact with metadata
        const completeOutputPath = path.join(__dirname, '../abi/DummyUpgradeUSDC_Complete.json');
        const completeArtifact = {
            contractName: "DummyUpgradeUSDC",
            abi: abi,
            bytecode: bytecode,
            compiler: artifact.compiler || "Unknown",
            networks: {},
            updatedAt: new Date().toISOString(),
            features: [
                "USDC Support",
                "Time-based Automation", 
                "Dual Reserve System",
                "SafeERC20 Integration"
            ]
        };
        
        fs.writeFileSync(completeOutputPath, JSON.stringify(completeArtifact, null, 2));
        console.log("Complete artifact saved to:", completeOutputPath);
        
        // Display main functions
        console.log("\n" + "=".repeat(60));
        console.log("MAIN FUNCTION LIST:");
        console.log("=".repeat(60));
        
        const functions = abi.filter(item => item.type === 'function');
        const events = abi.filter(item => item.type === 'event');
        const constructor = abi.filter(item => item.type === 'constructor');
        
        console.log(`\nFunctions (${functions.length}):`);
        functions.forEach((item, index) => {
            const inputs = item.inputs.map(input => `${input.type} ${input.name}`).join(', ');
            const outputs = item.outputs ? item.outputs.map(output => output.type).join(', ') : 'void';
            const stateMutability = item.stateMutability || 'nonpayable';
            
            console.log(`${index + 1}. ${item.name}(${inputs})`);
            console.log(`   Returns: ${outputs}`);
            console.log(`   State: ${stateMutability}`);
            console.log('');
        });
        
        // Display events
        console.log("=".repeat(60));
        console.log("EVENT LIST:");
        console.log("=".repeat(60));
        console.log(`\nEvents (${events.length}):`);
        events.forEach((item, index) => {
            const inputs = item.inputs.map(input => {
                const indexed = input.indexed ? ' indexed' : '';
                return `${input.type}${indexed} ${input.name}`;
            }).join(', ');
            console.log(`${index + 1}. ${item.name}(${inputs})`);
        });
        
        // Display constructor
        if (constructor.length > 0) {
            console.log("\n" + "=".repeat(60));
            console.log("CONSTRUCTOR:");
            console.log("=".repeat(60));
            const constructorInputs = constructor[0].inputs.map(input => 
                `${input.type} ${input.name}`
            ).join(', ');
            console.log(`constructor(${constructorInputs})`);
        }
        
        // Display USDC-specific functions
        console.log("\n" + "=".repeat(60));
        console.log("USDC-SPECIFIC FUNCTIONS:");
        console.log("=".repeat(60));
        
        const usdcFunctions = functions.filter(f => 
            f.name.toLowerCase().includes('usdc') || 
            f.name.includes('USDC') ||
            f.inputs.some(input => input.name.includes('USDC') || input.name.includes('usdc'))
        );
        
        usdcFunctions.forEach((item, index) => {
            const inputs = item.inputs.map(input => `${input.type} ${input.name}`).join(', ');
            console.log(`${index + 1}. ${item.name}(${inputs})`);
        });
        
        // Display automation functions
        console.log("\n" + "=".repeat(60));
        console.log("AUTOMATION FUNCTIONS:");
        console.log("=".repeat(60));
        
        const automationFunctions = functions.filter(f => 
            f.name.toLowerCase().includes('automation') || 
            f.name.includes('upkeep') ||
            f.name.includes('perform') ||
            f.name.includes('time')
        );
        
        automationFunctions.forEach((item, index) => {
            const inputs = item.inputs.map(input => `${input.type} ${input.name}`).join(', ');
            console.log(`${index + 1}. ${item.name}(${inputs})`);
        });
        
        // Display emergency functions
        console.log("\n" + "=".repeat(60));
        console.log("EMERGENCY FUNCTIONS:");
        console.log("=".repeat(60));
        
        const emergencyFunctions = functions.filter(f => 
            f.name.toLowerCase().includes('emergency') || 
            f.name.includes('pause') ||
            f.name.includes('recover')
        );
        
        emergencyFunctions.forEach((item, index) => {
            const inputs = item.inputs.map(input => `${input.type} ${input.name}`).join(', ');
            console.log(`${index + 1}. ${item.name}(${inputs})`);
        });
        
        // Generate function signatures for verification
        console.log("\n" + "=".repeat(60));
        console.log("FUNCTION SIGNATURES (for verification):");
        console.log("=".repeat(60));
        
        functions.forEach(func => {
            const signature = `${func.name}(${func.inputs.map(input => input.type).join(',')})`;
            console.log(`${func.name}: ${signature}`);
        });
        
        // Save function signatures
        const signaturesPath = path.join(__dirname, '../abi/DummyUpgradeUSDC_Signatures.json');
        const signatures = {};
        functions.forEach(func => {
            signatures[func.name] = `${func.name}(${func.inputs.map(input => input.type).join(',')})`;
        });
        
        fs.writeFileSync(signaturesPath, JSON.stringify(signatures, null, 2));
        console.log("\nFunction signatures saved to:", signaturesPath);
        
        // Display summary statistics
        console.log("\n" + "=".repeat(60));
        console.log("CONTRACT SUMMARY:");
        console.log("=".repeat(60));
        console.log("Total ABI items:", abi.length);
        console.log("Functions:", functions.length);
        console.log("Events:", events.length);
        console.log("Constructor:", constructor.length);
        console.log("View functions:", functions.filter(f => f.stateMutability === 'view').length);
        console.log("Pure functions:", functions.filter(f => f.stateMutability === 'pure').length);
        console.log("Payable functions:", functions.filter(f => f.stateMutability === 'payable').length);
        console.log("Non-payable functions:", functions.filter(f => f.stateMutability === 'nonpayable').length);
        
        // Check for USDC integration
        const hasUSDCSupport = functions.some(f => 
            f.name.includes('USDC') || 
            f.inputs.some(input => input.name.includes('USDC'))
        );
        
        const hasAutomation = functions.some(f => 
            f.name.includes('perform') || 
            f.name.includes('upkeep')
        );
        
        const hasEmergency = functions.some(f => 
            f.name.includes('emergency')
        );
        
        console.log("\nFeature Analysis:");
        console.log("✓ USDC Support:", hasUSDCSupport ? "YES" : "NO");
        console.log("✓ Time-based Automation:", hasAutomation ? "YES" : "NO");
        console.log("✓ Emergency Functions:", hasEmergency ? "YES" : "NO");
        
        return {
            abi,
            functions: functions.length,
            events: events.length,
            hasUSDCSupport,
            hasAutomation,
            hasEmergency
        };
        
    } catch (error) {
        console.error("Failed to get ABI:", error.message);
        
        if (error.code === 'ENOENT') {
            console.log("\nFile not found. Please compile contract first:");
            console.log("npx hardhat compile");
            console.log("\nMake sure the contract file is named 'DummyUpgradeUSDC.sol'");
        } else if (error instanceof SyntaxError) {
            console.log("\nInvalid JSON format in artifact file.");
            console.log("Please recompile the contract:");
            console.log("npx hardhat clean && npx hardhat compile");
        }
        
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main()
        .then((result) => {
            console.log("\n" + "=".repeat(60));
            console.log("ABI EXTRACTION COMPLETED SUCCESSFULLY!");
            console.log("=".repeat(60));
            console.log("Functions extracted:", result.functions);
            console.log("Events extracted:", result.events);
            console.log("Ready for frontend integration!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Script failed:", error);
            process.exit(1);
        });
}

module.exports = main;