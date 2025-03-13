const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const chalk = require('chalk');
const cliProgress = require('cli-progress');

// Retry configuration
const RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffFactor: 2,
};

// Helper function for exponential backoff retry
async function withRetry(operation, { maxAttempts, initialDelay, maxDelay, backoffFactor } = RETRY_CONFIG) {
    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Check if error is retryable
            if (!isRetryableError(error) || attempt === maxAttempts) {
                throw error;
            }

            // Log retry attempt
            logger.warn(`Operation failed, retrying (${attempt}/${maxAttempts})`, {
                error: error.message,
                attempt,
                nextRetryDelay: delay/1000
            });

            // Wait before retry
            await sleep(delay);
            
            // Calculate next delay with exponential backoff
            delay = Math.min(delay * backoffFactor, maxDelay);
        }
    }
    throw lastError;
}

// Helper function to determine if an error is retryable
function isRetryableError(error) {
    const retryableErrors = [
        'timeout',
        'network error',
        'nonce too low',
        'transaction underpriced',
        'insufficient funds for gas',
        'replacement fee too low',
        'rate limit exceeded',
        'Internal JSON-RPC error',
        'connection reset',
        'too many requests'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(msg => errorMessage.includes(msg.toLowerCase()));
}

// Network configuration
const NETWORK = {
    chainId: 5115,
    rpc: 'https://rpc.testnet.citrea.xyz',
    router: '0xb45670f668EE53E62b5F170B5B1d3C6701C8d03A',
    WCBTC: '0x8d0c9d1c17ae5e40fff9be350f57840e9e66cd93',
    USDC: '0xb669dc8cc6d044307ba45366c0c836ec3c7e31aa'
};

// Router ABI
const ROUTER_ABI = [
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function WETH() external pure returns (address)'
];

// Contract Templates
const CONTRACTS = {
    ERC20: {
        name: "SimpleERC20",
        code: fs.readFileSync('./src/contracts/SimpleERC20.sol', 'utf8')
    },
    SimpleStorage: {
        name: "SimpleStorage",
        code: fs.readFileSync('./src/contracts/SimpleStorage.sol', 'utf8')
    },
    NFTMinter: {
        name: "NFTMinter",
        code: fs.readFileSync('./src/contracts/NFTMinter.sol', 'utf8')
    },
    SimpleSwap: {
        name: "SimpleSwap",
        code: fs.readFileSync('./src/contracts/SimpleSwap.sol', 'utf8')
    }
};

// Custom formatter for winston
const customFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const walletInfo = metadata.walletIndex ? chalk.yellow(` - Wallet ${metadata.walletIndex}`) : '';
    const time = chalk.gray(`[${timestamp}]`);
    
    let coloredMessage = message;
    if (message.includes('started')) {
        coloredMessage = chalk.green(message);
    } else if (message.includes('waiting')) {
        coloredMessage = chalk.yellow(message);
    } else if (message.includes('error') || message.includes('failed')) {
        coloredMessage = chalk.red(message);
    } else if (message.includes('successful')) {
        coloredMessage = chalk.green(message);
    }

    if (metadata.address) {
        coloredMessage += ` : ${chalk.cyan((metadata.address))}`;
    }

    const { walletIndex, address, timestamp: ts, ...restMetadata } = metadata;

    const details = Object.entries(restMetadata)
        .map(([key, value]) => {
            if (key === 'tasksEnabled') {
                return chalk.magenta(`Tasks: [${Object.entries(value)
                    .map(([task, enabled]) => `${task}=${enabled}`)
                    .join(', ')}]`);
            }
            if (key === 'amount') return chalk.green(`Amount: ${value}`);
            if (key === 'txHash') return chalk.blue(`Tx: https://explorer.testnet.citrea.xyz/tx/${(value)}`);
            if (key === 'contractType') return chalk.magenta(`Contract: ${value}`);
            if (key === 'walletsCount') return chalk.cyan(`Wallets: ${value}`);
            return `${key}: ${value}`;
        })
        .filter(Boolean)
        .join(chalk.gray(' | '));

    return `${time}${walletInfo} ${coloredMessage}${details ? chalk.gray(' | ') + details : ''}`;
});

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'DD/MM/YYYY - HH:mm:ss'
        }),
        customFormat
    ),
    transports: [
        new winston.transports.Console(),
        new DailyRotateFile({
            filename: 'logs/citrea-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TOKEN_PREFIXES = [
    'Nakama', 'Meme', 'Pepe', 'Doge', 'Inu', 'Moon', 'Star', 'Cyber',
    'Meta', 'Pixel', 'Crypto', 'Chain', 'Web3', 'Defi', 'Space'
];

const TOKEN_SUFFIXES = [
    'Me', 'Verse', 'World', 'X', 'AI', 'Net', 'Hub', 'Lab',
    'DAO', 'Fi', 'Swap', 'Base', 'Zone', 'Port', 'Grid'
];

function generateTokenName() {
    const prefix = TOKEN_PREFIXES[Math.floor(Math.random() * TOKEN_PREFIXES.length)];
    const suffix = TOKEN_SUFFIXES[Math.floor(Math.random() * TOKEN_SUFFIXES.length)];
    return `${prefix} ${suffix}`;
}

function generateTokenSymbol(name) {
    const words = name.split(' ');
    if (words.length === 1) {
        return name.substring(0, Math.min(4, name.length)).toUpperCase();
    }
    let symbol = words.map(word => word[0]).join('');
    if (symbol.length < 3) {
        const lastWord = words[words.length - 1];
        symbol += lastWord.substring(1, 4 - symbol.length);
    }
    return symbol.toUpperCase();
}

function getRandomNumber(min, max, decimals = 18) {
    const multiplier = Math.pow(10, decimals);
    const randomValue = Math.random() * (max - min) + min;
    return Math.floor(randomValue * multiplier) / multiplier;
}

// CitreaBot Class
class CitreaBot {
    constructor(privateKey) {
        this.provider = new ethers.providers.JsonRpcProvider(NETWORK.rpc);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.router = new ethers.Contract(NETWORK.router, ROUTER_ABI, this.wallet);
    }

    async getBalance() {
        return withRetry(async () => {
            try {
                const balance = await this.wallet.getBalance();
                return ethers.utils.formatEther(balance);
            } catch (error) {
                logger.error('Failed to get balance', { 
                    error: error.message, 
                    address: this.wallet.address 
                });
                throw error;
            }
        });
    }

    async selfTransfer(amount) {
        return withRetry(async () => {
            try {
                const tx = await this.wallet.sendTransaction({
                    to: this.wallet.address,
                    value: ethers.utils.parseEther(amount.toString()),
                    chainId: NETWORK.chainId,
                    gasLimit: 21000,
                    maxFeePerGas: ethers.utils.parseUnits("0.02", "gwei"),
                    maxPriorityFeePerGas: ethers.utils.parseUnits("0.0000001", "gwei")
                });
                
                // Wait for transaction with retry
                return await withRetry(async () => await tx.wait());
            } catch (error) {
                logger.error('Self transfer failed', { 
                    error: error.message, 
                    address: this.wallet.address 
                });
                throw error;
            }
        });
    }

    async deployContract(contractName, constructorArgs = []) {
        return withRetry(async () => {
            try {
                const contract = CONTRACTS[contractName];
                if (!contract) {
                    throw new Error(`Contract ${contractName} not found`);
                }

                const solc = require('solc');
                const input = {
                    language: 'Solidity',
                    sources: {
                        'contract.sol': {
                            content: contract.code
                        }
                    },
                    settings: {
                        outputSelection: {
                            '*': {
                                '*': ['*']
                            }
                        }
                    }
                };

                const output = JSON.parse(solc.compile(JSON.stringify(input)));
                const artifact = output.contracts['contract.sol'][contract.name];

                const factory = new ethers.ContractFactory(
                    artifact.abi,
                    artifact.evm.bytecode.object,
                    this.wallet
                );

                const deployedContract = await factory.deploy(...constructorArgs, {
                    gasLimit: 2600000,
                    maxFeePerGas: ethers.utils.parseUnits("0.1", "gwei"),
                    maxPriorityFeePerGas: ethers.utils.parseUnits("0.0000001", "gwei")
                });

                // Wait for deployment with retry
                await withRetry(async () => await deployedContract.deployed());
                return deployedContract;
            } catch (error) {
                logger.error('Contract deployment failed', { 
                    error: error.message, 
                    address: this.wallet.address,
                    contractName 
                });
                throw error;
            }
        });
    }

    async swapCBTCForUSDC(amountIn) {
        return withRetry(async () => {
            try {
                const path = [NETWORK.WCBTC, NETWORK.USDC];
                const deadline = Math.floor(Date.now() / 1000) + 1200;

                const tx = await this.router.swapExactETHForTokens(
                    0,
                    path,
                    this.wallet.address,
                    deadline,
                    {
                        value: ethers.utils.parseEther(amountIn.toString()),
                        gasLimit: 300000,
                        maxFeePerGas: ethers.utils.parseUnits("0.2", "gwei"),
                        maxPriorityFeePerGas: ethers.utils.parseUnits("0.0000001", "gwei")
                    }
                );

                // Wait for transaction with retry
                return await withRetry(async () => await tx.wait());
            } catch (error) {
                logger.error('CBTC to USDC swap failed', { 
                    error: error.message, 
                    address: this.wallet.address 
                });
                throw error;
            }
        });
    }

    async swapUSDCForCBTC(amountIn) {
        return withRetry(async () => {
            try {
                const USDC = new ethers.Contract(
                    NETWORK.USDC,
                    ['function approve(address spender, uint256 amount) public returns (bool)'],
                    this.wallet
                );

                // Approve with retry
                const approveTx = await USDC.approve(
                    NETWORK.router,
                    ethers.utils.parseUnits(amountIn.toString(), 6),
                    {
                        gasLimit: 100000,
                        maxFeePerGas: ethers.utils.parseUnits("0.2", "gwei"),
                        maxPriorityFeePerGas: ethers.utils.parseUnits("0.0000001", "gwei")
                    }
                );
                await withRetry(async () => await approveTx.wait());

                const path = [NETWORK.USDC, NETWORK.WCBTC];
                const deadline = Math.floor(Date.now() / 1000) + 1200;

                const tx = await this.router.swapExactTokensForETH(
                    ethers.utils.parseUnits(amountIn.toString(), 6),
                    0,
                    path,
                    this.wallet.address,
                    deadline,
                    {
                        gasLimit: 300000,
                        maxFeePerGas: ethers.utils.parseUnits("0.2", "gwei"),
                        maxPriorityFeePerGas: ethers.utils.parseUnits("0.0000001", "gwei")
                    }
                );

                // Wait for transaction with retry
                return await withRetry(async () => await tx.wait());
            } catch (error) {
                logger.error('USDC to CBTC swap failed', { 
                    error: error.message, 
                    address: this.wallet.address 
                });
                throw error;
            }
        });
    }
}

// Process Wallet Function
async function processWallet(privateKey, index, total, config) {
    const bot = new CitreaBot(privateKey);
    logger.info('Processing wallet', { 
        walletIndex: index + 1, 
        walletCount: total,
        address: bot.wallet.address 
    });

    try {
        // Self Transfer
        if (config.tasks.self_transfer.enabled) {
            const settings = config.tasks.self_transfer.settings;
            for (let i = 0; i < settings.repeat_times.min; i++) {
                const amount = getRandomNumber(
                    settings.amount.min,
                    settings.amount.max,
                    settings.amount.decimals
                );
                
                logger.info('Initiating transfer', { 
                    walletIndex: index + 1,
                    amount: `${amount} CBTC`
                });
                
                const tx = await bot.selfTransfer(amount);
                logger.info('Transfer successful', { 
                    walletIndex: index + 1,
                    txHash: tx.transactionHash
                });

                await sleep(config.delay.between_tasks);
            }
        }

        // Contract Deploy
        if (config.tasks.contract_deploy.enabled) {
            const settings = config.tasks.contract_deploy.settings;
            for (let i = 0; i < settings.repeat_times.min; i++) {
                for (const contractType of settings.contract_types) {
                    let constructorArgs = [];
                    
                    if (contractType === 'ERC20') {
                        const tokenName = generateTokenName();
                        const tokenSymbol = generateTokenSymbol(tokenName);
                        const supply = getRandomNumber(
                            settings.token_supply.min,
                            settings.token_supply.max
                        );
                        
                        logger.info('Deploying ERC20 token', { 
                            walletIndex: index + 1,
                            tokenName,
                            tokenSymbol,
                            supply: supply.toString()
                        });
                        
                        constructorArgs = [
                            tokenName, 
                            tokenSymbol,
                            ethers.utils.parseEther(supply.toString())
                        ];
                    }
                    
                    logger.info('Deploying contract', { 
                        walletIndex: index + 1,
                        contractType
                    });
                    
                    const deployedContract = await bot.deployContract(contractType, constructorArgs);
                    
                    logger.info('Contract deployed', {
                        walletIndex: index + 1,
                        address: deployedContract.address
                    });

                    await sleep(config.delay.between_tasks);
                }
            }
        }

        // Swaps
        if (config.tasks.swap.enabled) {
            // CBTC to USDC
            if (config.tasks.swap.settings.cbtc_to_usdc.enabled) {
                const settings = config.tasks.swap.settings.cbtc_to_usdc;
                const amount = getRandomNumber(
                    settings.amount.min,
                    settings.amount.max,
                    settings.decimals
                );
                
                logger.info('Initiating CBTC to USDC swap', { 
                    walletIndex: index + 1,
                    amount: `${amount} CBTC`
                });
                
                const tx = await bot.swapCBTCForUSDC(amount);
                logger.info('Swap successful', { 
                    walletIndex: index + 1,
                    txHash: tx.transactionHash
                });

                await sleep(config.delay.between_tasks);
            }

            // USDC to CBTC
            if (config.tasks.swap.settings.usdc_to_cbtc.enabled) {
                const settings = config.tasks.swap.settings.usdc_to_cbtc;
                const amount = getRandomNumber(
                    settings.amount.min,
                    settings.amount.max,
                    settings.decimals
                );
                
                logger.info('Initiating USDC to CBTC swap', { 
                    walletIndex: index + 1,
                    amount: `${amount} USDC`
                });
                
                const tx = await bot.swapUSDCForCBTC(amount);
                logger.info('Swap successful', { 
                    walletIndex: index + 1,
                    txHash: tx.transactionHash
                });

                await sleep(config.delay.between_tasks);
            }
        }

    } catch (error) {
        logger.error('Wallet processing failed', {
            walletIndex: index + 1,
            error: error.message
        });
    }
}

async function main() {
    try {
        // Validate required directories
        const requiredPaths = {
            logs: path.join(__dirname, 'logs'),
            contracts: path.join(__dirname, 'src', 'contracts'),
            config: path.join(__dirname, 'src', 'config'),
            files: path.join(__dirname, 'src', 'file')
        };

        Object.entries(requiredPaths).forEach(([name, dirPath]) => {
            if (!fs.existsSync(dirPath)) {
                logger.info(`Creating ${name} directory: ${dirPath}`);
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });

        // Load and validate files
        const configPath = path.join(__dirname, 'src', 'config', 'config.json');
        const pkPath = path.join(__dirname, 'src', 'file', 'pk.txt');

        if (!fs.existsSync(configPath)) {
            throw new Error('config.json not found in src/config/');
        }
        if (!fs.existsSync(pkPath)) {
            throw new Error('pk.txt not found in src/file/');
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const privateKeys = fs.readFileSync(pkPath, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

        if (privateKeys.length === 0) {
            throw new Error('No private keys found in pk.txt');
        }

        logger.info('Bot started', { 
            walletsCount: privateKeys.length,
            tasksEnabled: {
                selfTransfer: config.tasks.self_transfer.enabled,
                contractDeploy: config.tasks.contract_deploy.enabled,
                swap: config.tasks.swap.enabled
            }
        });

        // Process wallets
        for (let i = 0; i < privateKeys.length; i++) {
            await processWallet(privateKeys[i], i, privateKeys.length, config);
            
            if (i < privateKeys.length - 1) {
                const delay = config.delay.between_wallets;
                logger.info(`Waiting ${delay}s before next wallet`, { 
                    walletIndex: i + 1,
                    nextWallet: i + 2 
                });
                await sleep(delay * 1000);
            }
        }

        logger.info('All wallets processed successfully');
        
        // Wait for all logs to be displayed
        await sleep(1000);
        
        // Start 25-hour countdown
        const HOURS_25 = 25 * 60 * 60;
        console.log('\n' + chalk.cyan('╭────────────────────────────────────────────────────────────╮'));
        console.log(chalk.cyan('│') + chalk.yellow(' Wallet processing completed! Starting 25-hour countdown... ') + chalk.cyan('│'));
        console.log(chalk.cyan('╰────────────────────────────────────────────────────────────╯\n'));
        
        return new Promise((resolve) => {
            let remainingTime = HOURS_25;
            const countdownInterval = setInterval(() => {
                remainingTime--;
                
                const timeObj = {
                    hours: Math.floor(remainingTime / 3600).toString().padStart(2, '0'),
                    minutes: Math.floor((remainingTime % 3600) / 60).toString().padStart(2, '0'),
                    seconds: (remainingTime % 60).toString().padStart(2, '0')
                };
                
                // Update countdown display
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(
                    chalk.gray(`Time Remaining: `) + 
                    chalk.cyan(`${timeObj.hours}:${timeObj.minutes}:${timeObj.seconds}`)
                );
                
                if (remainingTime <= 0) {
                    clearInterval(countdownInterval);
                    console.log('\n\n' + chalk.cyan('╭────────────────────────────────────╮'));
                    console.log(chalk.cyan('│') + chalk.green(' Countdown completed! Restarting... ') + chalk.cyan('│'));
                    console.log(chalk.cyan('╰────────────────────────────────────╯\n'));
                    resolve();
                }
            }, 1000);
        });

    } catch (error) {
        logger.error('Fatal error in main process', { 
            error: error.message
        });
        process.exit(1);
    }
}

// Start bot with error handling
async function startBot() {
    try {
        while (true) {
            await main(); // Wait for countdown to complete
            logger.info('Cycle completed, starting next iteration');
        }
    } catch (error) {
        logger.error('Critical bot error', { 
            error: error.message
        });
        process.exit(1);
    }
}

startBot().catch(error => {
    logger.error('Unhandled error', { 
        error: error.message
    });
    process.exit(1);
});

module.exports = { CitreaBot, logger };