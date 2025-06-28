const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Getting DummyUpgrade contract ABI...");
    
    // Get ABI from compiled output
    const artifactPath = path.join(__dirname, '../artifacts/contracts/dummyupgrade.sol/DummyUpgrade.json');
    
    try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        const abi = artifact.abi;
        
        console.log("ABI retrieved successfully!");
        console.log("Number of functions:", abi.length);
        
        // Save ABI to separate file
        const abiOutputPath = path.join(__dirname, '../abi/DummyUpgrade.json');
        
        // Ensure directory exists
        const abiDir = path.dirname(abiOutputPath);
        if (!fs.existsSync(abiDir)) {
            fs.mkdirSync(abiDir, { recursive: true });
        }
        
        // Save formatted ABI
        fs.writeFileSync(abiOutputPath, JSON.stringify(abi, null, 2));
        console.log("ABI saved to:", abiOutputPath);
        
        // Display main functions
        console.log("\nMain function list:");
        abi.forEach((item, index) => {
            if (item.type === 'function') {
                console.log(`${index + 1}. ${item.name}(${item.inputs.map(input => `${input.type} ${input.name}`).join(', ')})`);
            }
        });
        
        // Display events
        console.log("\nEvent list:");
        abi.forEach((item, index) => {
            if (item.type === 'event') {
                console.log(`${index + 1}. ${item.name}`);
            }
        });
        
        return abi;
        
    } catch (error) {
        console.error("Failed to get ABI:", error.message);
        console.log("Please compile contract first: npx hardhat compile");
    }
}

main().catch(console.error);