const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Read the compiled contract artifact
        const artifactPath = path.join(__dirname, '../artifacts/contracts/GoHedgePreProduction.sol/GoHedgePreProduction.json');
        
        if (!fs.existsSync(artifactPath)) {
            console.error("Contract artifact not found. Please compile first:");
            console.log("npx hardhat compile");
            return;
        }

        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        const abi = artifact.abi;

        // Save ABI to file
        const abiPath = path.join(__dirname, '../abi/GoHedgePreProduction.json');
        
        // Create abi directory if it doesn't exist
        const abiDir = path.dirname(abiPath);
        if (!fs.existsSync(abiDir)) {
            fs.mkdirSync(abiDir, { recursive: true });
        }

        fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));

        console.log("✓ GoHedgePreProduction ABI extracted successfully!");
        console.log("✓ ABI saved to:", abiPath);
        console.log("\nABI Preview (first 5 functions):");
        
        const functions = abi.filter(item => item.type === 'function').slice(0, 5);
        functions.forEach(func => {
            console.log(`- ${func.name}(${func.inputs.map(input => `${input.type} ${input.name}`).join(', ')})`);
        });

        console.log(`\nTotal ABI items: ${abi.length}`);
        console.log(`Functions: ${abi.filter(item => item.type === 'function').length}`);
        console.log(`Events: ${abi.filter(item => item.type === 'event').length}`);

        return abi;
    } catch (error) {
        console.error("Error extracting ABI:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = main;