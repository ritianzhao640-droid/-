/**
 * 币安长征 (BACZ) — 合约配置
 *
 * 使用说明：
 * 1. 将每个 CONTRACT 下的 address 替换为真实部署地址
 * 2. 将每个 ABI 数组替换为真实编译后的 ABI（可从 BSCScan 或 Hardhat/Foundry 输出复制）
 * 3. 如需切换测试网/主网，修改 RPC_URL 和 CHAIN_ID
 */

// ==================== 网络配置 ====================
const NETWORK = {
  name: 'BSC Mainnet',      // 或 'BSC Testnet'
  rpcUrl: 'https://bsc-dataseed.binance.org/',  // 主网
  // rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/', // 测试网
  chainId: 56,              // BSC 主网: 56, 测试网: 97
  currencySymbol: 'BNB',
  blockExplorer: 'https://bscscan.com',
};

// ==================== 合约地址 & ABI ====================

// 1. 代币合约 (BACZ ERC-20)
const TOKEN_CONTRACT = {
  name: 'BACZToken',
  address: '0x513Cc2caCae84A14C4dc793e121D04783DE87777',
  abi: [
    {"inputs":[{"internalType":"uint256","name":"minLiqThreshold_","type":"uint256"},{"internalType":"uint256","name":"startLiqThreshold_","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"bytes","name":"reason","type":"bytes"}],"name":"DividendShareUpdateFailed","type":"error"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},
    {"anonymous":false,"inputs":[],"name":"EIP712DomainChanged","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"fromState","type":"uint8"},{"indexed":false,"internalType":"uint8","name":"toState","type":"uint8"}],"name":"PoolStateChanged","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes","name":"reason","type":"bytes"}],"name":"TaxLiquidationError","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"TokensBurned","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"TransferFlapToken","type":"event"},
    {"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"MIN_LIQ_THRESHOLD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"START_LIQ_THRESHOLD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"antiFarmerDuration","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"antiFarmerExpirationTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"buyTaxRate","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"dividendContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"eip712Domain","outputs":[{"internalType":"bytes1","name":"fields","type":"bytes1"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"version","type":"string"},{"internalType":"uint256","name":"chainId","type":"uint256"},{"internalType":"address","name":"verifyingContract","type":"address"},{"internalType":"bytes32","name":"salt","type":"bytes32"},{"internalType":"uint256[]","name":"extensions","type":"uint256[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"finalizeMigration","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"getPoolStateData","outputs":[{"internalType":"enum IFlapTaxTokenV3.PoolState","name":"currentState","type":"uint8"},{"internalType":"uint16","name":"currentBuyTaxRate","type":"uint16"},{"internalType":"uint16","name":"currentSellTaxRate","type":"uint16"},{"internalType":"uint256","name":"currentLiquidationThreshold","type":"uint256"},{"internalType":"uint256","name":"currentTaxExpirationTime","type":"uint256"},{"internalType":"uint256","name":"currentAntiFarmerExpirationTime","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"initialLiquidationThreshold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"string","name":"meta","type":"string"},{"internalType":"uint16","name":"buyTax","type":"uint16"},{"internalType":"uint16","name":"sellTax","type":"uint16"},{"internalType":"address","name":"taxProcessor","type":"address"},{"internalType":"address","name":"dividendContract","type":"address"},{"internalType":"address","name":"quoteToken","type":"address"},{"internalType":"uint256","name":"liqExpectedOutputAmount","type":"uint256"},{"internalType":"uint256","name":"taxDuration","type":"uint256"},{"internalType":"address[]","name":"pools","type":"address[]"},{"internalType":"address","name":"v2Router","type":"address"},{"internalType":"uint256","name":"antiFarmerDuration","type":"uint256"}],"internalType":"struct IFlapTaxTokenV3.InitParams","name":"params","type":"tuple"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"liqExpectedOutputAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"liquidationThreshold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"mainPool","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"maxSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"metaURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"poolState","outputs":[{"internalType":"uint8","name":"state","type":"uint8"},{"internalType":"uint16","name":"buyTaxRate","type":"uint16"},{"internalType":"uint16","name":"sellTaxRate","type":"uint16"},{"internalType":"bool","name":"notLiquidating","type":"bool"},{"internalType":"uint96","name":"liquidationThreshold","type":"uint96"},{"internalType":"uint64","name":"taxExpirationTime","type":"uint64"},{"internalType":"uint48","name":"antiFarmerExpirationTime","type":"uint48"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pools","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"quoteToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"sellTaxRate","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"startMigration","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"state","outputs":[{"internalType":"enum IFlapTaxTokenV3.PoolState","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"taxExpirationTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"taxProcessor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"taxRate","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"v2Router","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
  ],
};

// 2. 金库合约 (Vault / Treasury)
const VAULT_CONTRACT = {
  name: 'BACZVault',
  address: '0x2e6ba387291aC4F2175616208f30295Cca67d223',
  abi: [
    {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
    {"inputs":[],"name":"AlreadyInitialized","type":"error"},
    {"inputs":[],"name":"Reentrancy","type":"error"},
    {"inputs":[],"name":"TransferFailed","type":"error"},
    {"inputs":[],"name":"Unauthorized","type":"error"},
    {"inputs":[{"internalType":"uint256","name":"chainId","type":"uint256"}],"name":"UnsupportedChain","type":"error"},
    {"inputs":[],"name":"ZeroAddress","type":"error"},
    {"inputs":[],"name":"ZeroAmount","type":"error"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldValue","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newValue","type":"uint256"}],"name":"AutoStakeThresholdUpdated","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldValue","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newValue","type":"uint256"}],"name":"MarketingAutoSendThresholdUpdated","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"MarketingAutoSent","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"MarketingClaimed","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"oldWallet","type":"address"},{"indexed":false,"internalType":"address","name":"newWallet","type":"address"}],"name":"MarketingWalletUpdated","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"marketingSlis","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dailyRankSlis","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"weightPoolSlis","type":"uint256"}],"name":"StakeSplit","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountBNB","type":"uint256"}],"name":"TaxReceived","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amountBNB","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"slisReceived","type":"uint256"}],"name":"TaxStaked","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"address","name":"inviter","type":"address"}],"name":"UserBurned","type":"event"},
    {"inputs":[],"name":"BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"DAILY_RANK_BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"MARKETING_BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"WEIGHT_POOL_BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"autoStakeThreshold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"inviter","type":"address"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"burnDistributor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"burnInfo","outputs":[{"internalType":"uint256","name":"rawBurned","type":"uint256"},{"internalType":"uint256","name":"weight","type":"uint256"},{"internalType":"address","name":"inviter","type":"address"},{"internalType":"bool","name":"hasInviter","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"claimBurnReward","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"claimInviteReward","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"claimMarketing","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"description","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"components":[{"internalType":"address","name":"taxToken","type":"address"},{"internalType":"address","name":"listaStakeManager","type":"address"},{"internalType":"address","name":"slisBNB","type":"address"},{"internalType":"address","name":"marketingWallet","type":"address"},{"internalType":"uint256","name":"autoStakeThreshold","type":"uint256"},{"internalType":"uint256","name":"marketingAutoSendThreshold","type":"uint256"},{"internalType":"address","name":"burnDistributor","type":"address"}],"internalType":"struct MEYieldVault.InitParams","name":"p","type":"tuple"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"initialized","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"listaStakeManager","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"marketingAutoSendThreshold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"marketingWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"overview","outputs":[{"internalType":"address","name":"_listaStakeManager","type":"address"},{"internalType":"uint16","name":"_marketingSharePercent","type":"uint16"},{"internalType":"uint16","name":"_dailyRankSharePercent","type":"uint16"},{"internalType":"uint16","name":"_weightPoolSharePercent","type":"uint16"},{"internalType":"uint256","name":"_vaultBnbBalance","type":"uint256"},{"internalType":"uint256","name":"_totalStakedBnb","type":"uint256"},{"internalType":"uint256","name":"_vaultSlisBalance","type":"uint256"},{"internalType":"uint256","name":"_myPendingBurnDividend","type":"uint256"},{"internalType":"uint256","name":"_myPendingInviteReward","type":"uint256"},{"internalType":"uint256","name":"_myCumulativeBurned","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"pendingBurnReward","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"pendingInviteReward","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"pendingMarketingSlis","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"pendingTaxBNB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"newThreshold","type":"uint256"}],"name":"setAutoStakeThreshold","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"newThreshold","type":"uint256"}],"name":"setMarketingAutoSendThreshold","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"newWallet","type":"address"}],"name":"setMarketingWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"slisBNB","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"stakePendingTax","outputs":[{"internalType":"bool","name":"ok","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"taxToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalSlisReceived","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalStakedBNB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vaultUISchema","outputs":[{"components":[{"internalType":"string","name":"vaultType","type":"string"},{"internalType":"string","name":"description","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"fieldType","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"uint8","name":"decimals","type":"uint8"}],"internalType":"struct FieldDescriptor[]","name":"inputs","type":"tuple[]"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"fieldType","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"uint8","name":"decimals","type":"uint8"}],"internalType":"struct FieldDescriptor[]","name":"outputs","type":"tuple[]"},{"components":[{"internalType":"string","name":"tokenType","type":"string"},{"internalType":"string","name":"amountFieldName","type":"string"}],"internalType":"struct ApproveAction[]","name":"approvals","type":"tuple[]"},{"internalType":"bool","name":"isInputArray","type":"bool"},{"internalType":"bool","name":"isOutputArray","type":"bool"},{"internalType":"bool","name":"isWriteMethod","type":"bool"}],"internalType":"struct VaultMethodSchema[]","name":"methods","type":"tuple[]"}],"internalType":"struct VaultUISchema","name":"schema","type":"tuple"}],"stateMutability":"pure","type":"function"},
    {"stateMutability":"payable","type":"receive"}
  ],
};

// 3. 燃烧合约 (Burn)
const BURN_CONTRACT = {
  name: 'BACZBurn',
  address: '0xf83E1a6e9A0A1Bc11206B1CCe3f916DCF974723F',
  abi: [
    {"inputs":[{"internalType":"address","name":"token_","type":"address"},{"internalType":"address","name":"rewardToken_","type":"address"},{"internalType":"address","name":"admin_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
    {"inputs":[],"name":"AlreadyInitialized","type":"error"},
    {"inputs":[],"name":"InvalidInviter","type":"error"},
    {"inputs":[],"name":"InvalidInviterChain","type":"error"},
    {"inputs":[],"name":"InvalidRank","type":"error"},
    {"inputs":[],"name":"OnlyVault","type":"error"},
    {"inputs":[],"name":"Reentrancy","type":"error"},
    {"inputs":[],"name":"TransferFailed","type":"error"},
    {"inputs":[],"name":"Unauthorized","type":"error"},
    {"inputs":[],"name":"ZeroAddress","type":"error"},
    {"inputs":[],"name":"ZeroAmount","type":"error"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"inputAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"actualBurnAmount","type":"uint256"},{"indexed":true,"internalType":"address","name":"inviter","type":"address"},{"indexed":false,"internalType":"uint256","name":"inviterReward","type":"uint256"},{"indexed":true,"internalType":"address","name":"inviter2","type":"address"},{"indexed":false,"internalType":"uint256","name":"inviter2Reward","type":"uint256"}],"name":"BurnProcessed","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"BurnRewardAdded","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"BurnRewardClaimed","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"dayId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dailyAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"weightedAmount","type":"uint256"}],"name":"BurnRewardSplitAdded","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"dayId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"DailyRewardAdded","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"dayId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"rewardPot","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"distributed","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"rolledToWeight","type":"uint256"}],"name":"DailyRewardFinalized","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"InviteRewardClaimed","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"inviter","type":"address"}],"name":"InviterBound","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"vault","type":"address"}],"name":"VaultInitialized","type":"event"},
    {"inputs":[],"name":"BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"DAY_DURATION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"DEAD","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"L1_BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"L2_BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"MAX_AUTO_FINALIZE_DAYS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"MAX_INVITER_HOPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"PRECISION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"accRewardPerWeight","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"burnInfo","outputs":[{"internalType":"uint256","name":"rawBurned","type":"uint256"},{"internalType":"uint256","name":"weight","type":"uint256"},{"internalType":"address","name":"inviter","type":"address"},{"internalType":"bool","name":"hasInviter","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"burnWeight","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"address","name":"inviterCandidate","type":"address"}],"name":"canBindInviter","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"claimBurnRewardFor","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"claimInviteRewardFor","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"cumulativeRawBurned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"currentDayId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"dailyBurned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"dayCursorInitialized","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"dayDuration","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dayId","type":"uint256"}],"name":"dayIsFinalized","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dayId","type":"uint256"}],"name":"dayParticipantCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dayId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"dayRankRewardPreview","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dayId","type":"uint256"}],"name":"dayRewardPot","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dayId","type":"uint256"}],"name":"daySummary","outputs":[{"internalType":"uint256","name":"rewardPot","type":"uint256"},{"internalType":"uint256","name":"totalBurned","type":"uint256"},{"internalType":"uint256","name":"participantCount","type":"uint256"},{"internalType":"bool","name":"finalized","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dayId","type":"uint256"}],"name":"dayTop10","outputs":[{"internalType":"address[10]","name":"users","type":"address[10]"},{"internalType":"uint256[10]","name":"amounts","type":"uint256[10]"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dayId","type":"uint256"},{"internalType":"uint256","name":"rankIndex","type":"uint256"}],"name":"dayTopAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dayId","type":"uint256"},{"internalType":"uint256","name":"rankIndex","type":"uint256"}],"name":"dayTopUser","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dayId","type":"uint256"}],"name":"dayTotalBurned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"finalizeDay","outputs":[{"internalType":"bool","name":"finalized","type":"bool"},{"internalType":"uint256","name":"dayId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"maxDays","type":"uint256"}],"name":"finalizeDays","outputs":[{"internalType":"uint256","name":"processed","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"vault_","type":"address"}],"name":"initializeVault","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"address","name":"inviterCandidate","type":"address"}],"name":"inviteBindingStatus","outputs":[{"internalType":"bool","name":"canBind","type":"bool"},{"internalType":"uint8","name":"reasonCode","type":"uint8"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"inviterOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"startUser","type":"address"},{"internalType":"address","name":"target","type":"address"}],"name":"isInInviterChain","outputs":[{"internalType":"bool","name":"found","type":"bool"},{"internalType":"bool","name":"chainValid","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"lastProcessedDay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"notifyReward","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"dailyAmount","type":"uint256"},{"internalType":"uint256","name":"weightedAmount","type":"uint256"}],"name":"notifyRewardSplit","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"inviterCandidate","type":"address"}],"name":"onBurn","outputs":[{"internalType":"uint256","name":"actualBurn","type":"uint256"},{"internalType":"uint256","name":"l1Reward","type":"uint256"},{"internalType":"uint256","name":"l2Reward","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pendingBurn","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"pendingBurnReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pendingDailyBurn","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"pendingDailyBurnReward","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pendingInvite","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"pendingInviteReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"pendingRewardCarry","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"pendingWeightedBurnReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"rankIndex","type":"uint256"}],"name":"rankBps","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},
    {"inputs":[],"name":"rankBpsTable","outputs":[{"internalType":"uint256[10]","name":"table","type":"uint256[10]"}],"stateMutability":"pure","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"rewardDebt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"rewardToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalActualBurned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalBurnRewardDistributed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalBurnWeight","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalDailyRewardClaimed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalDailyRewardNotified","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalInviteRewardClaimed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalInviteRewardDistributed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalWeightedRewardClaimed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalWeightedRewardNotified","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vault","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
  ],
};

// 4. 接口/路由合约 (Router / Interface)
const ROUTER_CONTRACT = {
  name: 'BACZRouter',
  address: '0x0Dc433fc888Da1356a6F11AD7EcAce3c403c36a7',
  abi: [
    {"inputs":[{"internalType":"address","name":"vault","type":"address"},{"internalType":"uint256","name":"dayId","type":"uint256"}],"name":"burnDay","outputs":[{"internalType":"uint256","name":"rewardPot","type":"uint256"},{"internalType":"uint256","name":"totalBurned","type":"uint256"},{"internalType":"uint256","name":"participantCount","type":"uint256"},{"internalType":"bool","name":"finalized","type":"bool"},{"internalType":"address[10]","name":"users","type":"address[10]"},{"internalType":"uint256[10]","name":"amounts","type":"uint256[10]"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"vault","type":"address"},{"internalType":"address","name":"user","type":"address"}],"name":"burnInviter","outputs":[{"internalType":"address","name":"inviter","type":"address"},{"internalType":"bool","name":"hasInviter","type":"bool"},{"internalType":"uint256","name":"inviterBurnedAmount","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"vault","type":"address"},{"internalType":"address","name":"user","type":"address"}],"name":"burnUser","outputs":[{"internalType":"uint256","name":"pendingBurn","type":"uint256"},{"internalType":"uint256","name":"pendingInvite","type":"uint256"},{"internalType":"uint256","name":"selfBurned","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"vault","type":"address"},{"internalType":"address","name":"user","type":"address"}],"name":"burnUserDetail","outputs":[{"internalType":"uint256","name":"pendingTotal","type":"uint256"},{"internalType":"uint256","name":"pendingDaily","type":"uint256"},{"internalType":"uint256","name":"pendingWeighted","type":"uint256"},{"internalType":"uint256","name":"pendingInvite","type":"uint256"},{"internalType":"uint256","name":"selfBurned","type":"uint256"},{"internalType":"uint256","name":"weight","type":"uint256"},{"internalType":"uint256","name":"todayBurned","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"vault","type":"address"},{"internalType":"address","name":"user","type":"address"},{"internalType":"address","name":"inviterCandidate","type":"address"}],"name":"inviteCheck","outputs":[{"internalType":"bool","name":"canBind","type":"bool"},{"internalType":"uint8","name":"reasonCode","type":"uint8"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"vault","type":"address"}],"name":"marketing","outputs":[{"internalType":"address","name":"wallet","type":"address"},{"internalType":"uint256","name":"pendingAmount","type":"uint256"},{"internalType":"uint256","name":"threshold","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"vault","type":"address"}],"name":"vaultCore","outputs":[{"internalType":"address","name":"taxToken","type":"address"},{"internalType":"address","name":"slisBNB","type":"address"},{"internalType":"uint256","name":"pendingTaxBnb","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"vault","type":"address"}],"name":"vaultPools","outputs":[{"internalType":"uint256","name":"pendingMarketing","type":"uint256"},{"internalType":"uint256","name":"totalDailyNotified","type":"uint256"},{"internalType":"uint256","name":"totalWeightedNotified","type":"uint256"},{"internalType":"uint256","name":"totalDailyClaimed","type":"uint256"},{"internalType":"uint256","name":"totalWeightedClaimed","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"vault","type":"address"}],"name":"vaultStake","outputs":[{"internalType":"uint256","name":"totalStakedBnb","type":"uint256"},{"internalType":"uint256","name":"totalSlisReceived","type":"uint256"},{"internalType":"uint256","name":"vaultSlisBalance","type":"uint256"}],"stateMutability":"view","type":"function"}
  ],
};

// ==================== 便捷导出 ====================
const CONTRACTS = {
  token: TOKEN_CONTRACT,
  vault: VAULT_CONTRACT,
  burn: BURN_CONTRACT,
  router: ROUTER_CONTRACT,
};

// ==================== Ethers.js / Web3 初始化示例 ====================
/**
 * 初始化 Provider & Contract 实例（在页面 JS 中使用）
 *
 * const provider = new ethers.providers.Web3Provider(window.ethereum);
 * const signer = provider.getSigner();
 *
 * const token = new ethers.Contract(TOKEN_CONTRACT.address, TOKEN_CONTRACT.abi, signer);
 * const vault = new ethers.Contract(VAULT_CONTRACT.address, VAULT_CONTRACT.abi, signer);
 * const burn = new ethers.Contract(BURN_CONTRACT.address, BURN_CONTRACT.abi, signer);
 * const router = new ethers.Contract(ROUTER_CONTRACT.address, ROUTER_CONTRACT.abi, signer);
 *
 * // 读取示例
 * const balance = await token.balanceOf(userAddress);
 * const totalBurned = await burn.totalActualBurned();
 *
 * // 写入示例
 * const tx = await vault.burn(ethers.utils.parseUnits('10000', 18), inviterAddress);
 * await tx.wait();
 */

// ==================== 前端可直接读取的常量 ====================
const APP_CONFIG = {
  // 燃烧目标
  burnGoal: ethers.utils.parseUnits('1000000000', 18), // 10亿
  // 里程碑间隔
  milestoneStep: ethers.utils.parseUnits('10000000', 18), // 1000万
  // 代币精度
  decimals: 18,
  // 邀请分润比例（基点，1000 = 10%）
  l1Rate: 1000,
  l2Rate: 500,
};

// 兼容 CommonJS / ES Module / 浏览器全局
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NETWORK, CONTRACTS, APP_CONFIG, TOKEN_CONTRACT, VAULT_CONTRACT, BURN_CONTRACT, ROUTER_CONTRACT };
}
