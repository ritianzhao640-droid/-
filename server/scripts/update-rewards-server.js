/**
 * 奖励排名数据更新脚本（服务器版）
 * 每天自动运行，查询链上数据并生成 rewards-data.json
 *
 * 用法:
 *   node scripts/update-rewards-server.js
 *
 * 输出:
 *   data/rewards-data.json - 供 API 读取的静态数据
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// ==================== 配置 ====================
const RPC_URLS = [
  process.env.BSC_RPC_URL,
  'https://bsc-rpc.publicnode.com',
  'https://binance.llamarpc.com',
  'https://bsc.drpc.org',
  'https://bsc-dataseed.binance.org/',
].filter(Boolean);

const VAULT_ADDRESS = '0x97C28ef2a1bC30b4418B67dA354015707d20e82D';
const TOKEN_ADDRESS = '0x5F7dc0E34920Aa46ae8c7519a35D9d54A5f57777';
const BURN_CONTRACT_ADDRESS = '0xaBd5898a81fD48eDBD495895b4a0113455ad825b';
const ROUTER_ADDRESS = '0x0Dc433fc888Da1356a6F11AD7EcAce3c403c36a7';

const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'rewards-data.json');

// Router ABI
const ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'vault', type: 'address' },
      { internalType: 'uint256', name: 'dayId', type: 'uint256' },
    ],
    name: 'burnDay',
    outputs: [
      { internalType: 'uint256', name: 'rewardPot', type: 'uint256' },
      { internalType: 'uint256', name: 'totalBurned', type: 'uint256' },
      { internalType: 'uint256', name: 'participantCount', type: 'uint256' },
      { internalType: 'bool', name: 'finalized', type: 'bool' },
      { internalType: 'address[10]', name: 'users', type: 'address[10]' },
      { internalType: 'uint256[10]', name: 'amounts', type: 'uint256[10]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'rankBpsTable',
    outputs: [{ internalType: 'uint256[10]', name: 'table', type: 'uint256[10]' }],
    stateMutability: 'pure',
    type: 'function',
  },
];

const BURN_ABI = [
  {
    inputs: [],
    name: 'currentDayId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'pendingBurnReward',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'BurnRewardClaimed',
    type: 'event',
  },
];

// ==================== 工具函数 ====================
function fmt(value, decimals = 4) {
  if (!value || value === 0n) return '0';
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
      console.log(`[Rewards] 已连接到 RPC: ${url}`);
      return provider;
    } catch (error) {
      console.log(`[Rewards] RPC 失败: ${url} (${error.message})`);
    }
  }
  throw new Error('所有 RPC 节点均无法连接');
}

// ==================== 主逻辑 ====================
async function main() {
  console.log('\n========================================');
  console.log('  奖励排名数据更新（服务器版）');
  console.log('  ' + new Date().toLocaleString('zh-CN'));
  console.log('========================================\n');

  try {
    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const provider = await createProvider();
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);
    const burnContract = new ethers.Contract(BURN_CONTRACT_ADDRESS, BURN_ABI, provider);

    // 获取当前 dayId
    const currentDayId = await burnContract.currentDayId();
    console.log(`[Rewards] 当前 DayId: ${currentDayId}`);

    // 获取 rankBps 表
    let rankBpsTable;
    try {
      rankBpsTable = await router.rankBpsTable();
    } catch (e) {
      console.log('[Rewards] 使用默认 rankBps 表');
      rankBpsTable = [2500n, 2000n, 1500n, 1000n, 800n, 600n, 500n, 400n, 300n, 200n];
    }

    // 查询最近 30 期日榜
    const dailyMap = {};
    const startDay = Math.max(0, Number(currentDayId) - 30);

    for (let d = Number(currentDayId) - 1; d >= startDay; d--) {
      try {
        const bd = await router.burnDay(VAULT_ADDRESS, d);
        if (Number(bd.participantCount) === 0) continue;
        if (!bd.rewardPot || bd.rewardPot === 0n) continue;

        for (let i = 0; i < 10; i++) {
          const addr = bd.users[i];
          if (!addr || addr === ethers.ZeroAddress) continue;
          const bps = rankBpsTable[i] || 0n;
          if (bps === 0n) continue;

          const share = (bd.rewardPot * bps) / 10000n;
          if (!dailyMap[addr]) dailyMap[addr] = 0n;
          dailyMap[addr] += share;
        }
      } catch (e) {
        // 忽略单期错误
      }
    }

    console.log(`[Rewards] 日榜地址数: ${Object.keys(dailyMap).length}`);

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

    // 查询 BurnRewardClaimed 事件
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

    // 排序并格式化
    const dailySorted = Object.entries(dailyMap)
      .map(([addr, amt]) => ({ addr, shortAddr: shortAddr(addr), amt: amt.toString(), amtFmt: fmt(amt) }))
      .sort((a, b) => (BigInt(b.amt) > BigInt(a.amt) ? 1 : -1))
      .slice(0, 10);

    const totalSorted = Object.entries(totalMap)
      .map(([addr, amt]) => ({ addr, shortAddr: shortAddr(addr), amt: amt.toString(), amtFmt: fmt(amt) }))
      .sort((a, b) => (BigInt(b.amt) > BigInt(a.amt) ? 1 : -1))
      .slice(0, 10);

    // 生成数据文件
    const output = {
      updatedAt: new Date().toISOString(),
      dayId: Number(currentDayId),
      dailyRank: dailySorted,
      totalRank: totalSorted,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

    console.log('\n========================================');
    console.log('  更新完成');
    console.log(`  日榜 TOP1: ${dailySorted[0]?.amtFmt || 'N/A'} slisBNB`);
    console.log(`  总榜 TOP1: ${totalSorted[0]?.amtFmt || 'N/A'} slisBNB`);
    console.log('========================================\n');

    provider.destroy();
  } catch (error) {
    console.error('\n[Rewards] 更新失败:', error.message);
    process.exit(1);
  }
}

main();
