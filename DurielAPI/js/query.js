/**
 * 卡密查询页面 JavaScript
 * Card Query Page - Batch card code status query
 * Version: 20251227_2330
 */
console.log('query.js loaded - version 20251227_2330');

// 配置
const CONFIG = {
  API_BASE_URL: '/api',
  BATCH_SIZE: 30  // 匹配脚本的分批大小
};

// ========================================
// 输入解析模块
// ========================================
const InputParser = {
  parse(input) {
    console.log('InputParser.parse called with input length:', input ? input.length : 0);
    if (!input || typeof input !== 'string') {
      return [];
    }
    const lines = input.split(/[\n\r]+/);
    const cards = [];
    for (const line of lines) {
      // 替换全角逗号为半角
      const normalizedLine = line.replace(/，/g, ',');
      const parts = normalizedLine.split(',');
      for (const part of parts) {
        let trimmed = part.trim();
        // 去除不可见字符
        trimmed = trimmed.replace(/[\u200B-\u200D\uFEFF]/g, '');

        // 支持 CDK- 格式自动转换
        // 输入: CDK-VJV6-WJW6-FB2F-UWV7
        // 转换: GPTVJV6WJW6FB2FUWV7
        if (trimmed.toUpperCase().startsWith('CDK-')) {
          const original = trimmed;
          trimmed = trimmed.replace(/-/g, '').replace(/^CDK/i, 'GPT');
          console.log(`Converted ${original} to ${trimmed}`);
        }

        if (trimmed) {
          cards.push(trimmed);
        }
      }
    }
    return cards;
  },

  validate(cardCode) {
    if (!cardCode || typeof cardCode !== 'string') {
      return false;
    }
    const trimmed = cardCode.trim();
    // 放宽长度限制，避免误判
    const isValid = trimmed.length >= 12;
    if (!isValid) {
      console.warn(`Invalid card code: ${trimmed} (length: ${trimmed.length})`);
    }
    return isValid;
  },

  normalize(cardCodes) {
    if (!Array.isArray(cardCodes)) {
      return { unique: [], duplicateCount: 0 };
    }
    const trimmed = cardCodes.map(c => (c || '').trim()).filter(c => c);
    const seen = new Set();
    const unique = [];
    let duplicateCount = 0;
    for (const card of trimmed) {
      if (seen.has(card)) {
        duplicateCount++;
      } else {
        seen.add(card);
        unique.push(card);
      }
    }
    return { unique, duplicateCount };
  },

  parseAndValidate(input) {
    const parsed = this.parse(input);
    const { unique, duplicateCount } = this.normalize(parsed);
    const validCards = [];
    const invalidCards = [];
    for (const card of unique) {
      if (this.validate(card)) {
        validCards.push(card);
      } else {
        invalidCards.push(card);
      }
    }
    return { validCards, invalidCards, duplicateCount };
  }
};

// ========================================
// 提交验证模块
// ========================================
const SubmissionValidator = {
  validate(parsed) {
    const { validCards, invalidCards } = parsed;
    if (validCards.length === 0 && invalidCards.length === 0) {
      return { canSubmit: false, error: '请输入至少一个卡密' };
    }
    if (validCards.length === 0) {
      // 提供更详细的错误信息
      const example = invalidCards[0] || '';
      return { canSubmit: false, error: `所有卡密格式无效。示例: "${example}" (长度${example.length})，请检查是否包含非法字符` };
    }
    // 无数量限制，支持分批查询
    return { canSubmit: true, error: null };
  }
};

// ========================================
// 结果格式化模块
// ========================================
const ResultFormatter = {
  getStatusText(status) {
    const statusMap = {
      '0': '未使用',
      '1': '已使用',
      '2': '已禁用',
      '3': '已失效'
    };
    return statusMap[String(status)] || '未知';
  },

  getStatusClass(status) {
    const classMap = {
      '0': 'status-valid',
      '1': 'status-used',
      '2': 'status-disabled',
      '3': 'status-expired'
    };
    return classMap[String(status)] || 'status-notfound';
  },

  formatForCopy(results, filter = 'all') {
    if (!Array.isArray(results) || results.length === 0) {
      return '';
    }

    let filtered = results;
    if (filter === 'used') {
      filtered = results.filter(r => r.status === '1' || r.status === 1);
    } else if (filter === 'unused') {
      filtered = results.filter(r => r.status === '0' || r.status === 0);
    }

    const lines = ['卡密查询结果', '='.repeat(50)];
    for (const result of filtered) {
      const statusText = this.getStatusText(result.status);
      let line = `${result.cardCode} - ${statusText}`;
      if (result.status === '1' || result.status === 1) {
        if (result.redeemEmail) {
          line += ` - ${result.redeemEmail}`;
        }
        if (result.redeemTime) {
          line += ` (${result.redeemTime})`;
        }
      }
      lines.push(line);
    }
    lines.push('='.repeat(50));
    lines.push(`共 ${filtered.length} 条记录`);
    return lines.join('\n');
  }
};

// ========================================
// API 客户端
// ========================================
const QueryApiClient = {
  async queryCard(cardCode) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/cdks/public/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Product-ID': 'chatgpt'
      },
      body: JSON.stringify({ code: cardCode })
    });
    if (!response.ok) {
      if (response.status === 400 || response.status === 500) {
        const error = await response.text();
        throw new Error(error);
      }
      throw new Error(`网络请求失败: ${response.status}`);
    }
    return response.json();
  },

  async batchQueryRemote(cardCodes) {
    const codesStr = cardCodes.join(',');
    const url = `${CONFIG.API_BASE_URL}/cdks/public/check-usage/${encodeURIComponent(codesStr).replace(/%2C/g, ',')}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 500) {
          const error = await response.text();
          throw new Error(error);
        }
        throw new Error(`网络请求失败: ${response.status}`);
      }

      const data = await response.json();

      // 兼容返回格式：可能是数组，也可能是单条对象（如果是查单条）
      const list = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);

      const normalized = list.map((item, idx) => {
        let cardCode = item?.code ?? item?.cardCode ?? cardCodes[idx];
        const isUsed = item?.used === true || item?.used === 'true';

        // 状态映射: '0'=有效(未兑换), '1'=已兑换
        let status = isUsed ? '1' : '0';

        let redeemEmail = item?.user ?? item?.redeemEmail ?? null;
        let redeemTime = item?.redeem_time ?? item?.redeemTime ?? null;

        // 如果显示的是 GPT 格式，尝试转回 CDK 格式以符合用户预期
        if (cardCode && typeof cardCode === 'string' && cardCode.toUpperCase().startsWith('GPT')) {
          const core = cardCode.substring(3);
          if (core.length > 0) {
            const parts = core.match(/.{1,4}/g);
            if (parts) {
              cardCode = `CDK-${parts.join('-')}`;
            }
          }
        }

        return {
          cardCode: cardCode || '',
          status: status,
          redeemEmail: redeemEmail,
          redeemTime: redeemTime
        };
      });

      return { code: 200, data: normalized };
    } catch (e) {
      throw e;
    }
  },

  normalizeSingleCardResponse(cardCode, resp) {
    const data = resp && resp.data ? resp.data : null;

    // 兼容旧的 query 页面的状态定义：
    // '0'=有效(未兑换)  '1'=已兑换  '2'=已禁用  '3'=已失效  '-1'=未知/失败
    let status = '-1';
    let redeemEmail = undefined;
    let redeemTime = undefined;

    if (resp && resp.code === 0 && data && typeof data.status !== 'undefined') {
      switch (Number(data.status)) {
        case 1:
          status = '0';
          break;
        case 2:
          status = '1';
          redeemTime = data.used_at || undefined;
          // charge_info 在不同后端实现里可能包含邮箱/备注，这里尽量透传
          redeemEmail = data.charge_info || undefined;
          break;
        case 0:
          status = '2';
          break;
        default:
          status = '-1';
      }
    }

    return {
      cardCode,
      status,
      redeemEmail,
      redeemTime
    };
  },

  async batchQuery(cardCodes) {
    if (!Array.isArray(cardCodes) || cardCodes.length === 0) {
      return { code: 200, data: [] };
    }

    // 使用后端批量接口（/card/batch_query）
    return this.batchQueryRemote(cardCodes);
  }
};

// ========================================
// UI 控制模块
// ========================================
const QueryUI = {
  currentResults: [],
  currentFilter: 'all',

  showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const btn = document.getElementById('queryBtn');
    if (overlay) overlay.style.display = 'flex';
    if (btn) btn.disabled = true;
  },

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const btn = document.getElementById('queryBtn');
    if (overlay) overlay.style.display = 'none';
    if (btn) btn.disabled = false;
  },

  showError(message) {
    const errorDiv = document.getElementById('validationError');
    if (errorDiv) {
      errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
      errorDiv.style.display = 'flex';
    }
  },

  hideError() {
    const errorDiv = document.getElementById('validationError');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  },

  updateProgress(current, total) {
    const progressDiv = document.getElementById('queryProgress');
    if (progressDiv) {
      const percent = Math.round((current / total) * 100);
      progressDiv.innerHTML = `
        <div class="progress-text">正在查询... ${current}/${total} (${percent}%)</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percent}%"></div>
        </div>
      `;
      progressDiv.style.display = 'block';
    }
  },

  hideProgress() {
    const progressDiv = document.getElementById('queryProgress');
    if (progressDiv) {
      progressDiv.style.display = 'none';
    }
  },

  updateStats() {
    const results = this.currentResults;
    const total = results.length;
    const used = results.filter(r => r.status === '1' || r.status === 1).length;
    const unused = results.filter(r => r.status === '0' || r.status === 0).length;

    const statTotal = document.getElementById('statTotal');
    const statUsed = document.getElementById('statUsed');
    const statUnused = document.getElementById('statUnused');
    const tabAllCount = document.getElementById('tabAllCount');
    const tabUsedCount = document.getElementById('tabUsedCount');
    const tabUnusedCount = document.getElementById('tabUnusedCount');

    if (statTotal) statTotal.textContent = total;
    if (statUsed) statUsed.textContent = used;
    if (statUnused) statUnused.textContent = unused;
    if (tabAllCount) tabAllCount.textContent = total;
    if (tabUsedCount) tabUsedCount.textContent = used;
    if (tabUnusedCount) tabUnusedCount.textContent = unused;
  },

  setFilter(filter) {
    this.currentFilter = filter;

    // 更新 Tab 样式
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

    // 重新渲染表格
    this.renderTable();
  },

  getFilteredResults() {
    const results = this.currentResults;
    if (this.currentFilter === 'used') {
      return results.filter(r => r.status === '1' || r.status === 1);
    } else if (this.currentFilter === 'unused') {
      return results.filter(r => r.status === '0' || r.status === 0);
    }
    return results;
  },

  renderTable() {
    const tbody = document.getElementById('resultsBody');
    if (!tbody) return;

    const filtered = this.getFilteredResults();
    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">暂无数据</td>
        </tr>
      `;
      return;
    }

    for (const result of filtered) {
      console.log('Rendering result:', JSON.stringify(result));
      const tr = document.createElement('tr');
      const statusText = ResultFormatter.getStatusText(result.status);
      const statusClass = ResultFormatter.getStatusClass(result.status);

      tr.innerHTML = `
        <td><span class="card-code">${this.escapeHtml(result.cardCode)}</span></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${result.redeemEmail ? this.escapeHtml(result.redeemEmail) : '-'}</td>
        <td>${result.redeemTime || '-'}</td>
      `;
      tbody.appendChild(tr);
    }
  },

  appendResults(newResults) {
    if (!Array.isArray(newResults)) {
      console.error('appendResults: newResults is not an array', newResults);
      return;
    }
    // 使用展开运算符确保正确追加
    this.currentResults = [...this.currentResults, ...newResults];
    this.updateStats();
    this.renderTable();
  },

  clearResults() {
    this.currentResults = [];
    this.currentFilter = 'all';
    this.updateStats();
    this.renderTable();

    // 重置 Tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector('[data-filter="all"]').classList.add('active');
  },

  showResults() {
    const section = document.getElementById('resultsSection');
    if (section) {
      section.style.display = 'block';
    }
  },

  hideResults() {
    const section = document.getElementById('resultsSection');
    if (section) {
      section.style.display = 'none';
    }
  },

  async copyResults() {
    const text = ResultFormatter.formatForCopy(this.currentResults, this.currentFilter);
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('复制成功');
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast('复制成功');
    }
  },

  showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (toast && toastMessage) {
      toastMessage.textContent = message;
      toast.style.display = 'flex';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3000);
    }
  },

  updateCardCount(count) {
    const countSpan = document.getElementById('cardCount');
    if (countSpan) {
      countSpan.textContent = `已输入 ${count} 个卡密`;
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// ========================================
// 主流程
// ========================================

// 单批次查询，持续重试直到所有卡密都获得有效结果
async function queryBatchWithRetry(batch) {
  let attempt = 0;
  let remainingCards = [...batch];
  const resultsMap = new Map(); // 存储已成功获取的结果
  const retryDelay = 3000; // 固定 3 秒重试间隔
  const maxAttempts = 3; // 避免无穷重试

  while (remainingCards.length > 0 && attempt < maxAttempts) {
    attempt++;

    try {
      const response = await QueryApiClient.batchQuery(remainingCards);

      if (response.code === 200 && response.data) {
        // 处理返回的结果
        for (const item of response.data) {
          // 只有状态不是未知(-1)才算成功
          if (item.status !== '-1' && item.status !== -1) {
            resultsMap.set(item.cardCode, item);
          }
        }

        // 找出还没有成功获取结果的卡密
        remainingCards = remainingCards.filter(cardCode => !resultsMap.has(cardCode));

        if (remainingCards.length > 0) {
          console.log(`第 ${attempt} 次尝试，${remainingCards.length} 个卡密未获得有效结果，${retryDelay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } else {
        // 响应码不是 200，等待后重试
        console.log(`第 ${attempt} 次请求响应异常 (code: ${response.code})，${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      console.error(`第 ${attempt} 次请求出错:`, error);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // 超过最大重试次数仍未获取到结果的卡密，标记为未知
  if (remainingCards.length > 0) {
    for (const cardCode of remainingCards) {
      if (!resultsMap.has(cardCode)) {
        resultsMap.set(cardCode, { cardCode, status: '-1' });
      }
    }
  }

  // 按照原始顺序返回结果
  return batch.map(cardCode => resultsMap.get(cardCode));
}

async function handleQuery() {
  const input = document.getElementById('cardInput');
  if (!input) return;

  const inputValue = input.value;
  const parsed = InputParser.parseAndValidate(inputValue);
  const validation = SubmissionValidator.validate(parsed);

  QueryUI.hideError();
  QueryUI.clearResults();
  QueryUI.hideProgress();

  if (!validation.canSubmit) {
    QueryUI.showError(validation.error);
    return;
  }

  const validCards = parsed.validCards;
  const totalCards = validCards.length;
  const batches = [];

  // 分批
  for (let i = 0; i < totalCards; i += CONFIG.BATCH_SIZE) {
    batches.push(validCards.slice(i, i + CONFIG.BATCH_SIZE));
  }

  QueryUI.showLoading();
  QueryUI.showResults();

  let processedCount = 0;

  try {
    for (const batch of batches) {
      QueryUI.updateProgress(processedCount, totalCards);

      const response = await QueryApiClient.batchQuery(batch);
      const items = (response && Array.isArray(response.data)) ? response.data : [];
      const batchStart = processedCount;
      for (const item of items) {
        QueryUI.appendResults([item]);
        processedCount += 1;
        QueryUI.updateProgress(processedCount, totalCards);
      }

      // 如果返回条数少于请求条数，进度也按请求条数推进，避免卡在中间
      if (processedCount < batchStart + batch.length) {
        processedCount = batchStart + batch.length;
        QueryUI.updateProgress(processedCount, totalCards);
      }

      // 批次间延迟 3 秒，避免触发频率限制
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    QueryUI.showToast(`查询完成，共 ${totalCards} 个卡密`);

  } catch (error) {
    QueryUI.showError(error && error.message ? error.message : '网络请求失败，请稍后再试');
    console.error('Query error:', error);
  } finally {
    QueryUI.hideLoading();
    QueryUI.hideProgress();
  }
}

function copyResults() {
  QueryUI.copyResults();
}

function setFilter(filter) {
  QueryUI.setFilter(filter);
}

// ========================================
// 初始化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('cardInput');
  if (input) {
    input.addEventListener('input', () => {
      const parsed = InputParser.parse(input.value);
      const { unique } = InputParser.normalize(parsed);
      QueryUI.updateCardCount(unique.length);
    });
  }

  // 点击生成雪花效果
  document.addEventListener('click', function (e) {
    createClickSnowflake(e.clientX, e.clientY);
  });
});

// 点击雪花效果
function createClickSnowflake(x, y) {
  const snowflakes = ['❄', '❅', '❆', '✻', '✼'];
  const count = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < count; i++) {
    const flake = document.createElement('div');
    flake.className = 'click-snowflake';
    flake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
    flake.style.left = x + 'px';
    flake.style.top = y + 'px';
    flake.style.setProperty('--tx', (Math.random() - 0.5) * 100 + 'px');
    flake.style.setProperty('--ty', (Math.random() - 0.5) * 100 + 'px');
    flake.style.animationDuration = (0.6 + Math.random() * 0.4) + 's';
    document.body.appendChild(flake);

    setTimeout(() => flake.remove(), 1000);
  }
}

// 导出模块供测试使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    InputParser,
    SubmissionValidator,
    ResultFormatter,
    QueryApiClient,
    QueryUI,
    CONFIG
  };
}
