/**
 * ChatGPT Account Recharge System
 * 前后端分离版本 - 三步流程
 */

// ============ 配置模块 ============
const CONFIG = {
  API_BASE_URL: '/api',
  POLL_INTERVAL: 10000,
  MAX_POLL_ATTEMPTS: 60 // 10分钟左右
};

// ============ 状态管理模块 ============
const AppState = {
  currentStep: 1,
  verifiedCDK: null,
  tokenData: null,
  allowOverwrite: false,
  plusWarned: false
};

// ============ 多语言模块 ============
const I18n = {
  t(key) {
    const translations = {
      historyBtn: '查看充值记录',
      historyTitle: '充值记录',
      historyEmailLabel: '充值账号',
      historyCdkLabel: '充值卡密',
      historyResultLabel: '充值结果',
      historyTimeLabel: '充值时间',
      noHistory: '暂无充值记录',
      cdk_empty: '请输入充值卡密',
      cdk_not_exist: '卡密不存在',
      cdk_used: '卡密已被使用',
      cdk_disabled: '卡密已禁用',
      cdk_expired: '卡密已失效',
      cdk_invalid: '卡密无效，请检查后重试',
      cdk_valid: '卡密验证成功！',
      token_empty: '请输入Token',
      token_invalid: 'Token格式无效，请检查后重试',
      team_account_error: 'Team账户不支持充值，请切换到个人工作空间',
      recharge_success: '充值成功！您的账号已升级为PLUS会员',
      recharge_fail: '充值失败，请稍后再试',
      network_error: '网络请求失败，请稍后再试',
      recharging: '充值中...',
      timeout_error: '任务超时，请稍后查询结果',
      subStatus: { free: '免费用户', plus: 'PLUS会员', team: 'Team会员' }
    };
    return translations[key] || key;
  }
};

// ============ API 客户端模块 ============
const ApiClient = {
  async request(url, options = {}) {
    try {
      const fullUrl = `${CONFIG.API_BASE_URL}${url}`;
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 500) {
          const errorMsg = await response.text();
          throw new Error(errorMsg);
        }
        throw new Error(`网络请求失败: ${response.status}`);
      }

      // 某些接口可能返回 text 而不是 json
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      if (error.message && !error.message.includes('fetch')) {
        throw error;
      }
      throw new Error(I18n.t('network_error'));
    }
  },
  async verifyCDK(code) {
    return this.request('/cdks/public/check', {
      method: 'POST',
      headers: { 'X-Product-ID': 'chatgpt' },
      body: JSON.stringify({ code })
    });
  },
  async checkAccount(content, secret) {
    // 使用 Nginx 代理地址进行预处理
    try {
      return await this.request('/chatgpt/check', {
        method: 'POST',
        body: JSON.stringify({ content, secret })
      });
    } catch (e) {
      console.warn('Pre-check failed, continuing with raw token:', e);
    }
    return null;
  },
  async chargeCard(cdk, user) {
    // user 传 payload 或 tokenRaw
    return this.request('/stocks/public/outstock', {
      method: 'POST',
      body: JSON.stringify({ cdk, user })
    });
  },
  async getTaskStatus(taskId) {
    return this.request(`/stocks/public/outstock/${taskId}`, {
      method: 'GET'
    });
  }
};


// ============ 业务逻辑模块 ============
const RechargeService = {
  parseToken(tokenContent) {
    try {
      const data = JSON.parse(tokenContent);
      if (!data.accessToken || !data.user?.email || !data.account?.planType) {
        throw new Error(I18n.t('token_invalid'));
      }
      return { email: data.user.email, planType: data.account.planType, raw: data };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(I18n.t('token_invalid'));
      }
      throw error;
    }
  },
  getCDKStatusMessage(verifyResult) {
    // verifyResult: { code, used, app_name, app_product_name }
    if (!verifyResult || !verifyResult.code) {
      return { success: false, message: I18n.t('cdk_invalid') };
    }

    if (verifyResult.used === false || verifyResult.used === 'false') {
      return { success: true, message: I18n.t('cdk_valid') };
    } else {
      return { success: false, message: I18n.t('cdk_used') };
    }
  },
  async pollTaskStatus(taskId) {
    let attempts = 0;
    while (attempts < CONFIG.MAX_POLL_ATTEMPTS) {
      attempts++;
      try {
        const result = await ApiClient.getTaskStatus(taskId);
        // result: { task_id, cdk, pending, success, message }
        if (result.pending === false) {
          if (result.success) {
            return { success: true, message: I18n.t('recharge_success') };
          } else {
            return { success: false, message: result.message || I18n.t('recharge_fail') };
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
      await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
    }
    throw new Error(I18n.t('timeout_error'));
  },
  saveToHistory(record) {
    const history = JSON.parse(localStorage.getItem('rechargeHistory') || '[]');
    history.unshift({
      email: record.email || '-',
      cdk: record.cdk || '-',
      result: record.result || '-',
      taskStatus: record.taskStatus || '-',
      timestamp: new Date().toLocaleString()
    });
    if (history.length > 50) history.pop();
    localStorage.setItem('rechargeHistory', JSON.stringify(history));
  }
};

// ============ UI 控制函数 ============
function showStepResult(stepNum, type, message) {
  const resultEl = document.getElementById(`step${stepNum}Result`);
  if (resultEl) {
    resultEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }
}

function clearStepResult(stepNum) {
  const resultEl = document.getElementById(`step${stepNum}Result`);
  if (resultEl) resultEl.innerHTML = '';
}

function setButtonLoading(btnId, loading, text = '') {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.disabled = loading;
    if (text) {
      // 保留按钮样式，只更新文字
      btn.innerHTML = loading ? `<i class="fas fa-spinner fa-spin"></i> ${text}` : text;
    }
  }
}

function updateStepIndicator(step) {
  for (let i = 1; i <= 3; i++) {
    const indicator = document.getElementById(`stepIndicator${i}`);
    const line = indicator?.nextElementSibling;
    if (indicator) {
      indicator.classList.remove('active', 'completed');
      if (i < step) {
        indicator.classList.add('completed');
      } else if (i === step) {
        indicator.classList.add('active');
      }
    }
    if (line && line.classList.contains('step-line')) {
      line.classList.toggle('completed', i < step);
    }
  }
}

function showPanel(panelId) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');
}

function goToStep(step) {
  AppState.currentStep = step;
  updateStepIndicator(step);
  showPanel(`step${step}Panel`);
  clearStepResult(step);

  // 确保进入步骤3时按钮状态正常
  if (step === 3) {
    setButtonLoading('confirmBtn', false, '确认充值');
  }
}


// ============ 三步流程函数 ============

// 步骤1: 验证CDK
async function verifyCDKStep() {
  const cdkInput = document.getElementById('cdkInput');
  let cdk = cdkInput.value.trim();

  // 支持 CDK- 格式自动转换
  // 输入: CDK-VJV6-WJW6-FB2F-UWV7
  // 转换: GPTVJV6WJW6FB2FUWV7
  if (cdk.toUpperCase().startsWith('CDK-')) {
    cdk = cdk.replace(/-/g, '').replace(/^CDK/i, 'GPT');
  }

  if (!cdk) {
    showStepResult(1, 'error', I18n.t('cdk_empty'));
    return;
  }

  setButtonLoading('verifyCdkBtn', true, '验证中...');
  clearStepResult(1);

  try {
    const verifyResult = await ApiClient.verifyCDK(cdk);
    const status = RechargeService.getCDKStatusMessage(verifyResult);

    if (status.success) {
      AppState.verifiedCDK = cdk;
      AppState.productName = verifyResult.app_product_name || verifyResult.app_name || 'ChatGPT Plus';

      showStepResult(1, 'success', status.message);
      setTimeout(() => goToStep(2), 800);
    } else {
      showStepResult(1, 'error', status.message);
    }
  } catch (error) {
    showStepResult(1, 'error', error.message);
  } finally {
    setButtonLoading('verifyCdkBtn', false, '验证卡密');
  }
}

// 步骤2: 解析Token
async function parseTokenStep() {
  const tokenInput = document.getElementById('tokenInput');
  const token = tokenInput.value.trim();

  if (!token) {
    showStepResult(2, 'error', I18n.t('token_empty'));
    return;
  }

  setButtonLoading('parseTokenBtn', true, '解析中...');
  clearStepResult(2);

  try {
    const tokenData = RechargeService.parseToken(token);

    // 检查Team账户
    if (tokenData.planType === 'team') {
      showStepResult(2, 'error', I18n.t('team_account_error'));
      setButtonLoading('parseTokenBtn', false, '解析账号');
      return;
    }

    AppState.tokenData = tokenData;
    AppState.tokenRaw = token;
    AppState.allowOverwrite = tokenData.planType === 'plus';

    // 更新确认页面信息
    const elCdk = document.getElementById('confirmCdk');
    const elEmail = document.getElementById('confirmEmail');
    const elPlan = document.getElementById('confirmPlan');
    const elProduct = document.getElementById('confirmProductName');

    if (elCdk) elCdk.textContent = AppState.verifiedCDK || '-';
    if (elEmail) elEmail.textContent = tokenData.email || '-';
    if (elPlan) elPlan.textContent = (I18n.t('subStatus')[tokenData.planType] || tokenData.planType) || '-';
    if (elProduct) elProduct.textContent = AppState.productName || '-';

    // 显示Plus警告
    const plusWarning = document.getElementById('plusWarning');
    if (plusWarning) {
      plusWarning.style.display = tokenData.planType === 'plus' ? 'block' : 'none';
    }

    if (tokenData.planType === 'plus' && !AppState.plusWarned) {
      AppState.plusWarned = true;
      showPlusModal();
    }

    showStepResult(2, 'success', `账号解析成功：${tokenData.email}`);
    setTimeout(() => goToStep(3), 800);
  } catch (error) {
    showStepResult(2, 'error', error.message);
  } finally {
    setButtonLoading('parseTokenBtn', false, '解析账号');
  }
}

// 步骤3: 确认充值
async function confirmRecharge() {
  setButtonLoading('confirmBtn', true, I18n.t('recharging'));
  clearStepResult(3);

  try {
    // 直接发起充值，传 tokenRaw 到 outstock
    const taskId = await ApiClient.chargeCard(AppState.verifiedCDK, AppState.tokenRaw);
    if (!taskId) {
      throw new Error('提交充值任务失败');
    }

    // 开始轮询
    const result = await RechargeService.pollTaskStatus(taskId);

    // 保存历史记录
    RechargeService.saveToHistory({
      email: AppState.tokenData.email,
      cdk: AppState.verifiedCDK,
      result: result.message,
      taskStatus: result.success ? 'SUCCESS' : 'FAILED'
    });

    // 显示最终结果
    showFinalResult(result.success, result.message);
  } catch (error) {
    showStepResult(3, 'error', error.message);
    setButtonLoading('confirmBtn', false, '确认充值');
  }
}

function showFinalResult(success, message) {
  // 重置确认按钮状态
  setButtonLoading('confirmBtn', false, '确认充值');

  showPanel('resultPanel');
  const finalResult = document.getElementById('finalResult');
  if (finalResult) {
    finalResult.innerHTML = `
      <div class="result-icon ${success ? 'success' : 'error'}">
        <i class="fas fa-${success ? 'check-circle' : 'times-circle'}"></i>
      </div>
      <div class="result-title">${success ? '充值成功' : '充值失败'}</div>
      <div class="result-message">${message}</div>
    `;
  }
}

function resetSteps() {
  AppState.currentStep = 1;
  AppState.verifiedCDK = null;
  AppState.tokenData = null;
  AppState.tokenRaw = null;
  AppState.allowOverwrite = false;
  AppState.plusWarned = false;
  hidePlusModal();

  document.getElementById('cdkInput').value = '';
  document.getElementById('tokenInput').value = '';
  clearStepResult(1);
  clearStepResult(2);
  clearStepResult(3);

  // 重置所有按钮状态
  setButtonLoading('verifyCdkBtn', false, '验证卡密');
  setButtonLoading('parseTokenBtn', false, '解析账号');
  setButtonLoading('confirmBtn', false, '确认充值');

  goToStep(1);
}

// ============ 历史记录 ============
function showHistory() {
  const modal = document.getElementById('historyModal');
  const content = document.getElementById('historyContent');
  const history = JSON.parse(localStorage.getItem('rechargeHistory') || '[]');

  content.innerHTML = `
    <div class="history-header">
      <div class="history-header-item">充值卡密</div>
      <div class="history-header-item">充值账号</div>
      <div class="history-header-item">充值结果</div>
      <div class="history-header-item">充值时间</div>
    </div>
  `;

  if (history.length === 0) {
    content.innerHTML += `<div class="history-item history-empty"><div class="history-value">暂无充值记录</div></div>`;
  } else {
    content.innerHTML += history.map(item => `
      <div class="history-item">
        <div class="history-value">${item.cdk || '-'}</div>
        <div class="history-value">${item.email || '-'}</div>
        <div class="history-result">${item.result || '-'}</div>
        <div class="history-value">${item.timestamp || '-'}</div>
      </div>
    `).join('');
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideHistory() {
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function showPlusModal() {
  const modal = document.getElementById('plusModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function hidePlusModal() {
  const modal = document.getElementById('plusModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', function () {
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) hideHistory();
    });
  }

  const plusModal = document.getElementById('plusModal');
  if (plusModal) {
    plusModal.addEventListener('click', function (e) {
      if (e.target === plusModal) hidePlusModal();
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
