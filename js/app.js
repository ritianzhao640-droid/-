/**
 * 🚀 币安长征 DApp - 优化版 JavaScript
 * 特性: 懒加载、错误处理、性能监控
 */

// ==================== 配置 ====================
const CONFIG = {
  CACHE_VERSION: 'v2',
  API_TIMEOUT: 10000,
  REFRESH_INTERVAL: 15000,        // 全周期榜单刷新间隔: 15秒
  REALTIME_UPDATE_INTERVAL: 5000, // 实时数据更新: 5秒
  BURN_GOAL: ethers.utils.parseUnits('1000000000', 18),
  MILESTONE_STEP: ethers.utils.parseUnits('10000000', 18),
  DAILY_REWARD_POOL: 0.3,         // 日榜奖励池比例 30%
  WEIGHTED_REWARD_POOL: 0.5,      // 总榜奖励池比例 50%
};

// ==================== 状态管理 ====================
const state = {
  walletConnected: false,
  userAddress: null,
  signer: null,
  provider: null,
  contracts: {},
  isLoading: false,
  currentDayId: null,
  totalBoardData: [],      // 全周期榜单缓存
  lastUpdateTime: 0,
  updateTimer: null,
  realtimeTimer: null,
  rewardCache: {},         // 奖励计算缓存
};

// ==================== 带超时的链上请求 ====================
const chainCall = {
  // 包装链上调用，添加超时
  async withTimeout(promise, timeoutMs = 10000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), timeoutMs)
      )
    ]);
  },
  
  // 批量调用（带超时）
  async allWithTimeout(promises, timeoutMs = 10000) {
    return Promise.race([
      Promise.all(promises),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('批量请求超时')), timeoutMs)
      )
    ]);
  }
};

// ==================== 工具函数 ====================
const utils = {
  // 格式化数字
  fmt(val, dec = 4) {
    if (!val) return '0';
    try {
      const s = ethers.utils.formatUnits(val, 18);
      const n = parseFloat(s);
      if (n >= 1e9) return (n / 1e9).toFixed(dec) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(dec) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(dec) + 'K';
      return n.toFixed(dec);
    } catch { return '0'; }
  },

  // 格式化整数
  fmtInt(val) {
    if (!val) return '0';
    try {
      const s = ethers.utils.formatUnits(val, 18);
      const n = parseFloat(s);
      if (n >= 1e9) return (n / 1e9).toFixed(2) + '亿';
      if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
      return n.toFixed(2);
    } catch { return '0'; }
  },

  // 缩短地址
  shortAddr(addr) {
    if (!addr || addr.length < 10) return addr || '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  },

  // 显示 Toast
  showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const colors = { success: '#3d8b6f', error: '#c24028', info: '#3a3a3a' };
    toast.style.background = colors[type] || colors.info;
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-100px)';
    }, 3000);
  },

  // 设置文本
  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  },

  // 设置 HTML
  setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  },

  // 显示/隐藏加载
  showLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('hidden');
  },

  hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('hidden');
  },
};

// ==================== 合约初始化 ====================
const contracts = {
  initRead() {
    try {
      state.provider = new ethers.providers.JsonRpcProvider(NETWORK.rpcUrl);
      state.contracts.token = new ethers.Contract(TOKEN_CONTRACT.address, TOKEN_CONTRACT.abi, state.provider);
      state.contracts.vault = new ethers.Contract(VAULT_CONTRACT.address, VAULT_CONTRACT.abi, state.provider);
      state.contracts.burnDistributor = new ethers.Contract(BURN_CONTRACT.address, BURN_CONTRACT.abi, state.provider);
      state.contracts.router = new ethers.Contract(ROUTER_CONTRACT.address, ROUTER_CONTRACT.abi, state.provider);
    } catch (e) {
      console.error('合约初始化失败:', e);
      utils.showToast('网络连接失败', 'error');
    }
  },

  initWrite() {
    if (!state.signer) return;
    state.contracts.token = new ethers.Contract(TOKEN_CONTRACT.address, TOKEN_CONTRACT.abi, state.signer);
    state.contracts.vault = new ethers.Contract(VAULT_CONTRACT.address, VAULT_CONTRACT.abi, state.signer);
    state.contracts.burnDistributor = new ethers.Contract(BURN_CONTRACT.address, BURN_CONTRACT.abi, state.signer);
    state.contracts.router = new ethers.Contract(ROUTER_CONTRACT.address, ROUTER_CONTRACT.abi, state.signer);
  },
};

// ==================== 数据加载 ====================
const dataLoader = {
  // 从 API 加载（优先）
  async fromAPI() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
      
      const res = await fetch('rewards-data.json?v=' + Date.now(), {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error('API 响应异常');
      return await res.json();
    } catch (e) {
      console.warn('API 加载失败:', e.message);
      return null;
    }
  },

  // 从链上加载（回退）
  async fromChain() {
    const { vault, burnDistributor, router, token } = state.contracts;
    if (!vault || !burnDistributor) throw new Error('合约未初始化');

    const [totalBurned, ov, dayId, dayDur] = await chainCall.allWithTimeout([
      burnDistributor.totalActualBurned(),
      vault.overview(),
      burnDistributor.currentDayId(),
      burnDistributor.dayDuration(),
    ], 15000);

    let projectBurned = ethers.BigNumber.from(0);
    try {
      projectBurned = await token.balanceOf(TOKEN_CONTRACT.address);
    } catch (e) {
      console.warn('获取项目方燃烧失败:', e.message);
    }

    return { totalBurned, ov, dayId, dayDur, projectBurned };
  },

  // 加载全局数据
  async loadGlobal() {
    utils.showLoading();
    
    try {
      // 优先 API
      const apiData = await this.fromAPI();
      if (apiData) {
        this.renderRewards(apiData);
      }

      // 链上数据（必须，带超时）
      const chainData = await chainCall.withTimeout(this.fromChain(), 15000);
      this.renderGlobal(chainData);
      
      utils.showToast('数据已同步', 'success');
    } catch (e) {
      console.error('加载全局数据失败:', e);
      utils.showToast('数据加载失败，请刷新重试', 'error');
    } finally {
      utils.hideLoading();
    }
  },

  // 渲染全局数据
  renderGlobal({ totalBurned, ov, dayId, dayDur, projectBurned }) {
    const globalDisplay = totalBurned.add(projectBurned);
    const progress = Math.min(globalDisplay.mul(10000).div(CONFIG.BURN_GOAL).toNumber() / 100, 100);
    const nextMilestone = globalDisplay.div(CONFIG.MILESTONE_STEP).add(1).mul(CONFIG.MILESTONE_STEP);

    utils.setText('global-burned', utils.fmtInt(globalDisplay));
    utils.setText('total-users-burned', utils.fmtInt(totalBurned));
    utils.setText('project-burned', utils.fmtInt(projectBurned));
    utils.setText('global-total', utils.fmt(globalDisplay, 4));
    
    const progressEl = document.getElementById('global-progress');
    if (progressEl) progressEl.style.width = progress + '%';
    
    utils.setText('global-progress-text', `已燃烧 ${utils.fmt(globalDisplay, 4)} / 目标 10亿`);
    utils.setText('global-next-mile', `下一里程碑 ${utils.fmt(nextMilestone, 0)}`);

    // Hero 数据
    utils.setText('hero-vault-bnb', utils.fmt(ov._vaultBnbBalance, 4));
    utils.setText('hero-staked-bnb', utils.fmt(ov._totalStakedBnb, 4));
    utils.setText('hero-slis-total', utils.fmt(ov._vaultSlisBalance, 4));

    // 日榜期数
    const displayRound = dayId.sub(20573).toString();
    utils.setText('board-day-id', displayRound);

    // 倒计时
    const nextDayEnd = dayId.add(1).mul(dayDur);
    this.startCountdown(nextDayEnd);

    // 加载日榜和历史
    this.loadDailyBoard(dayId);
    this.loadHistoryBoards(dayId.toNumber());
  },

  // 渲染奖励排名
  renderRewards(data) {
    if (!data.dailyRank || !data.totalRank) return;

    const renderList = (list, elId, color) => {
      const el = document.getElementById(elId);
      if (!el) return;
      
      const html = list.map((item, i) => {
        const rankStyle = i === 0 ? 'style="background:linear-gradient(135deg,#ffd700,#ffed4a);color:#1a1a1a;"' :
                          i === 1 ? 'style="background:linear-gradient(135deg,#c0c0c0,#a0a0a0);color:#111;"' :
                          i === 2 ? 'style="background:linear-gradient(135deg,#cd7f32,#a06020);color:#1a1005;"' : '';
        const label = i === 0 ? '冠军' : i === 1 ? '亚军' : i === 2 ? '季军' : '';
        return `<div class="row ${i === 0 ? 'top1' : ''}">
          <div class="row-left">
            <div class="rank-num" ${rankStyle}>${i + 1}</div>
            <div>
              <div class="row-title">${utils.shortAddr(item.addr)}</div>
              ${label ? `<div class="row-sub muted">${label}</div>` : ''}
            </div>
          </div>
          <div class="right">
            <div class="v" style="color:${color};">${item.amtFmt}</div>
            <div class="small muted">slisBNB</div>
          </div>
        </div>`;
      }).join('');
      
      el.innerHTML = html;
    };

    renderList(data.dailyRank, 'rewards-daily-list', '#3d8b6f');
    renderList(data.totalRank, 'rewards-total-list', '#a06028');
  },

  // 倒计时
  countdownTimer: null,
  startCountdown(nextDayEnd) {
    // 清理旧定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const left = nextDayEnd.toNumber() - now;
      if (left <= 0) {
        utils.setText('board-countdown', '结算中');
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        return;
      }
      const h = String(Math.floor(left / 3600)).padStart(2, '0');
      const m = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
      const s = String(left % 60).padStart(2, '0');
      utils.setText('board-countdown', `${h}:${m}:${s}`);
    };
    update();
    this.countdownTimer = setInterval(update, 1000);
  },

  // 加载日榜
  async loadDailyBoard(dayId) {
    try {
      state.currentDayId = dayId;
      const bd = await state.contracts.router.burnDay(VAULT_CONTRACT.address, dayId);
      const list = document.getElementById('board-list');
      if (!list) return;

      // 计算预计奖励
      const totalBurned = bd.totalBurned;
      const rewardPool = totalBurned.mul(ethers.utils.parseUnits(CONFIG.DAILY_REWARD_POOL.toString(), 18)).div(ethers.utils.parseUnits('1', 18));

      let html = '';
      for (let i = 0; i < 10; i++) {
        const addr = bd.users[i];
        const amt = bd.amounts[i];
        if (addr === ethers.constants.AddressZero) break;
        
        // 计算预计奖励
        let estimatedReward = ethers.BigNumber.from(0);
        if (!totalBurned.eq(0)) {
          const share = amt.mul(ethers.utils.parseUnits('1', 18)).div(totalBurned);
          estimatedReward = rewardPool.mul(share).div(ethers.utils.parseUnits('1', 18));
        }
        
        const rankStyle = i === 0 ? 'style="background:linear-gradient(135deg,#ffd700,#ffed4a);color:#1a1a1a;box-shadow:0 2px 8px rgba(255,215,0,0.3);"' :
                          i === 1 ? 'style="background:linear-gradient(135deg,#c0c0c0,#a0a0a0);color:#111;"' :
                          i === 2 ? 'style="background:linear-gradient(135deg,#cd7f32,#a06020);color:#1a1005;"' : '';
        const label = i === 0 ? '冠军' : i === 1 ? '亚军' : i === 2 ? '季军' : '';
        
        // 高亮当前用户
        const isCurrentUser = state.userAddress && addr.toLowerCase() === state.userAddress.toLowerCase();
        const rowStyle = isCurrentUser ? 'style="background:rgba(61,139,111,0.08);border-radius:8px;"' : '';
        
        html += `<div class="row ${i === 0 ? 'top1' : ''}" ${rowStyle} data-addr="${addr}">
          <div class="row-left">
            <div class="rank-num" ${rankStyle}>${i + 1}</div>
            <div>
              <div class="row-title">${utils.shortAddr(addr)} ${isCurrentUser ? '<span style="color:#3d8b6f;font-size:10px;">(我)</span>' : ''}</div>
              ${label ? `<div class="row-sub muted">${label}</div>` : ''}
            </div>
          </div>
          <div class="right">
            <div class="v">${utils.fmtInt(amt)}</div>
            <div class="small muted">币安长征</div>
            ${!estimatedReward.eq(0) ? `<div class="estimated-reward">预计 ${utils.fmt(estimatedReward, 4)} slisBNB</div>` : ''}
          </div>
        </div>`;
      }
      list.innerHTML = html || '<div class="row" style="opacity:0.5;"><div class="row-left">暂无数据</div></div>';
      
      // 保存数据用于实时更新
      state.lastBurnDayData = bd;
      
    } catch (e) {
      console.error('加载日榜失败:', e);
    }
  },

  // 加载历史日榜
  async loadHistoryBoards(currentDayId) {
    try {
      const container = document.getElementById('history-board-list');
      if (!container) return;

      const historyDays = [];
      const startDay = currentDayId > 5 ? currentDayId - 5 : 0;
      for (let d = currentDayId - 1; d > startDay; d--) {
        historyDays.push(d);
      }

      if (historyDays.length === 0) {
        container.innerHTML = '<div class="row" style="opacity:0.5;"><div class="row-left">暂无历史数据</div></div>';
        return;
      }

      let html = '';
      for (const dayId of historyDays) {
        try {
          const bd = await state.contracts.router.burnDay(VAULT_CONTRACT.address, dayId);
          if (bd.participantCount.toNumber() === 0) continue;

          let top3Html = '';
          for (let i = 0; i < 3; i++) {
            const addr = bd.users[i];
            const amt = bd.amounts[i];
            if (addr === ethers.constants.AddressZero) break;
            top3Html += `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:12px;color:rgba(30,30,30,0.75);"><span style="font-weight:700;color:${i===0?'#c24028':i===1?'#a06028':'#3d8b6f'};">${i+1}</span> ${utils.shortAddr(addr)} <span style="font-weight:600;">${utils.fmtInt(amt)}</span></span>`;
          }

          html += `<div class="card" style="padding:14px 16px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:13px;font-weight:700;color:#1a1a1a;">第 ${dayId - 20573} 期</span>
              <span style="font-size:11px;color:rgba(30,30,30,0.6);">${bd.finalized ? '已结算' : '进行中'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(30,30,30,0.6);margin-bottom:8px;">
              <span>总燃烧 ${utils.fmtInt(bd.totalBurned)} 币安长征</span>
              <span>${bd.participantCount} 人参与</span>
            </div>
            <div style="line-height:1.8;">${top3Html || '<span style="font-size:12px;color:rgba(30,30,30,0.5);">暂无排名数据</span>'}</div>
          </div>`;
        } catch (e) {
          console.error('加载历史日榜失败:', dayId, e);
        }
      }

      container.innerHTML = html || '<div class="row" style="opacity:0.5;"><div class="row-left">暂无历史数据</div></div>';
    } catch (e) {
      console.error('加载历史日榜失败:', e);
    }
  },
};

// ==================== 用户数据 ====================
const userData = {
  async load() {
    if (!state.userAddress) return;
    
    try {
      const [detail, ov, inv] = await chainCall.allWithTimeout([
        state.contracts.router.burnUserDetail(VAULT_CONTRACT.address, state.userAddress),
        state.contracts.vault.overview(),
        state.contracts.router.burnInviter(VAULT_CONTRACT.address, state.userAddress),
      ], 10000);

      // 更新 UI
      utils.setText('hero-bacz-pending', utils.fmt(detail.pendingInvite || 0, 4));
      utils.setText('hero-bacz-burned', utils.fmt(detail.selfBurned || 0, 4));
      utils.setText('hero-slis-pending', utils.fmt(ov._myPendingBurnDividend || 0, 4));
      utils.setText('my-burned', utils.fmtInt(detail.selfBurned));
      utils.setText('my-weight', utils.fmtInt(detail.weight));

      // 待领取金额
      const pd = detail.pendingDaily || ethers.BigNumber.from(0);
      const pw = detail.pendingWeighted || ethers.BigNumber.from(0);
      const pi = detail.pendingInvite || ethers.BigNumber.from(0);
      
      utils.setText('home-pending-daily', utils.fmt(pd, 4));
      utils.setText('home-pending-weighted', utils.fmt(pw, 4));
      utils.setText('home-pending-invite', utils.fmt(pi, 4));

      // 按钮状态
      const setBtnState = (id, disabled) => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = disabled;
      };
      setBtnState('home-btn-daily', pd.lte(0));
      setBtnState('home-btn-weighted', pw.lte(0));
      setBtnState('home-btn-invite', pi.lte(0));

      // 邀请信息
      const inviteLink = `https://bacz.ltd/?ref=${state.userAddress}`;
      utils.setText('invite-link', inviteLink);
      utils.setText('l1-reward', utils.fmt(detail.pendingInvite, 4));

      // 邀请地址状态
      this.updateInviterUI(inv);

      // 钱包状态
      utils.setHTML('walletStatus', `已连接 · <span class="addr">${utils.shortAddr(state.userAddress)}</span>`);
    } catch (e) {
      console.error('加载用户数据失败:', e);
    }
  },

  updateInviterUI(inv) {
    const lockedRef = localStorage.getItem('bacz_ref_locked') === '1' ? localStorage.getItem('bacz_ref') : null;
    const inviterDisplay = document.getElementById('inviter-display');
    const inviterInput = document.getElementById('inviter-input');
    const inviterTip = document.getElementById('inviter-tip');

    if (lockedRef) {
      if (inviterDisplay) {
        inviterDisplay.textContent = `链接邀请人：${utils.shortAddr(lockedRef)}`;
        inviterDisplay.style.color = '#c24028';
        inviterDisplay.style.display = 'block';
      }
      if (inviterInput) inviterInput.style.display = 'none';
      if (inviterTip) inviterTip.textContent = '您通过邀请链接进入，燃烧将强制使用该邀请地址，不可更改';
    } else if (inv.hasInviter) {
      if (inviterDisplay) {
        inviterDisplay.textContent = `已绑定地址：${utils.shortAddr(inv.inviter)}`;
        inviterDisplay.style.color = '#3d8b6f';
        inviterDisplay.style.display = 'block';
      }
      if (inviterInput) inviterInput.style.display = 'none';
      if (inviterTip) inviterTip.textContent = '您已绑定邀请关系，燃烧将使用已绑定的地址';
    } else {
      if (inviterDisplay) inviterDisplay.style.display = 'none';
      if (inviterInput) inviterInput.style.display = 'block';
      if (inviterTip) inviterTip.textContent = '未绑定邀请关系的用户将使用默认地址，也可手动填写';
    }
  },
};

// ==================== 钱包操作 ====================
const wallet = {
  async toggle() {
    if (!state.walletConnected) {
      await this.connect();
    } else {
      await this.disconnect();
    }
  },

  async connect() {
    if (!window.ethereum) {
      utils.showToast('请安装 MetaMask', 'error');
      return;
    }

    try {
      // 切换网络
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x38',
              chainName: 'BSC Mainnet',
              nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
              rpcUrls: ['https://bsc-dataseed.binance.org/'],
              blockExplorerUrls: ['https://bscscan.com'],
            }],
          });
        } else {
          throw switchError;
        }
      }

      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      await web3Provider.send('eth_requestAccounts', []);
      state.signer = web3Provider.getSigner();
      state.userAddress = await state.signer.getAddress();
      state.walletConnected = true;
      contracts.initWrite();

      // 更新 UI
      const btn = document.getElementById('walletBtn');
      if (btn) {
        btn.textContent = '断开';
        btn.classList.remove('btn-light');
        btn.classList.add('btn-dark');
      }
      utils.showToast('钱包已连接', 'success');

      await userData.load();
      this.checkSelfInvite();
    } catch (e) {
      utils.showToast('连接失败: ' + (e.message || e), 'error');
    }
  },

  async disconnect() {
    state.walletConnected = false;
    state.userAddress = null;
    state.signer = null;
    contracts.initRead();

    const btn = document.getElementById('walletBtn');
    if (btn) {
      btn.textContent = '连接钱包';
      btn.classList.remove('btn-dark');
      btn.classList.add('btn-light');
    }
    utils.setText('walletStatus', '未连接钱包');
    utils.showToast('已断开钱包', 'info');
  },

  checkSelfInvite() {
    const urlRef = localStorage.getItem('bacz_ref');
    if (!urlRef || !state.userAddress) return;
    if (urlRef.toLowerCase() === state.userAddress.toLowerCase()) {
      localStorage.setItem('bacz_ref', DEFAULT_INVITER.toLowerCase());
    }
  },
};

// ==================== 燃烧操作 ====================
const burn = {
  async execute() {
    if (!state.walletConnected) {
      utils.showToast('请先连接钱包', 'error');
      return;
    }

    const input = document.getElementById('burnAmount');
    const raw = input?.value.replace(/,/g, '');
    if (!raw || raw <= 0) {
      utils.showToast('请输入燃烧数量', 'error');
      return;
    }

    try {
      const amount = ethers.utils.parseUnits(raw, 18);

      // 检查授权
      utils.showToast('检查代币授权…', 'info');
      const allowance = await state.contracts.token.allowance(state.userAddress, VAULT_CONTRACT.address);
      if (allowance.lt(amount)) {
        utils.showToast('正在授权代币…', 'info');
        const approveTx = await state.contracts.token.approve(VAULT_CONTRACT.address, ethers.constants.MaxUint256);
        await approveTx.wait();
        utils.showToast('授权成功', 'success');
      }

      // 确定邀请地址
      const inv = await state.contracts.router.burnInviter(VAULT_CONTRACT.address, state.userAddress);
      const inviterAddr = await this.resolveInviter(inv);

      // 执行燃烧
      utils.showToast('燃烧交易中…', 'info');
      const burnTx = await state.contracts.vault.burn(amount, inviterAddr);
      await burnTx.wait();
      utils.showToast('燃烧成功！', 'success');

      await dataLoader.loadGlobal();
      await userData.load();
    } catch (e) {
      console.error('燃烧失败:', e);
      utils.showToast('燃烧失败: ' + (e.message || e), 'error');
    }
  },

  async resolveInviter(inv) {
    const lockedRef = localStorage.getItem('bacz_ref_locked') === '1' ? localStorage.getItem('bacz_ref') : null;
    const manualInviter = document.getElementById('inviter-input')?.value.trim();
    const urlInviter = localStorage.getItem('bacz_ref');

    let inviterAddr;
    if (lockedRef) {
      inviterAddr = lockedRef;
    } else if (manualInviter && manualInviter.startsWith('0x') && manualInviter.length === 42) {
      inviterAddr = manualInviter;
    } else if (inv.hasInviter) {
      inviterAddr = inv.inviter;
    } else if (urlInviter) {
      inviterAddr = urlInviter;
    } else {
      inviterAddr = DEFAULT_INVITER;
    }

    const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
    if (!inviterAddr || inviterAddr.toLowerCase() === ZERO_ADDR) {
      inviterAddr = DEFAULT_INVITER;
    }

    // 合约检查
    if (!inv.hasInviter && inviterAddr.toLowerCase() !== DEFAULT_INVITER.toLowerCase()) {
      try {
        const check = await state.contracts.router.inviteCheck(VAULT_CONTRACT.address, state.userAddress, inviterAddr);
        if (!check.canBind) inviterAddr = DEFAULT_INVITER;
      } catch (e) {
        // 合约不支持 inviteCheck
      }
    }

    return inviterAddr;
  },
};

// ==================== 领取奖励 ====================
const claims = {
  async daily() {
    if (!state.walletConnected) {
      utils.showToast('请先连接钱包', 'error');
      return;
    }
    const btn = document.getElementById('home-btn-daily');
    if (!btn || btn.disabled) return;

    btn.classList.add('claiming');
    try {
      utils.showToast('领取日榜奖励中…', 'info');
      const tx = await state.contracts.burnDistributor.claimBurnRewardFor(state.userAddress);
      await tx.wait();
      utils.showToast('日榜奖励领取成功！', 'success');
      await userData.load();
    } catch (e) {
      console.error('领取日榜奖励失败:', e);
      utils.showToast('领取失败: ' + (e.message || e), 'error');
    } finally {
      btn.classList.remove('claiming');
    }
  },

  async weighted() {
    if (!state.walletConnected) {
      utils.showToast('请先连接钱包', 'error');
      return;
    }
    const btn = document.getElementById('home-btn-weighted');
    if (!btn || btn.disabled) return;

    btn.classList.add('claiming');
    try {
      utils.showToast('领取总榜奖励中…', 'info');
      const tx = await state.contracts.vault.claimBurnReward();
      await tx.wait();
      utils.showToast('总榜奖励领取成功！', 'success');
      await userData.load();
    } catch (e) {
      console.error('领取总榜奖励失败:', e);
      utils.showToast('领取失败: ' + (e.message || e), 'error');
    } finally {
      btn.classList.remove('claiming');
    }
  },

  async invite() {
    if (!state.walletConnected) {
      utils.showToast('请先连接钱包', 'error');
      return;
    }
    const btn = document.getElementById('home-btn-invite');
    if (!btn || btn.disabled) return;

    btn.classList.add('claiming');
    try {
      utils.showToast('领取邀请返佣中…', 'info');
      const tx = await state.contracts.vault.claimInviteReward();
      await tx.wait();
      utils.showToast('邀请返佣领取成功！', 'success');
      await userData.load();
    } catch (e) {
      console.error('领取邀请返佣失败:', e);
      utils.showToast('领取失败: ' + (e.message || e), 'error');
    } finally {
      btn.classList.remove('claiming');
    }
  },
};

// ==================== 工具函数 ====================
const tools = {
  copyContract() {
    const el = document.getElementById('contractAddr');
    const full = el?.dataset.full;
    if (full) {
      navigator.clipboard.writeText(full).then(() => utils.showToast('合约地址已复制', 'success'));
    } else {
      utils.showToast('合约地址未加载', 'error');
    }
  },

  copyInviteLink() {
    const el = document.getElementById('invite-link');
    const text = el?.textContent;
    if (text?.startsWith('http')) {
      navigator.clipboard.writeText(text).then(() => utils.showToast('链接已复制', 'success'));
    } else {
      utils.showToast('请先连接钱包', 'error');
    }
  },

  resolveRefFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return null;
    if (ref.startsWith('0x') && ref.length === 42) return ref.toLowerCase();
    const full = INVITE_SHORT_MAP?.[ref];
    if (full) return full.toLowerCase();
    return null;
  },

  async refresh() {
    const btn = document.getElementById('refreshBtn');
    if (btn) btn.classList.add('refresh-spin');
    
    await dataLoader.loadGlobal();
    if (state.walletConnected) await userData.load();
    
    setTimeout(() => btn?.classList.remove('refresh-spin'), 700);
    utils.showToast('链上数据已刷新', 'success');
  },
};

// ==================== 全局函数暴露（HTML onclick 使用）====================
window.toggleWallet = () => wallet.toggle();
window.handleRefresh = () => tools.refresh();
window.doBurn = () => burn.execute();
window.claimDailyReward = () => claims.daily();
window.claimWeightedReward = () => claims.weighted();
window.claimInviteReward = () => claims.invite();
window.copyContract = () => tools.copyContract();
window.copyInviteLink = () => tools.copyInviteLink();

// ==================== 移动端导航滚动 ====================
window.scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateNavActive(0);
};

window.scrollToBoard = () => {
  const boardEl = document.getElementById('board-list');
  if (boardEl) {
    boardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateNavActive(1);
  }
};

window.scrollToBurn = () => {
  const burnEl = document.getElementById('burnAmount');
  if (burnEl) {
    burnEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateNavActive(2);
  }
};

window.scrollToRewards = () => {
  const rewardsEl = document.getElementById('home-pending-daily');
  if (rewardsEl) {
    rewardsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateNavActive(3);
  }
};

function updateNavActive(index) {
  const navItems = document.querySelectorAll('.mobile-nav-item');
  navItems.forEach((item, i) => {
    if (i === index) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// 滚动时显示/隐藏浮动按钮
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const fab = document.getElementById('fabBurn');
  if (!fab) return;
  
  const currentScrollY = window.scrollY;
  if (currentScrollY > 300 && currentScrollY > lastScrollY) {
    fab.style.display = 'flex';
  } else if (currentScrollY < 200) {
    fab.style.display = 'none';
  }
  lastScrollY = currentScrollY;
}, { passive: true });

// 下拉刷新支持
let touchStartY = 0;
let isPulling = false;

document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (window.scrollY === 0) {
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY;
    
    if (diff > 60 && !isPulling) {
      isPulling = true;
      const ptr = document.getElementById('pullToRefresh');
      if (ptr) ptr.classList.add('visible');
    }
  }
}, { passive: true });

document.addEventListener('touchend', async () => {
  if (isPulling) {
    isPulling = false;
    await tools.refresh();
    const ptr = document.getElementById('pullToRefresh');
    if (ptr) ptr.classList.remove('visible');
  }
}, { passive: true });

// ==================== 实时更新系统 ====================
const realtimeUpdater = {
  // 启动实时更新
  start() {
    // 防止重复启动
    this.stop();

    // 🛡️ 页面可见时才启动轮询
    if (document.hidden) {
      console.log('[Realtime] 页面不可见，跳过启动');
      return;
    }

    // 全周期榜单定期刷新 (30秒，比原来更合理)
    state.updateTimer = setInterval(() => {
      if (!document.hidden) {
        this.refreshTotalBoard();
      }
    }, CONFIG.REFRESH_INTERVAL);

    // 实时数据更新 (10秒)
    state.realtimeTimer = setInterval(() => {
      if (!document.hidden) {
        this.refreshRealtimeData();
      }
    }, CONFIG.REALTIME_UPDATE_INTERVAL);

    console.log('[Realtime] 实时更新已启动');
  },

  // 停止实时更新
  stop() {
    if (state.updateTimer) {
      clearInterval(state.updateTimer);
      state.updateTimer = null;
    }
    if (state.realtimeTimer) {
      clearInterval(state.realtimeTimer);
      state.realtimeTimer = null;
    }
    // 同时清理倒计时
    if (dataLoader.countdownTimer) {
      clearInterval(dataLoader.countdownTimer);
      dataLoader.countdownTimer = null;
    }
    console.log('[Realtime] 实时更新已停止');
  },

  // 🛡️ 页面可见性变化处理
  handleVisibilityChange() {
    if (document.hidden) {
      console.log('[Realtime] 页面隐藏，暂停更新');
      this.stop();
    } else {
      console.log('[Realtime] 页面显示，恢复更新');
      // 延迟恢复，避免快速切换
      setTimeout(() => this.start(), 500);
      // 刷新数据
      setTimeout(() => dataLoader.loadGlobal().catch(console.error), 1000);
    }
  },
  
  // 刷新全周期榜单
  async refreshTotalBoard() {
    try {
      const indicator = document.querySelector('.update-indicator');
      if (indicator) indicator.classList.add('updating');
      
      // 获取最新数据（带超时）
      const [totalBurned, ov] = await chainCall.allWithTimeout([
        state.contracts.burnDistributor.totalActualBurned(),
        state.contracts.vault.overview(),
      ], 10000);
      
      // 更新全周期数据
      const globalDisplay = totalBurned.add(state.projectBurned || 0);
      utils.setText('global-burned', utils.fmtInt(globalDisplay));
      utils.setText('global-total', utils.fmt(globalDisplay, 4));
      
      // 更新进度条
      const progress = Math.min(globalDisplay.mul(10000).div(CONFIG.BURN_GOAL).toNumber() / 100, 100);
      const progressEl = document.getElementById('global-progress');
      if (progressEl) progressEl.style.width = progress + '%';
      
      // 更新 Hero 数据
      utils.setText('hero-vault-bnb', utils.fmt(ov._vaultBnbBalance, 4));
      utils.setText('hero-staked-bnb', utils.fmt(ov._totalStakedBnb, 4));
      utils.setText('hero-slis-total', utils.fmt(ov._vaultSlisBalance, 4));
      
      state.lastUpdateTime = Date.now();
      
      if (indicator) {
        indicator.classList.remove('updating');
        const timeEl = indicator.querySelector('.update-time');
        if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
      
      console.log('[Realtime] 全周期榜单已更新');
    } catch (e) {
      console.error('[Realtime] 刷新失败:', e);
    }
  },
  
  // 刷新实时数据 (日榜预计奖励)
  async refreshRealtimeData() {
    try {
      if (!state.currentDayId) return;
      
      // 获取最新日榜数据（带超时）
      const bd = await chainCall.withTimeout(
        state.contracts.router.burnDay(VAULT_CONTRACT.address, state.currentDayId),
        10000
      );
      
      // 计算并显示预计奖励
      this.calculateEstimatedRewards(bd);
      
      // 如果有用户连接，更新用户数据
      if (state.walletConnected && state.userAddress) {
        await userData.load();
      }
      
    } catch (e) {
      console.error('[Realtime] 实时数据更新失败:', e);
    }
  },
  
  // 计算日榜预计奖励
  calculateEstimatedRewards(burnDay) {
    if (!burnDay || burnDay.participantCount.toNumber() === 0) return;
    
    const totalBurned = burnDay.totalBurned;
    if (totalBurned.eq(0)) return;
    
    // 获取日榜奖励池 (假设为 vault BNB 的 30%)
    const rewardPool = burnDay.rewardPool || totalBurned.mul(ethers.utils.parseUnits('0.3', 18)).div(ethers.utils.parseUnits('1', 18));
    
    // 计算每个用户的预计奖励
    const userRewards = [];
    for (let i = 0; i < 10; i++) {
      const addr = burnDay.users[i];
      const amt = burnDay.amounts[i];
      if (addr === ethers.constants.AddressZero) break;
      
      // 按比例计算奖励
      const share = amt.mul(ethers.utils.parseUnits('1', 18)).div(totalBurned);
      const estimatedReward = rewardPool.mul(share).div(ethers.utils.parseUnits('1', 18));
      
      userRewards.push({
        rank: i + 1,
        addr: addr,
        amount: amt,
        estimatedReward: estimatedReward,
        share: share,
      });
    }
    
    // 更新 UI 显示预计奖励
    this.updateEstimatedRewardsUI(userRewards);
  },
  
  // 更新预计奖励 UI
  updateEstimatedRewardsUI(userRewards) {
    const list = document.getElementById('board-list');
    if (!list) return;
    
    const rows = list.querySelectorAll('.row');
    rows.forEach((row, index) => {
      if (index >= userRewards.length) return;
      
      const reward = userRewards[index];
      const rightEl = row.querySelector('.right');
      if (!rightEl) return;
      
      // 检查是否已有预计奖励显示
      let estimatedEl = rightEl.querySelector('.estimated-reward');
      if (!estimatedEl) {
        estimatedEl = document.createElement('div');
        estimatedEl.className = 'estimated-reward';
        rightEl.appendChild(estimatedEl);
      }
      
      // 更新预计奖励文本
      const rewardFormatted = utils.fmt(reward.estimatedReward, 4);
      estimatedEl.textContent = `预计 ${rewardFormatted} slisBNB`;
      
      // 高亮当前用户
      if (state.userAddress && reward.addr.toLowerCase() === state.userAddress.toLowerCase()) {
        row.style.background = 'rgba(61, 139, 111, 0.08)';
        row.style.borderRadius = '8px';
      }
    });
  },
};

// ==================== 启动 ====================
window.addEventListener('DOMContentLoaded', async () => {
  // 解析 URL 邀请参数
  const urlRef = tools.resolveRefFromUrl();
  if (urlRef) {
    localStorage.setItem('bacz_ref', urlRef);
    localStorage.setItem('bacz_ref_locked', '1');
    console.log('Invite ref resolved (locked):', urlRef);
    setTimeout(() => {
      utils.showToast(`您通过 ${utils.shortAddr(urlRef)} 的邀请链接进入`, 'info');
    }, 800);
  } else {
    localStorage.removeItem('bacz_ref_locked');
    localStorage.removeItem('bacz_ref');
    console.log('Direct access: cleared locked ref');
  }

  // 初始化合约
  contracts.initRead();
  
  // 加载数据（带错误处理）
  try {
    await dataLoader.loadGlobal();
  } catch (e) {
    console.error('初始数据加载失败:', e);
    utils.showToast('数据加载失败，请检查网络连接', 'error');
  }
  
  // 启动实时更新
  realtimeUpdater.start();
  
  // 🛡️ 页面可见性变化处理（使用 realtimeUpdater 的统一处理）
  document.addEventListener('visibilitychange', () => {
    realtimeUpdater.handleVisibilityChange();
  });
  
  // 页面卸载时清理所有资源
  window.addEventListener('beforeunload', () => {
    realtimeUpdater.stop();
  });
});

// ==================== 性能监控 ====================
if ('PerformanceObserver' in window) {
  const perfObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`[Performance] ${entry.name}: ${entry.duration?.toFixed(2) || entry.startTime?.toFixed(2)}ms`);
    }
  });
  perfObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
}

// 记录关键性能指标
window.addEventListener('load', () => {
  setTimeout(() => {
    const timing = performance.timing;
    const metrics = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      ttfb: timing.responseStart - timing.requestStart,
      domParse: timing.domComplete - timing.domLoading,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
    };
    console.log('[Performance Metrics]', metrics);
  }, 0);
});
