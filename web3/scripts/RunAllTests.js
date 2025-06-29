const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
    constructor() {
        this.testDir = path.join(__dirname, '..', 'test');
        this.results = {
            passed: [],
            failed: [],
            skipped: [],
            totalTime: 0
        };
        this.verbose = false;
        this.parallel = false;
        this.filter = null;
    }

    // Get all test files in the test directory
    getTestFiles() {
        try {
            const files = fs.readdirSync(this.testDir)
                .filter(file => file.endsWith('.test.js'))
                .map(file => path.join(this.testDir, file));
            
            return files;
        } catch (error) {
            console.error('Error reading test directory:', error.message);
            return [];
        }
    }

    // Run a single test file
    async runSingleTest(testFile) {
        const fileName = path.basename(testFile);
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`Running: ${fileName}`);
            console.log(`${'='.repeat(80)}`);
            
            const args = ['test', testFile];
            if (this.verbose) args.push('--verbose');
            
            const child = spawn('npx', ['hardhat', ...args], {
                stdio: this.verbose ? 'inherit' : 'pipe',
                shell: true,
                cwd: path.join(__dirname, '..')
            });

            let output = '';
            let errorOutput = '';

            if (!this.verbose) {
                child.stdout?.on('data', (data) => {
                    output += data.toString();
                });

                child.stderr?.on('data', (data) => {
                    errorOutput += data.toString();
                });
            }

            child.on('close', (code) => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                const result = {
                    file: fileName,
                    path: testFile,
                    success: code === 0,
                    duration: duration,
                    output: output,
                    error: errorOutput
                };

                if (code === 0) {
                    console.log(`PASSED: ${fileName} (${duration}ms)`);
                    this.results.passed.push(result);
                } else {
                    console.log(`FAILED: ${fileName} (${duration}ms)`);
                    this.results.failed.push(result);
                    
                    if (!this.verbose && errorOutput) {
                        console.log(`\nError output for ${fileName}:`);
                        console.log(errorOutput.slice(-1000)); // Show last 1000 chars
                    }
                }

                resolve(result);
            });

            child.on('error', (error) => {
                console.log(`ERROR: ${fileName} - ${error.message}`);
                const result = {
                    file: fileName,
                    path: testFile,
                    success: false,
                    duration: Date.now() - startTime,
                    output: '',
                    error: error.message
                };
                this.results.failed.push(result);
                resolve(result);
            });
        });
    }

    // Run all tests sequentially
    async runAllSequential() {
        const testFiles = this.getTestFiles();
        
        if (this.filter) {
            const filtered = testFiles.filter(file => 
                path.basename(file).toLowerCase().includes(this.filter.toLowerCase())
            );
            console.log(`Filtered ${testFiles.length} tests down to ${filtered.length} matching "${this.filter}"`);
            testFiles.length = 0;
            testFiles.push(...filtered);
        }

        if (testFiles.length === 0) {
            console.log('No test files found!');
            return;
        }

        console.log(`\nStarting test run: ${testFiles.length} test files`);
        console.log(`Test directory: ${this.testDir}`);
        console.log(`Mode: Sequential`);
        console.log(`Verbose: ${this.verbose}`);
        
        const overallStart = Date.now();

        for (const testFile of testFiles) {
            await this.runSingleTest(testFile);
        }

        this.results.totalTime = Date.now() - overallStart;
        this.printSummary();
    }

    // Run tests in parallel (experimental)
    async runAllParallel() {
        const testFiles = this.getTestFiles();
        
        if (this.filter) {
            const filtered = testFiles.filter(file => 
                path.basename(file).toLowerCase().includes(this.filter.toLowerCase())
            );
            testFiles.length = 0;
            testFiles.push(...filtered);
        }

        console.log(`\nStarting parallel test run: ${testFiles.length} test files`);
        console.log(`Warning: Parallel mode may cause resource conflicts`);
        
        const overallStart = Date.now();
        const promises = testFiles.map(testFile => this.runSingleTest(testFile));
        
        await Promise.all(promises);
        
        this.results.totalTime = Date.now() - overallStart;
        this.printSummary();
    }

    // Print comprehensive test summary
    printSummary() {
        const total = this.results.passed.length + this.results.failed.length + this.results.skipped.length;
        
        console.log(`\n${'='.repeat(80)}`);
        console.log(`TEST SUMMARY`);
        console.log(`${'='.repeat(80)}`);
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${this.results.passed.length}`);
        console.log(`Failed: ${this.results.failed.length}`);
        console.log(`Skipped: ${this.results.skipped.length}`);
        console.log(`Total Time: ${this.results.totalTime}ms (${(this.results.totalTime / 1000).toFixed(2)}s)`);
        
        if (this.results.passed.length > 0) {
            console.log(`\nPASSED TESTS:`);
            this.results.passed.forEach(test => {
                console.log(`   PASS ${test.file} (${test.duration}ms)`);
            });
        }
        
        if (this.results.failed.length > 0) {
            console.log(`\nFAILED TESTS:`);
            this.results.failed.forEach(test => {
                console.log(`   FAIL ${test.file} (${test.duration}ms)`);
            });
            
            console.log(`\nFAILURE DETAILS:`);
            this.results.failed.forEach(test => {
                console.log(`\n${test.file}:`);
                if (test.error) {
                    console.log(`   Error: ${test.error.slice(0, 500)}${test.error.length > 500 ? '...' : ''}`);
                }
            });
        }

        // Performance analysis
        if (this.results.passed.length > 0 || this.results.failed.length > 0) {
            const allTests = [...this.results.passed, ...this.results.failed];
            const avgTime = allTests.reduce((sum, test) => sum + test.duration, 0) / allTests.length;
            const slowest = allTests.reduce((max, test) => test.duration > max.duration ? test : max);
            const fastest = allTests.reduce((min, test) => test.duration < min.duration ? test : min);
            
            console.log(`\nPERFORMANCE ANALYSIS:`);
            console.log(`   Average time: ${avgTime.toFixed(0)}ms`);
            console.log(`   Fastest: ${fastest.file} (${fastest.duration}ms)`);
            console.log(`   Slowest: ${slowest.file} (${slowest.duration}ms)`);
        }

        // Overall result
        const success = this.results.failed.length === 0;
        console.log(`\nOverall Result: ${success ? 'SUCCESS' : 'FAILURE'}`);
        
        if (!success) {
            console.log(`\nTo debug failing tests, run them individually:`);
            this.results.failed.forEach(test => {
                console.log(`   npx hardhat test ${test.path}`);
            });
        }
        
        console.log(`${'='.repeat(80)}\n`);
    }

    // List all available test files
    listTests() {
        const testFiles = this.getTestFiles();
        console.log(`\nAvailable Test Files (${testFiles.length}):`);
        console.log(`${'='.repeat(50)}`);
        
        testFiles.forEach((file, index) => {
            const fileName = path.basename(file);
            const stats = fs.statSync(file);
            const size = (stats.size / 1024).toFixed(1);
            console.log(`${index + 1}. ${fileName} (${size}KB)`);
        });
        console.log();
    }

    // Show help information
    showHelp() {
        console.log(`
GoHedge Test Runner
${'='.repeat(30)}

Usage: node scripts/RunAllTests.js [options]

Options:
  --help, -h          Show this help message
  --list, -l          List all available test files
  --verbose, -v       Show detailed output from tests
  --parallel, -p      Run tests in parallel (experimental)
  --filter <name>     Run only tests matching name pattern
  --single <file>     Run a single test file

Examples:
  node scripts/RunAllTests.js                           # Run all tests
  node scripts/RunAllTests.js --verbose                 # Run with detailed output
  node scripts/RunAllTests.js --filter "Whitelist"     # Run only whitelist tests
  node scripts/RunAllTests.js --single DummyUpgrade    # Run single test
  node scripts/RunAllTests.js --parallel               # Run in parallel
  node scripts/RunAllTests.js --list                   # List available tests

Available Test Categories:
  • DummyUpgrade.test.js                - Core contract functionality
  • DummyUpgradeUSDC_Whitelist.test.js  - USDC and whitelist features
  • GoHedgePreProduction.dummy.test.js  - Complete integration test
  • SecurityTests.test.js               - Security validation
  • GasAndPerformance.test.js           - Performance testing
  • AddPriceFeed_TimeBased.test.js      - Price feed automation
        `);
    }
}

// Main execution function
async function main() {
    const runner = new TestRunner();
    const args = process.argv.slice(2);
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--help':
            case '-h':
                runner.showHelp();
                return;
                
            case '--list':
            case '-l':
                runner.listTests();
                return;
                
            case '--verbose':
            case '-v':
                runner.verbose = true;
                break;
                
            case '--parallel':
            case '-p':
                runner.parallel = true;
                break;
                
            case '--filter':
                if (i + 1 < args.length) {
                    runner.filter = args[i + 1];
                    i++; // Skip next argument
                } else {
                    console.error('--filter requires a filter pattern');
                    return;
                }
                break;
                
            case '--single':
                if (i + 1 < args.length) {
                    const testName = args[i + 1];
                    const testFiles = runner.getTestFiles();
                    const matchingFile = testFiles.find(file => 
                        path.basename(file).toLowerCase().includes(testName.toLowerCase())
                    );
                    
                    if (matchingFile) {
                        console.log(`Running single test: ${path.basename(matchingFile)}`);
                        await runner.runSingleTest(matchingFile);
                        runner.printSummary();
                    } else {
                        console.error(`No test file found matching "${testName}"`);
                        runner.listTests();
                    }
                    return;
                } else {
                    console.error('--single requires a test file name');
                    return;
                }
                
            default:
                if (arg.startsWith('-')) {
                    console.error(`Unknown option: ${arg}`);
                    runner.showHelp();
                    return;
                }
        }
    }
    
    // Run tests based on configuration
    try {
        if (runner.parallel) {
            await runner.runAllParallel();
        } else {
            await runner.runAllSequential();
        }
    } catch (error) {
        console.error('Test runner error:', error.message);
        process.exit(1);
    }
    
    // Exit with appropriate code
    process.exit(runner.results.failed.length > 0 ? 1 : 0);
}

// Quick test runner for specific categories
class QuickRunner {
    static async runSecurity() {
        console.log('Running Security Tests Only...');
        const runner = new TestRunner();
        runner.filter = 'Security';
        await runner.runAllSequential();
    }
    
    static async runPerformance() {
        console.log('Running Performance Tests Only...');
        const runner = new TestRunner();
        runner.filter = 'Performance';
        await runner.runAllSequential();
    }
    
    static async runWhitelist() {
        console.log('Running Whitelist Tests Only...');
        const runner = new TestRunner();
        runner.filter = 'Whitelist';
        await runner.runAllSequential();
    }
    
    static async runCore() {
        console.log('Running Core Tests Only...');
        const runner = new TestRunner();
        runner.filter = 'DummyUpgrade.test.js';
        await runner.runAllSequential();
    }

    static async runIntegration() {
        console.log('Running Integration Tests Only...');
        const runner = new TestRunner();
        runner.filter = 'GoHedgePreProduction';
        await runner.runAllSequential();
    }

    static async runGas() {
        console.log('Running Gas Tests Only...');
        const runner = new TestRunner();
        runner.filter = 'GasAndPerformance';
        await runner.runAllSequential();
    }

    static async runUSDC() {
        console.log('Running USDC Tests Only...');
        const runner = new TestRunner();
        runner.filter = 'USDC';
        await runner.runAllSequential();
    }
}

// Export for programmatic use
module.exports = {
    TestRunner,
    QuickRunner
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}