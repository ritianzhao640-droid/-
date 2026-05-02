/**
 * 链上数据同步模块
 * 定时从 BSC 链拉取数据，写入缓存
 */

require('dotenv').config();
const { ethers } = require('ethers');
const cache = require('./cache');

// ==================== RPC 配置 ====================
const RPC_URLS = [
  process.env.BSC_RPC_URL,
  'https://bsc-rpc.publicnode.com',
  'https://binance.llamarpc.com',
  'https://bsc.drpc.org',
  'https://bsc-dataseed.binance.org/',
].filter(Boolean);

// ==================== 合约配置 ====================
const CONTRACTS = {
  vault: '0x97C28ef2a1bC30b4418B67dA354015707d20e82D',
  token: '0x5F7dc0E34920Aa46ae8c7519a35D9d54A5f57777',
  burnDistributor: '0xaBd5898a81fD48eDBD495895b4a0113455ad825b',
  router: '0x0Dc433fc888Da1356a6F11AD7EcAce3c403c36a7',
};

// 简化 ABI（只包含需要的方法）
const ABIS = {
  vault: [
    'function overview() view returns (uint256 _vaultBnbBalance, uint256 _totalStakedBnb, uint256 _vaultSlisBalance)',
  ],
  token: [
    'function balanceOf(address account) view returns (uint256)',
  ],
  burnDistributor: [
    'function totalActualBurned() view returns (uint256)',
    'function currentDayId() view returns (uint256)',
    'function dayDuration() view returns (uint256)',
    'function burnUserDetail(address vault, address user) view returns (uint256 pendingTotal, uint256 pendingDaily, uint256 pendingWeighted, uint256 pendingInvite, uint256 selfBurned, uint256 weight, uint256 todayBurned)',
  ],
  router: [
    'function burnDay(address vault, uint256 dayId) view returns (uint256 rewardPot, uint256 totalBurned, uint256 participantCount, bool finalized, address[10] users, uint256[10] amounts)',
  ],
};

// 里程碑配置
const BURN_GOAL = ethers.parseUnits('1000000000', 18); // 10亿
const MILESTONE_STEP = ethers.parseUnits('10000000', 18); // 1000万

// ==================== 工具函数 ====================
function fmt(value, decimals = 4) {
  if (!value || value === 0n) return '0';
  const s = ethers.formatUnits(value, 18);
  const n = parseFloat(s);
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtInt(value) {
  if (!value || value === 0n) return '0';
  const n = parseFloat(ethers.formatUnits(value, 18));
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '—';
}

async function createProvider() {
  for (const url of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber();
      console.log('[Sync] 已连接到 RPC:', url);
      return provider;
    } catch (error) {
      console.log('[Sync] RPC 失败:', url, error.message);
    }
  }
  throw new Error('所有 RPC 节点均无法连接');
}

// ==================== 数据同步 ====================
async function syncGlobalData() {
  const provider = await createProvider();
  const vault = new ethers.Contract(CONTRACTS.vault, ABIS.vault, provider);
  const token = new ethers.Contract(CONTRACTS.token, ABIS.token, provider);
  const burnDistributor = new ethers.Contract(CONTRACTS.burnDistributor, ABIS.burnDistributor, provider);
  const router = new ethers.Contract(CONTRACTS.router, ABIS.router, provider);

  // 并行查询核心数据
  const [totalBurned, ov, dayId, dayDur] = await Promise.all([
    burnDistributor.totalActualBurned(),
    vault.overview(),
    burnDistributor.currentDayId(),
    burnDistributor.dayDuration(),
  ]);

  // 项目方燃烧
  let projectBurned = 0n;
  try {
    projectBurned = await token.balanceOf(CONTRACTS.token);
  } catch (e) {
    console.warn('[Sync] token.balanceOf 失败:', e.message);
  }

  const globalDisplay = totalBurned + projectBurned;
  const progress = Math.min(Number(globalDisplay * 10000n / BURN_GOAL) / 100, 100);
  const nextMilestone = (globalDisplay / MILESTONE_STEP + 1n) * MILESTONE_STEP;

  // 倒计时
  const nextDayEnd = (dayId + 1n) * dayDur;
  const now = Math.floor(Date.now() / 1000);
  const countdown = Math.max(0, Number(nextDayEnd) - now);

  const globalData = {
    totalBurned: fmtInt(globalDisplay),
    totalUsersBurned: fmtInt(totalBurned),
    projectBurned: fmtInt(projectBurned),
    vaultBnb: fmt(ov._vaultBnbBalance),
    stakedBnb: fmt(ov._totalStakedBnb),
    slisTotal: fmt(ov._vaultSlisBalance),
    progress,
    progressText: `已燃烧 ${fmt(globalDisplay, 4)} / 目标 10亿`,
    nextMilestone: fmt(nextMilestone, 0),
    currentDayId: Number(dayId),
    displayRound: Number(dayId - 20573n),
    countdown,
    updatedAt: new Date().toISOString(),
  };

  cache.set('global', globalData);
  console.log('[Sync] 全局数据已更新');

  // 同步日榜
  await syncDailyBoard(router, dayId);
  // 同步历史日榜
  await syncHistoryBoards(router, Number(dayId));

  provider.destroy();
}

async function syncDailyBoard(router, dayId) {
  try {
    const bd = await router.burnDay(CONTRACTS.vault, dayId);
    const users = [];
    for (let i = 0; i < 10; i++) {
      const addr = bd.users[i];
      const amt = bd.amounts[i];
      if (addr === ethers.ZeroAddress) break;
      users.push({
        rank: i + 1,
        address: addr,
        shortAddress: shortAddr(addr),
        amount: fmtInt(amt),
        amountRaw: amt.toString(),
      });
    }

    const boardData = {
      dayId: Number(dayId),
      displayRound: Number(dayId - 20573n),
      rewardPot: fmt(bd.rewardPot),
      totalBurned: fmtInt(bd.totalBurned),
      participantCount: Number(bd.participantCount),
      finalized: bd.finalized,
      users,
      updatedAt: new Date().toISOString(),
    };

    cache.set('dailyBoard', boardData);
    console.log('[Sync] 日榜已更新，参与者:', users.length);
  } catch (e) {
    console.error('[Sync] 日榜同步失败:', e.message);
  }
}

async function syncHistoryBoards(router, currentDayId) {
  try {
    const history = [];
    const startDay = Math.max(0, currentDayId - 5);

    for (let d = currentDayId - 1; d > startDay; d--) {
      try {
        const bd = await router.burnDay(CONTRACTS.vault, d);
        if (Number(bd.participantCount) === 0) continue;

        const top3 = [];
        for (let i = 0; i < 3; i++) {
          const addr = bd.users[i];
          const amt = bd.amounts[i];
          if (addr === ethers.ZeroAddress) break;
          top3.push({
            rank: i + 1,
            address: addr,
            shortAddress: shortAddr(addr),
            amount: fmtInt(amt),
          });
        }

        history.push({
          dayId: d,
          displayRound: d - 20573,
          rewardPot: fmt(bd.rewardPot),
          totalBurned: fmtInt(bd.totalBurned),
          participantCount: Number(bd.participantCount),
          finalized: bd.finalized,
          top3,
        });
      } catch (e) {
        console.warn('[Sync] 历史日榜跳过 day', d, e.message);
      }
    }

    cache.set('historyBoards', history);
    console.log('[Sync] 历史日榜已更新，期数:', history.length);
  } catch (e) {
    console.error('[Sync] 历史日榜同步失败:', e.message);
  }
}

// 单独运行同步（用于命令行或定时任务）
async function runSync() {
  if (cache.getAll().isUpdating) {
    console.log('[Sync] 已有同步任务在进行中，跳过');
    return;
  }

  cache.setUpdating(true);
  const start = Date.now();
  console.log('[Sync] 开始同步...', new Date().toLocaleString('zh-CN'));

  try {
    await syncGlobalData();
    console.log('[Sync] 同步完成，耗时', Date.now() - start, 'ms');
  } catch (e) {
    console.error('[Sync] 同步失败:', e.message);
  } finally {
    cache.setUpdating(false);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runSync().then(() => process.exit(0));
}

module.exports = { runSync, syncGlobalData };
