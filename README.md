# c1tr3a Bot

Automation tool for performing various actions on the c1tr3a testnet network including self-transfers, contract deployments, and token swaps.

## Features

- **Self Transfers**: Transfer CBTC between your own addresses
- **Contract Deployment**: Deploy various smart contracts including ERC20 tokens, NFTs, and storage contracts
- **Token Swaps**: Perform swaps between CBTC and USDC on c1tr3a testnet
- **Advanced Retry Logic**: Automatically handles common blockchain errors with exponential backoff
- **Configurable Settings**: All actions and parameters are customizable via configuration file
- **Detailed Logging**: Comprehensive logs with colored output and file rotation
- **Auto-Restart**: Automatically runs a new cycle after 25 hours

## Requirements

- Node.js v14+
- NPM v6+

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/Usernameusernamenotavailbleisnot/c1tr3a.git
   cd c1tr3a
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Setup

1. Create the private key file:
   ```
   mkdir -p src/file
   touch src/file/pk.txt
   ```

2. Add your private keys to `src/file/pk.txt` (one key per line):
   ```
   0xYOUR_PRIVATE_KEY_1
   0xYOUR_PRIVATE_KEY_2
   # Lines starting with # are ignored
   0xYOUR_PRIVATE_KEY_3
   ```

3. Configure the bot settings in `src/config/config.json` (default will be created on first run if not present)

## Configuration

The `config.json` file allows you to customize the behavior of the bot:

```json
{
    "tasks": {
        "self_transfer": {
            "enabled": true,
            "settings": {
                "amount": {
                    "min": 0.00001,
                    "max": 0.00002,
                    "decimals": 6
                },
                "repeat_times": {
                    "min": 3,
                    "max": 10
                }
            }
        },
        "contract_deploy": {
            "enabled": true,
            "settings": {
                "repeat_times": {
                    "min": 1,
                    "max": 1
                },
                "contract_types": ["ERC20", "SimpleStorage", "NFTMinter", "SimpleSwap"],
                "token_supply": {
                    "min": 1000,
                    "max": 1000000
                }
            }
        },
        "swap": {
            "enabled": true,
            "settings": {
                "repeat_times": {
                    "min": 5,
                    "max": 10
                },
                "cbtc_to_usdc": {
                    "enabled": true,
                    "amount": {
                        "min": 0.0001,
                        "max": 0.0002
                    },
                    "decimals": 6
                },
                "usdc_to_cbtc": {
                    "enabled": true,
                    "amount": {
                        "min": 0.0001,
                        "max": 0.0002
                    },
                    "decimals": 6
                }
            }
        }
    },
    "delay": {
        "between_tasks": 5000,
        "between_wallets": 10
    }
}
```

### Configuration Options

- **tasks**: Configure which tasks are enabled and their settings
  - **self_transfer**: Send CBTC from your wallet to itself
  - **contract_deploy**: Deploy various smart contracts
  - **swap**: Perform token swaps between CBTC and USDC
- **delay**: Set timing between operations (in milliseconds for tasks, seconds for wallets)

## Usage

Start the bot with:

```
npm run start
```

The bot will:
1. Process each wallet in your `pk.txt` file
2. Perform the enabled tasks with the configured settings
3. Wait 25 hours
4. Restart the process automatically

## Directory Structure

```
c1tr3a-bot/
├── logs/                  # Log files (created automatically)
├── src/
│   ├── config/            # Configuration files
│   │   └── config.json    # Main configuration file
│   ├── contracts/         # Solidity smart contracts
│   │   ├── NFTMinter.sol
│   │   ├── SimpleERC20.sol
│   │   ├── SimpleStorage.sol
│   │   └── SimpleSwap.sol
│   ├── file/              # Input files
│   │   └── pk.txt         # Private keys (one per line)
│   ├── scripts/           # Utility scripts
│   └── index.js           # Main application file
├── package.json           # NPM dependencies and scripts
└── README.md              # This documentation file
```

## Troubleshooting

### Common Issues

1. **Error: config.json not found**
   - Create the directory: `mkdir -p src/config`
   - Create a config file with the example configuration above

2. **Error: pk.txt not found**
   - Create the directory: `mkdir -p src/file`
   - Create a file: `touch src/file/pk.txt`
   - Add your private keys to the file (one per line)

3. **Connection Errors**
   - The bot includes automatic retry logic for common network issues
   - Check your internet connection
   - Verify the c1tr3a testnet is operational

4. **Insufficient Funds**
   - Make sure your wallets have enough CBTC for the configured operations
   - You can get testnet CBTC from the c1tr3a testnet faucet

## License

MIT License

## Disclaimer

This software is for educational and testing purposes only. Use at your own risk.
