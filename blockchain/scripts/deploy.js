const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  
  const chainId = await ethers.provider.getNetwork().then(n => Number(n.chainId));
  
  let priceFeedAddress;
  if (chainId === 31337) {
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    const mockPriceFeed = await MockV3Aggregator.deploy(8, 35_00000000);
    await mockPriceFeed.waitForDeployment();
    priceFeedAddress = await mockPriceFeed.getAddress();
    console.log("Mock Price Feed:", priceFeedAddress);
  } else if (chainId === 43113) {
    priceFeedAddress = "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD";
    console.log("Using Fuji Price Feed:", priceFeedAddress);
  }
  
  const YieldForwardInsurance = await ethers.getContractFactory("YieldForwardInsurance");
  const insurance = await YieldForwardInsurance.deploy(priceFeedAddress);
  await insurance.waitForDeployment();
  
  console.log("Insurance Contract:", await insurance.getAddress());
  console.log("Current Price:", ethers.formatUnits(await insurance.getCurrentPrice(), 8), "USD");
}

main().catch(console.error);