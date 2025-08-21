// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CreditLineToken.sol";
import "./AerodromeAdapter.sol";

/**
 * @title CreditLineFactory
 * @notice Factory contract for creating and managing credit line tokens
 */
contract CreditLineFactory is Ownable, ReentrancyGuard {
    // Events
    event CreditLineCreated(
        address indexed creditLineToken,
        address indexed underlyingAsset,
        address indexed borrower,
        uint256 creditLimit,
        uint256 apy,
        uint256 initialLiquidity
    );
    
    event AerodromeAdapterSet(
        address indexed oldAdapter,
        address indexed newAdapter
    );

    // Debug events
    event DebugFactoryStep(string step, address indexed creditLineToken, uint256 timestamp);
    event DebugFactoryError(string step, string error, address indexed creditLineToken, uint256 timestamp);
    event DebugFactoryBalance(string step, address token, uint256 balance, uint256 timestamp);
    event DebugFactoryTransfer(string step, address from, address to, address token, uint256 amount, uint256 timestamp);
    event DebugFactoryCall(string step, address target, bytes4 functionSig, uint256 timestamp);

    // State variables
    AerodromeAdapter public aerodromeAdapter;
    address[] public creditLines;
    mapping(address => bool) public isCreditLine;
    
    // Errors
    error InvalidParameters();
    error InsufficientBalance();
    error TransferFailed();
    
    /**
     * @notice Constructor
     * @param _aerodromeAdapter Address of the Aerodrome adapter
     */
    constructor(address _aerodromeAdapter) Ownable(msg.sender) {
        aerodromeAdapter = AerodromeAdapter(_aerodromeAdapter);
        emit DebugFactoryStep("Constructor", address(0), block.timestamp);
    }
    
    // Multi-step credit line creation state
    struct CreditLineCreation {
        string name;
        string symbol;
        address underlyingAsset;
        uint256 creditLimit;
        uint256 apy;
        address borrower;
        uint256 initialLiquidity;
        address creditLineToken;
        uint8 step; // Current step (0 = not started, 1 = deployed, 2 = initialized, etc.)
        bool completed;
    }
    
    mapping(bytes32 => CreditLineCreation) public creditLineCreations;
    
    /**
     * @notice Step 1: Deploy and initialize a new credit line token
     * @param name Name of the credit line token
     * @param symbol Symbol of the credit line token
     * @param underlyingAsset Address of the underlying asset (e.g., WETH)
     * @param creditLimit Maximum amount that can be borrowed
     * @param apy Annual percentage yield in basis points
     * @param borrower Address of the borrower
     * @param initialLiquidity Initial liquidity to provide
     * @return creationId Unique ID for this credit line creation process
     * @return creditLineToken Address of the deployed credit line token
     */
    function step1_DeployAndInitialize(
        string memory name,
        string memory symbol,
        address underlyingAsset,
        uint256 creditLimit,
        uint256 apy,
        address borrower,
        uint256 initialLiquidity
    ) external onlyOwner returns (bytes32 creationId, address creditLineToken) {
        emit DebugFactoryStep("step1_start", address(0), block.timestamp);
        
        // Validate parameters
        if (underlyingAsset == address(0) || borrower == address(0)) {
            emit DebugFactoryError("parameter_validation", "Invalid address", address(0), block.timestamp);
            revert InvalidParameters();
        }
        
        if (creditLimit == 0 || apy == 0 || initialLiquidity == 0) {
            emit DebugFactoryError("parameter_validation", "Invalid amounts", address(0), block.timestamp);
            revert InvalidParameters();
        }
        
        // Check if we have enough underlying asset
        uint256 balance = IERC20(underlyingAsset).balanceOf(address(this));
        if (balance < initialLiquidity) {
            emit DebugFactoryError("insufficient_balance", "Factory balance too low", address(0), block.timestamp);
            revert InsufficientBalance();
        }
        
        // Deploy the credit line token
        emit DebugFactoryStep("deploying_token", address(0), block.timestamp);
        CreditLineToken token = new CreditLineToken(name, symbol);
        creditLineToken = address(token);
        emit DebugFactoryStep("token_deployed", creditLineToken, block.timestamp);
        
        // Transfer underlying asset to the credit line token
        emit DebugFactoryTransfer("transfer_to_token", address(this), creditLineToken, underlyingAsset, initialLiquidity, block.timestamp);
        IERC20(underlyingAsset).transfer(creditLineToken, initialLiquidity);
        
        // Initialize the credit line token
        emit DebugFactoryStep("initializing_token", creditLineToken, block.timestamp);
        token.initialize(
            underlyingAsset,
            creditLimit,
            apy,
            borrower,
            initialLiquidity
        );
        emit DebugFactoryStep("token_initialized", creditLineToken, block.timestamp);
        
        // Create unique ID for this creation process
        creationId = keccak256(abi.encodePacked(creditLineToken, block.timestamp, msg.sender));
        
        // Store creation state
        creditLineCreations[creationId] = CreditLineCreation({
            name: name,
            symbol: symbol,
            underlyingAsset: underlyingAsset,
            creditLimit: creditLimit,
            apy: apy,
            borrower: borrower,
            initialLiquidity: initialLiquidity,
            creditLineToken: creditLineToken,
            step: 1,
            completed: false
        });
        
        emit DebugFactoryStep("step1_completed", creditLineToken, block.timestamp);
        return (creationId, creditLineToken);
    }
    
    /**
     * @notice Step 2: Mint tokens and set approvals
     * @param creationId The creation ID from step 1
     */
    function step2_MintAndApprove(bytes32 creationId) external onlyOwner {
        CreditLineCreation storage creation = creditLineCreations[creationId];
        require(creation.step == 1, "Invalid step or creation not found");
        
        emit DebugFactoryStep("step2_start", creation.creditLineToken, block.timestamp);
        
        CreditLineToken token = CreditLineToken(creation.creditLineToken);
        
        // Mint credit line tokens to the credit line token itself
        emit DebugFactoryStep("minting_credit_line_tokens", creation.creditLineToken, block.timestamp);
        token.mint(creation.creditLineToken, creation.initialLiquidity);
        emit DebugFactoryStep("credit_line_tokens_minted", creation.creditLineToken, block.timestamp);
        
        // Approve the adapter to spend tokens from the credit line token
        emit DebugFactoryStep("approving_adapter", creation.creditLineToken, block.timestamp);
        token.approveAdapter(address(aerodromeAdapter), creation.initialLiquidity);
        emit DebugFactoryStep("adapter_approved", creation.creditLineToken, block.timestamp);
        
        // Approve the adapter to spend WETH from the credit line token
        emit DebugFactoryStep("approving_weth", creation.creditLineToken, block.timestamp);
        token.approveAdapterForUnderlying(address(aerodromeAdapter), creation.initialLiquidity);
        emit DebugFactoryStep("weth_approved", creation.creditLineToken, block.timestamp);
        
        creation.step = 2;
        emit DebugFactoryStep("step2_completed", creation.creditLineToken, block.timestamp);
    }
    
    /**
     * @notice Step 3: Create Aerodrome pool and add liquidity
     * @param creationId The creation ID from step 1
     */
    function step3_CreatePool(bytes32 creationId) external onlyOwner {
        CreditLineCreation storage creation = creditLineCreations[creationId];
        require(creation.step == 2, "Invalid step or creation not found");
        
        emit DebugFactoryStep("step3_start", creation.creditLineToken, block.timestamp);
        
        // Create Aerodrome pool and add liquidity
        emit DebugFactoryStep("creating_pool_start", creation.creditLineToken, block.timestamp);
        emit DebugFactoryCall("createPoolAndAddLiquidity", address(aerodromeAdapter), bytes4(keccak256("createPoolAndAddLiquidity(address,address,uint256,uint256)")), block.timestamp);
        
        (address pool, uint256 tokenId) = aerodromeAdapter.createPoolAndAddLiquidity(
            creation.creditLineToken,
            creation.underlyingAsset,
            creation.initialLiquidity,     // amount of credit line tokens
            creation.initialLiquidity      // amount of underlying asset (WETH)
        );
        
        emit DebugFactoryStep("pool_created", creation.creditLineToken, block.timestamp);
        
        creation.step = 3;
        emit DebugFactoryStep("step3_completed", creation.creditLineToken, block.timestamp);
    }
    
    /**
     * @notice Step 4: Finalize credit line creation
     * @param creationId The creation ID from step 1
     */
    function step4_Finalize(bytes32 creationId) external onlyOwner {
        CreditLineCreation storage creation = creditLineCreations[creationId];
        require(creation.step == 3, "Invalid step or creation not found");
        
        emit DebugFactoryStep("step4_start", creation.creditLineToken, block.timestamp);
        
        CreditLineToken token = CreditLineToken(creation.creditLineToken);
        
        // Set up price validation on the credit line token
        emit DebugFactoryStep("setting_price_validation", creation.creditLineToken, block.timestamp);
        token.setPriceValidation(address(aerodromeAdapter), true);
        emit DebugFactoryStep("price_validation_set", creation.creditLineToken, block.timestamp);
        
        // Track the credit line
        creditLines.push(creation.creditLineToken);
        isCreditLine[creation.creditLineToken] = true;
        
        emit DebugFactoryStep("credit_line_tracked", creation.creditLineToken, block.timestamp);
        
        emit CreditLineCreated(
            creation.creditLineToken,
            creation.underlyingAsset,
            creation.borrower,
            creation.creditLimit,
            creation.apy,
            creation.initialLiquidity
        );
        
        creation.step = 4;
        creation.completed = true;
        emit DebugFactoryStep("step4_completed", creation.creditLineToken, block.timestamp);
    }
    
    /**
     * @notice Get creation status
     * @param creationId The creation ID
     * @return creation The creation struct
     */
    function getCreationStatus(bytes32 creationId) external view returns (CreditLineCreation memory creation) {
        return creditLineCreations[creationId];
    }
    
    /**
     * @notice Set a new Aerodrome adapter
     * @param newAdapter Address of the new adapter
     */
    function setAerodromeAdapter(address newAdapter) external onlyOwner {
        address oldAdapter = address(aerodromeAdapter);
        aerodromeAdapter = AerodromeAdapter(newAdapter);
        emit AerodromeAdapterSet(oldAdapter, newAdapter);
    }
    
    /**
     * @notice Get all credit lines created by this factory
     * @return Array of credit line addresses
     */
    function getAllCreditLines() external view returns (address[] memory) {
        return creditLines;
    }
    
    // /**
    //  * @notice Get the number of credit lines created
    //  * @return Number of credit lines
    //  */
    // function getCreditLineCount() external view returns (uint256) {
    //     return creditLines.length;
    // }
    
    /**
     * @notice Get credit line information
     * @param creditLineToken Address of the credit line token
     * @return status Credit line status information
     * @return position Aerodrome liquidity position information
     */
    function getCreditLineInfo(address creditLineToken) external view returns (
        CreditLineToken.CreditLineStatus memory status,
        AerodromeAdapter.LiquidityPosition memory position
    ) {
        require(isCreditLine[creditLineToken], "Not a credit line");
        
        CreditLineToken token = CreditLineToken(creditLineToken);
        status = token.getCreditLineStatus();
        position = aerodromeAdapter.getPosition(creditLineToken);
        
        return (status, position);
    }
    
    /**
     * @notice Trigger interest accrual on a credit line
     * @param creditLineToken Address of the credit line token
     * @param timeElapsed Time elapsed since last accrual in seconds
     */
    function accrueInterest(address creditLineToken, uint256 timeElapsed) external onlyOwner {
        require(isCreditLine[creditLineToken], "Not a credit line");
        
        CreditLineToken token = CreditLineToken(creditLineToken);
        uint256 apy = token.apy();
        
        uint256 newPrice = aerodromeAdapter.accrueInterest(creditLineToken, apy, timeElapsed);
        
        emit InterestAccrued(creditLineToken, apy, timeElapsed, newPrice);
    }
    
    // Events
    event InterestAccrued(
        address indexed creditLineToken,
        uint256 apy,
        uint256 timeElapsed,
        uint256 newPrice
    );
    
    /**
     * @notice Emergency function to recover tokens
     * @param token Address of token to recover
     * @param amount Amount to recover
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @notice Emergency function to recover ETH
     */
    function emergencyWithdrawETH() external onlyOwner {
        (bool success,) = owner().call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
    
    /**
     * @notice Legacy single-transaction create function (for backwards compatibility)
     * @param name Name of the credit line token
     * @param symbol Symbol of the credit line token
     * @param underlyingAsset Address of the underlying asset (e.g., WETH)
     * @param creditLimit Maximum amount that can be borrowed
     * @param apy Annual percentage yield in basis points
     * @param borrower Address of the borrower
     * @param initialLiquidity Initial liquidity to provide
     * @return creditLineToken Address of the created credit line token
     */
    function createCreditLine(
        string memory name,
        string memory symbol,
        address underlyingAsset,
        uint256 creditLimit,
        uint256 apy,
        address borrower,
        uint256 initialLiquidity
    ) external onlyOwner returns (address creditLineToken) {
        (bytes32 creationId, address token) = this.step1_DeployAndInitialize(name, symbol, underlyingAsset, creditLimit, apy, borrower, initialLiquidity);
        this.step2_MintAndApprove(creationId);
        this.step3_CreatePool(creationId);
        this.step4_Finalize(creationId);
        return token;
    }
}
