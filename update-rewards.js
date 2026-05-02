/**
 * 奖励排名数据更新脚本
 * 每天自动运行两次，查询链上数据并生成 rewards-data.json
 *
 * 用法:
 *   node update-rewards.js
 *
 * 输出:
 *   rewards-data.json - 供前端页面直接读取的静态数据
 */

const fs = require('fs');
const { ethers } = require('ethers');

// ==================== 配置 ====================
const RPC_URLS = [
  'https://bsc-rpc.publicnode.com',
  'https://binance.llamarpc.com',
  'https://bsc.drpc.org',
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.binance.org/',
];

const VAULT_ADDRESS = '0x97C28ef2a1bC30b4418B67dA354015707d20e82D';
const TOKEN_ADDRESS = '0x5F7dc0E34920Aa46ae8c7519a35D9d54A5f57777';
const BURN_CONTRACT_ADDRESS = '0xaBd5898a81fD48eDBD495895b4a0113455ad825b';
const ROUTER_ADDRESS = '0x0Dc433fc888Da1356a6F11AD7EcAce3c403c36a7';

// Router ABI (只需要 burnDay, rankBpsTable, burnUserDetail)
const ROUTER_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "vault", "type": "address" },
      { "internalType": "uint256", "name": "dayId", "type": "uint256" }
    ],
    "name": "burnDay",
    "outputs": [
      { "internalType": "uint256", "name": "rewardPot", "type": "uint256" },
      { "internalType": "uint256", "name": "totalBurned", "type": "uint256" },
      { "internalType": "uint256", "name": "participantCount", "type": "uint256" },
      { "internalType": "bool", "name": "finalized", "type": "bool" },
      { "internalType": "address[10]", "name": "users", "type": "address[10]" },
      { "internalType": "uint256[10]", "name": "amounts", "type": "uint256[10]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rankBpsTable",
    "outputs": [
      { "internalType": "uint256[10]", "name": "table", "type": "uint256[10]" }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "vault", "type": "address" },
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "burnUserDetail",
    "outputs": [
      { "internalType": "uint256", "name": "pendingTotal", "type": "uint256" },
      { "internalType": "uint256", "name": "pendingDaily", "type": "uint256" },
      { "internalType": "uint256", "name": "pendingWeighted", "type": "uint256" },
      { "internalType": "uint256", "name": "pendingInvite", "type": "uint256" },
      { "internalType": "uint256", "name": "selfBurned", "type": "uint256" },
      { "internalType": "uint256", "name": "weight", "type": "uint256" },
      { "internalType": "uint256", "name": "todayBurned", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Burn Distributor ABI
const BURN_ABI = [
  {
    "inputs": [],
    "name": "currentDayId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "pendingBurnReward",
    "outputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "BurnRewardClaimed",
    "type": "event"
  }
];

// ==================== 工具函数 ====================

function fmt(value, decimals = 4) {
  if (!value) return '0';
  const s = ethers.formatUnits(value, 18);
  const n = parseFloat(s);
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '—';
}

async function createProvider() {
  for (const url of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber();
      console.log(`已连接到 RPC: ${url}`);
      return provider;
    } catch (error) {
      console.log(`RPC 连接失败: ${url} (${error.message})`);
      continue;
    }
  }
  throw new Error('所有 RPC 节点均无法连接');
}

// ==================== 主逻辑 ====================

async function main() {
  console.log('\n========================================');
  console.log('  奖励排名数据更新');
  console.log('  ' + new Date().toLocaleString('zh-CN'));
  console.log('========================================\n');

  try {
    const provider = await createProvider();

    // 合约实例
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);
    const burnContract = new ethers.Contract(BURN_CONTRACT_ADDRESS, BURN_ABI, provider);

    // 获取当前 dayId
    const currentDayId = await burnContract.currentDayId();
    console.log(`当前 DayId: ${currentDayId}`);

    // 获取 rankBps 表
    let rankBpsTable;
    try {
      rankBpsTable = await router.rankBpsTable();
    } catch (e) {
      console.log('使用默认 rankBps 表');
      rankBpsTable = [2500, 2000, 1500, 1000, 800, 600, 500, 400, 300, 200];
    }

    // 查询最近 30 期日榜
    const dailyMap = {};
    const startDay = Math.max(0, Number(currentDayId) - 30);

    for (let d = Number(currentDayId) - 1; d >= startDay; d--) {
      try {
        const bd = await router.burnDay(VAULT_ADDRESS, d);
        if (Number(bd.participantCount) === 0) continue;

        const rewardPot = bd.rewardPot;
        if (!rewardPot || rewardPot === 0n) continue;

        for (let i = 0; i < 10; i++) {
          const addr = bd.users[i];
          if (!addr || addr === ethers.ZeroAddress) continue;

          const bps = rankBpsTable[i] || 0;
          if (bps === 0) continue;

          const share = (rewardPot * BigInt(bps)) / 10000n;

          if (!dailyMap[addr]) dailyMap[addr] = 0n;
          dailyMap[addr] += share;
        }
      } catch (e) {
        // 忽略单期错误
      }
    }

    console.log(`日榜地址数: ${Object.keys(dailyMap).length}`);

    // 查询总榜 pendingBurnReward
    const totalMap = {};
    const dailyAddrs = Object.keys(dailyMap);

    for (const addr of dailyAddrs) {
      try {
        const pending = await burnContract.pendingBurnReward(addr);
        totalMap[addr] = pending;
      } catch (e) {
        totalMap[addr] = 0n;
      }
    }

    // 查询 BurnRewardClaimed 事件（分块）
    const latestBlock = await provider.getBlockNumber();
    const blockStep = 15000;
    const filter = burnContract.filters.BurnRewardClaimed();

    for (let start = Math.max(0, latestBlock - blockStep * 6); start <= latestBlock; start += blockStep) {
      const end = Math.min(start + blockStep, latestBlock);
      try {
        const events = await burnContract.queryFilter(filter, start, end);
        for (const ev of events) {
          const addr = ev.args.user;
          const amt = ev.args.amount;
          if (!totalMap[addr]) totalMap[addr] = 0n;
          totalMap[addr] += amt;
        }
      } catch (e) {
        // 单块失败继续
      }
    }

    // 排序
    const dailySorted = Object.entries(dailyMap)
      .map(([addr, amt]) => ({ addr, amt: amt.toString(), amtFmt: fmt(amt) }))
      .sort((a, b) => (BigInt(b.amt) > BigInt(a.amt) ? 1 : -1))
      .slice(0, 10);

    const totalSorted = Object.entries(totalMap)
      .map(([addr, amt]) => ({ addr, amt: amt.toString(), amtFmt: fmt(amt) }))
      .sort((a, b) => (BigInt(b.amt) > BigInt(a.amt) ? 1 : -1))
      .slice(0, 10);

    // 生成数据文件
    const output = {
      updatedAt: new Date().toISOString(),
      dayId: Number(currentDayId),
      dailyRank: dailySorted,
      totalRank: totalSorted,
    };

    fs.writeFileSync('rewards-data.json', JSON.stringify(output, null, 2));

    console.log('\n========================================');
    console.log('  更新完成');
    console.log(`  日榜 TOP1: ${dailySorted[0]?.amtFmt || 'N/A'} slisBNB`);
    console.log(`  总榜 TOP1: ${totalSorted[0]?.amtFmt || 'N/A'} slisBNB`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n更新失败:', error.message);
    process.exit(1);
  }
}

main();
