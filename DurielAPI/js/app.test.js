/**
 * ChatGPT Account Recharge System - Property-Based Tests
 * 使用 fast-check 进行属性测试
 */

const fc = require('fast-check');

// ============ 模拟 I18n 模块 ============
const I18n = {
  currentLang: 'zh-CN',
  t(key) {
    const translations = {
      'token_invalid': 'Token格式错误',
      'team_account_error': 'Team账户不支持充值',
      'plus_confirm': '您的账号已是PLUS会员，是否覆盖充值？',
      'cdk_not_exist': '卡密不存在',
      'cdk_used': '卡密已被使用',
      'cdk_disabled': '卡密已禁用',
      'cdk_expired': '卡密已失效',
      'cdk_invalid': 'CDK无效，请检查后重试',
      'recharge_success': '充值成功！您的账号已升级为PLUS会员',
      'recharge_fail': '充值失败，请稍后再试',
      'network_error': '网络请求失败，请稍后再试',
      'timeout_error': '任务超时，请稍后查询结果'
    };
    return translations[key] || key;
  }
};

// ============ 被测试的业务逻辑函数 ============

/**
 * 解析Token
 */
function parseToken(tokenContent) {
  try {
    const data = JSON.parse(tokenContent);
    
    if (!data.accessToken) {
      throw new Error(I18n.t('token_invalid'));
    }
    if (!data.user || !data.user.email) {
      throw new Error(I18n.t('token_invalid'));
    }
    if (!data.account || !data.account.planType) {
      throw new Error(I18n.t('token_invalid'));
    }
    
    return {
      email: data.user.email,
      planType: data.account.planType,
      raw: data
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(I18n.t('token_invalid'));
    }
    throw error;
  }
}

/**
 * 检查账户类型
 */
function checkAccountType(planType) {
  if (planType === 'team') {
    return {
      canSubmit: false,
      error: I18n.t('team_account_error')
    };
  }
  
  if (planType === 'plus') {
    return {
      canSubmit: true,
      needsConfirmation: true,
      confirmMessage: I18n.t('plus_confirm')
    };
  }
  
  return {
    canSubmit: true,
    needsConfirmation: false,
    allowOverwrite: false
  };
}

/**
 * 获取CDK状态消息
 */
function getCDKStatusMessage(verifyResult) {
  const { exists, valid, cardStatus } = verifyResult;
  
  if (exists && valid && cardStatus === '0') {
    return { success: true, message: verifyResult.message };
  }
  
  if (!exists) {
    return { success: false, message: I18n.t('cdk_not_exist') };
  }
  
  switch (cardStatus) {
    case '1':
      return { success: false, message: I18n.t('cdk_used') };
    case '2':
      return { success: false, message: I18n.t('cdk_disabled') };
    case '3':
      return { success: false, message: I18n.t('cdk_expired') };
    default:
      return { success: false, message: I18n.t('cdk_invalid') };
  }
}

/**
 * 判断轮询是否应该终止
 */
function shouldStopPolling(taskStatus, attempts, maxAttempts) {
  if (taskStatus === 'SUCCESS') {
    return { stop: true, reason: 'success' };
  }
  if (taskStatus === 'FAILED' || taskStatus === 'CANCELLED') {
    return { stop: true, reason: 'failed' };
  }
  if (attempts >= maxAttempts) {
    return { stop: true, reason: 'timeout' };
  }
  return { stop: false };
}

/**
 * 保存历史记录
 */
function saveToHistory(record, storage) {
  const history = JSON.parse(storage.getItem('rechargeHistory') || '[]');
  
  const maskedCDK = record.cdk ? 
    record.cdk.substring(0, 4) + '****' + record.cdk.substring(record.cdk.length - 4) : 
    '-';
  
  history.unshift({
    email: record.email || '-',
    cdk: maskedCDK,
    result: record.result || '-',
    taskStatus: record.taskStatus || '-',
    timestamp: new Date().toLocaleString()
  });
  
  if (history.length > 50) {
    history.pop();
  }
  
  storage.setItem('rechargeHistory', JSON.stringify(history));
  return history;
}

/**
 * 获取历史记录
 */
function getHistory(storage) {
  return JSON.parse(storage.getItem('rechargeHistory') || '[]');
}

// ============ 属性测试 ============

describe('Property Tests - ChatGPT Recharge System', () => {
  
  /**
   * Property 1: CDK 验证状态映射
   * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
   */
  describe('Property 1: CDK 验证状态映射', () => {
    // Feature: frontend-backend-separation, Property 1: CDK验证状态映射
    
    test('有效CDK返回成功', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const result = getCDKStatusMessage({
            exists: true,
            valid: true,
            cardStatus: '0',
            message: message
          });
          return result.success === true && result.message === message;
        }),
        { numRuns: 100 }
      );
    });

    test('不存在的CDK返回正确错误', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('0', '1', '2', '3', null),
          (cardStatus) => {
            const result = getCDKStatusMessage({
              exists: false,
              valid: false,
              cardStatus: cardStatus
            });
            return result.success === false && result.message === '卡密不存在';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('已使用CDK返回正确错误', () => {
      const result = getCDKStatusMessage({
        exists: true,
        valid: false,
        cardStatus: '1'
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe('卡密已被使用');
    });

    test('已禁用CDK返回正确错误', () => {
      const result = getCDKStatusMessage({
        exists: true,
        valid: false,
        cardStatus: '2'
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe('卡密已禁用');
    });

    test('已失效CDK返回正确错误', () => {
      const result = getCDKStatusMessage({
        exists: true,
        valid: false,
        cardStatus: '3'
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe('卡密已失效');
    });
  });

  /**
   * Property 2: Token 解析与提取
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  describe('Property 2: Token 解析与提取', () => {
    // Feature: frontend-backend-separation, Property 2: Token解析与提取
    
    test('有效Token正确解析', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.constantFrom('free', 'plus', 'team'),
          fc.string({ minLength: 10 }),
          (email, planType, accessToken) => {
            const tokenContent = JSON.stringify({
              accessToken: accessToken,
              user: { email: email, idp: 'auth0' },
              account: { planType: planType, id: 'test-id' }
            });
            
            const result = parseToken(tokenContent);
            return result.email === email && result.planType === planType;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('无效JSON抛出错误', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try { JSON.parse(s); return false; } catch { return true; }
          }),
          (invalidJson) => {
            try {
              parseToken(invalidJson);
              return false;
            } catch (e) {
              return e.message === 'Token格式错误';
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('缺少必要字段抛出错误', () => {
      // 缺少 accessToken
      expect(() => parseToken(JSON.stringify({
        user: { email: 'test@test.com' },
        account: { planType: 'free' }
      }))).toThrow('Token格式错误');

      // 缺少 user.email
      expect(() => parseToken(JSON.stringify({
        accessToken: 'token',
        user: {},
        account: { planType: 'free' }
      }))).toThrow('Token格式错误');

      // 缺少 account.planType
      expect(() => parseToken(JSON.stringify({
        accessToken: 'token',
        user: { email: 'test@test.com' },
        account: {}
      }))).toThrow('Token格式错误');
    });
  });

  /**
   * Property 3: 账户类型处理逻辑
   * **Validates: Requirements 3.4, 3.5, 3.6**
   */
  describe('Property 3: 账户类型处理逻辑', () => {
    // Feature: frontend-backend-separation, Property 3: 账户类型处理逻辑
    
    test('team账户不允许提交', () => {
      const result = checkAccountType('team');
      expect(result.canSubmit).toBe(false);
      expect(result.error).toBe('Team账户不支持充值');
    });

    test('plus账户需要确认', () => {
      const result = checkAccountType('plus');
      expect(result.canSubmit).toBe(true);
      expect(result.needsConfirmation).toBe(true);
    });

    test('free账户直接通过', () => {
      const result = checkAccountType('free');
      expect(result.canSubmit).toBe(true);
      expect(result.needsConfirmation).toBe(false);
      expect(result.allowOverwrite).toBe(false);
    });

    test('账户类型处理一致性', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('free', 'plus', 'team'),
          (planType) => {
            const result = checkAccountType(planType);
            
            if (planType === 'team') {
              return result.canSubmit === false && result.error !== undefined;
            }
            if (planType === 'plus') {
              return result.canSubmit === true && result.needsConfirmation === true;
            }
            if (planType === 'free') {
              return result.canSubmit === true && result.needsConfirmation === false;
            }
            return false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: 轮询终止条件
   * **Validates: Requirements 5.3, 5.4, 5.5, 5.6**
   */
  describe('Property 4: 轮询终止条件', () => {
    // Feature: frontend-backend-separation, Property 4: 轮询终止条件
    
    test('SUCCESS状态停止轮询', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 150 }),
          (attempts) => {
            const result = shouldStopPolling('SUCCESS', attempts, 150);
            return result.stop === true && result.reason === 'success';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('FAILED状态停止轮询', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 150 }),
          (attempts) => {
            const result = shouldStopPolling('FAILED', attempts, 150);
            return result.stop === true && result.reason === 'failed';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('CANCELLED状态停止轮询', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 150 }),
          (attempts) => {
            const result = shouldStopPolling('CANCELLED', attempts, 150);
            return result.stop === true && result.reason === 'failed';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('超时停止轮询', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('PENDING', 'PROCESSING'),
          fc.integer({ min: 150, max: 300 }),
          (status, attempts) => {
            const result = shouldStopPolling(status, attempts, 150);
            return result.stop === true && result.reason === 'timeout';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('PENDING/PROCESSING状态继续轮询', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('PENDING', 'PROCESSING'),
          fc.integer({ min: 1, max: 149 }),
          (status, attempts) => {
            const result = shouldStopPolling(status, attempts, 150);
            return result.stop === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: 历史记录完整性
   * **Validates: Requirements 6.1, 6.2, 6.4**
   */
  describe('Property 5: 历史记录完整性', () => {
    // Feature: frontend-backend-separation, Property 5: 历史记录完整性
    
    let mockStorage;
    
    beforeEach(() => {
      mockStorage = {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, value) { this.store[key] = value; }
      };
    });

    test('保存记录包含所有必要字段', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.string({ minLength: 16, maxLength: 16 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1 }),
          fc.constantFrom('SUCCESS', 'FAILED'),
          (email, cdk, result, taskStatus) => {
            saveToHistory({ email, cdk, result, taskStatus }, mockStorage);
            const history = getHistory(mockStorage);
            
            const record = history[0];
            return (
              record.email === email &&
              record.cdk.includes('****') &&
              record.result === result &&
              record.taskStatus === taskStatus &&
              record.timestamp !== undefined
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    test('CDK正确隐藏中间部分', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 16, maxLength: 16 }),
          (cdk) => {
            saveToHistory({ email: 'test@test.com', cdk, result: 'ok', taskStatus: 'SUCCESS' }, mockStorage);
            const history = getHistory(mockStorage);
            
            const maskedCDK = history[0].cdk;
            return (
              maskedCDK.startsWith(cdk.substring(0, 4)) &&
              maskedCDK.includes('****') &&
              maskedCDK.endsWith(cdk.substring(cdk.length - 4))
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    test('历史记录按时间倒序排列', () => {
      // 添加多条记录
      for (let i = 0; i < 5; i++) {
        saveToHistory({
          email: `test${i}@test.com`,
          cdk: `CDK${i}CDK${i}CDK${i}CDK${i}`,
          result: `result${i}`,
          taskStatus: 'SUCCESS'
        }, mockStorage);
      }
      
      const history = getHistory(mockStorage);
      
      // 最新的记录应该在最前面
      expect(history[0].email).toBe('test4@test.com');
      expect(history[4].email).toBe('test0@test.com');
    });

    test('历史记录最多保存50条', () => {
      for (let i = 0; i < 60; i++) {
        saveToHistory({
          email: `test${i}@test.com`,
          cdk: `CDK${i}CDK${i}CDK${i}CDK${i}`,
          result: `result${i}`,
          taskStatus: 'SUCCESS'
        }, mockStorage);
      }
      
      const history = getHistory(mockStorage);
      expect(history.length).toBe(50);
    });
  });

  /**
   * Property 6: 错误处理一致性
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
   */
  describe('Property 6: 错误处理一致性', () => {
    // Feature: frontend-backend-separation, Property 6: 错误处理一致性
    
    test('CDK状态错误返回正确消息', () => {
      const statusMap = {
        '1': '卡密已被使用',
        '2': '卡密已禁用',
        '3': '卡密已失效'
      };
      
      fc.assert(
        fc.property(
          fc.constantFrom('1', '2', '3'),
          (cardStatus) => {
            const result = getCDKStatusMessage({
              exists: true,
              valid: false,
              cardStatus: cardStatus
            });
            return result.success === false && result.message === statusMap[cardStatus];
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Token解析错误返回一致消息', () => {
      const invalidInputs = [
        '',
        'not json',
        '{}',
        '{"accessToken": "token"}',
        '{"user": {"email": "test@test.com"}}'
      ];
      
      invalidInputs.forEach(input => {
        try {
          parseToken(input);
          fail('Should have thrown an error');
        } catch (e) {
          expect(e.message).toBe('Token格式错误');
        }
      });
    });
  });
});
