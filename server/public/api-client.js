/**
 * 币安长征前端 API 客户端
 * 从后端缓存服务读取数据，替代直连链上的 RPC 调用
 *
 * 用法：在 index.html 中引入此文件，替换原有的 loadGlobalData 等函数
 */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : ''; // 生产环境同域名，Nginx 反向代理到 /api

// 统一的 fetch 封装
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ============ 数据加载（替换原有的链上调用） ============

async function loadGlobalDataFromAPI() {
  try {
    const data = await apiGet('/api/global');

    // 三列数据
    setText('global-burned', data.totalBurned);
    setText('total-users-burned', data.totalUsersBurned);
    setText('project-burned', data.projectBurned);

    // 进度条
    document.getElementById('global-progress').style.width = data.progress + '%';
    setText('global-progress-text', data.progressText);
    setText('global-next-mile', '下一里程碑 ' + data.nextMilestone);

    // Hero 金库数据
    setText('hero-vault-bnb', data.vaultBnb);
    setText('hero-staked-bnb', data.stakedBnb);
    setText('hero-slis-total', data.slisTotal);

    // 日榜期数
    setText('board-day-id', data.displayRound);

    // 倒计时
    updateCountdownFromSeconds(data.countdown);
    setInterval(() => {
      data.countdown = Math.max(0, data.countdown - 1);
      updateCountdownFromSeconds(data.countdown);
    }, 1000);

    // 社区数据
    setText('community-daily-burn', data.totalBurned);

    return data;
  } catch (e) {
    console.error('[API] 全局数据加载失败:', e.message);
    // 降级：显示缓存提示
    showToast('数据加载较慢，请稍后刷新', 3000);
  }
}

async function loadDailyBoardFromAPI() {
  try {
    const data = await apiGet('/api/board');
    const list = document.getElementById('board-list');
    if (!list) return;

    let html = '';
    data.users.forEach((user, i) => {
      const rankClass = i === 0 ? 'row top1' : 'row';
      const rankStyle = i === 1 ? 'style="background:linear-gradient(135deg,#c0c0c0,#a06020);color:#111;"' :
                        i === 2 ? 'style="background:linear-gradient(135deg,#cd7f32,#a06020);color:#1a1005;"' : '';
      const label = i === 0 ? '冠军' : i === 1 ? '亚军' : i === 2 ? '季军' : '';
      html += `<div class="${rankClass}">
        <div class="row-left">
          <div class="rank-num" ${rankStyle}>${user.rank}</div>
          <div>
            <div class="row-title">${user.shortAddress}</div>
            ${label ? `<div class="row-sub muted">${label}</div>` : ''}
          </div>
        </div>
        <div class="right">
          <div class="v">${user.amount}</div>
          <div class="small muted">币安长征</div>
        </div>
      </div>`;
    });

    list.innerHTML = html || '<div class="row" style="opacity:0.5;"><div class="row-left">暂无数据</div></div>';
  } catch (e) {
    console.error('[API] 日榜加载失败:', e.message);
  }
}

async function loadHistoryBoardsFromAPI() {
  try {
    const data = await apiGet('/api/history');
    const container = document.getElementById('history-board-list');
    if (!container) return;

    let html = '';
    data.forEach(day => {
      let top3Html = '';
      day.top3.forEach(u => {
        top3Html += `<span style="display:inline-flex; align-items:center; gap:4px; margin-right:10px; font-size:12px; color:rgba(30,30,30,0.75);">
          <span style="font-weight:700; color:${u.rank===1?'#c24028':u.rank===2?'#a06028':'#3d8b6f'};">${u.rank}</span>
          ${u.shortAddress} <span style="font-weight:600;">${u.amount}</span>
        </span>`;
      });

      html += `<div class="card" style="padding:14px 16px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:13px; font-weight:700; color:#1a1a1a;">第 ${day.displayRound} 期</span>
          <span style="font-size:11px; color:rgba(30,30,30,0.6);">${day.finalized ? '已结算' : '进行中'}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:rgba(30,30,30,0.6); margin-bottom:8px;">
          <span>总燃烧 ${day.totalBurned} 币安长征</span>
          <span>${day.participantCount} 人参与</span>
        </div>
        <div style="line-height:1.8;">${top3Html || '<span style="font-size:12px; color:rgba(30,30,30,0.5);">暂无排名数据</span>'}</div>
      </div>`;
    });

    container.innerHTML = html || '<div class="row" style="opacity:0.5;"><div class="row-left">暂无历史数据</div></div>';
  } catch (e) {
    console.error('[API] 历史日榜加载失败:', e.message);
  }
}

async function loadRewardRankingsFromAPI() {
  try {
    const data = await apiGet('/api/rewards');

    // 渲染日榜
    const dailyList = document.getElementById('rewards-daily-list');
    if (dailyList && data.dailyRank) {
      let html = '';
      data.dailyRank.forEach((item, i) => {
        const rankClass = i === 0 ? 'row top1' : 'row';
        const rankStyle = i === 1 ? 'style="background:linear-gradient(135deg,#c0c0c0,#a0a0a0);color:#111;"' :
                          i === 2 ? 'style="background:linear-gradient(135deg,#cd7f32,#a06020);color:#1a1005;"' : '';
        const label = i === 0 ? '冠军' : i === 1 ? '亚军' : i === 2 ? '季军' : '';
        html += `<div class="${rankClass}">
          <div class="row-left">
            <div class="rank-num" ${rankStyle}>${i+1}</div>
            <div>
              <div class="row-title">${item.shortAddr}</div>
              ${label ? `<div class="row-sub muted">${label}</div>` : ''}
            </div>
          </div>
          <div class="right">
            <div class="v" style="color:#3d8b6f;">${item.amtFmt}</div>
            <div class="small muted">slisBNB</div>
          </div>
        </div>`;
      });
      dailyList.innerHTML = html || '<div class="row" style="opacity:0.5;"><div class="row-left">暂无数据</div></div>';
    }

    // 渲染总榜
    const totalList = document.getElementById('rewards-total-list');
    if (totalList && data.totalRank) {
      let html = '';
      data.totalRank.forEach((item, i) => {
        const rankClass = i === 0 ? 'row top1' : 'row';
        const rankStyle = i === 1 ? 'style="background:linear-gradient(135deg,#c0c0c0,#a0a0a0);color:#111;"' :
                          i === 2 ? 'style="background:linear-gradient(135deg,#cd7f32,#a06020);color:#1a1005;"' : '';
        const label = i === 0 ? '冠军' : i === 1 ? '亚军' : i === 2 ? '季军' : '';
        html += `<div class="${rankClass}">
          <div class="row-left">
            <div class="rank-num" ${rankStyle}>${i+1}</div>
            <div>
              <div class="row-title">${item.shortAddr}</div>
              ${label ? `<div class="row-sub muted">${label}</div>` : ''}
            </div>
          </div>
          <div class="right">
            <div class="v" style="color:#c67b3c;">${item.amtFmt}</div>
            <div class="small muted">slisBNB</div>
          </div>
        </div>`;
      });
      totalList.innerHTML = html || '<div class="row" style="opacity:0.5;"><div class="row-left">暂无数据</div></div>';
    }
  } catch (e) {
    console.error('[API] 奖励排名加载失败:', e.message);
  }
}

// ============ 辅助函数 ============

function updateCountdownFromSeconds(totalSeconds) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  setText('board-countdown', `${h}:${m}:${s}`);
}

// ============ 一键加载所有数据 ============

async function loadAllDataFromAPI() {
  await Promise.all([
    loadGlobalDataFromAPI(),
    loadDailyBoardFromAPI(),
    loadHistoryBoardsFromAPI(),
    loadRewardRankingsFromAPI(),
  ]);
}

// 暴露到全局
window.baczAPI = {
  loadGlobalData: loadGlobalDataFromAPI,
  loadDailyBoard: loadDailyBoardFromAPI,
  loadHistoryBoards: loadHistoryBoardsFromAPI,
  loadRewardRankings: loadRewardRankingsFromAPI,
  loadAll: loadAllDataFromAPI,
};
