// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract SimpleSwap {
    mapping(address => uint256) public liquidityBalance;
    
    event Swap(address indexed sender, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed provider, address token, uint256 amount);
    event LiquidityRemoved(address indexed provider, address token, uint256 amount);
    
    function addLiquidity(address token, uint256 amount) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        liquidityBalance[token] += amount;
        emit LiquidityAdded(msg.sender, token, amount);
    }
    
    function removeLiquidity(address token, uint256 amount) external {
        require(liquidityBalance[token] >= amount, "Insufficient liquidity");
        liquidityBalance[token] -= amount;
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        emit LiquidityRemoved(msg.sender, token, amount);
    }
    
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external {
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Transfer in failed");
        
        // Simple price calculation (1:1 in this example)
        // In real DEX, you would use a proper price formula
        uint256 amountOut = amountIn;
        require(amountOut >= amountOutMin, "Insufficient output amount");
        require(IERC20(tokenOut).transfer(msg.sender, amountOut), "Transfer out failed");
        
        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
    
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}