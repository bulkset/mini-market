// DurielAPI Service - для активации ChatGPT подписок
const API_BASE = 'https://receipt-api.nitro.xin';

// Интерфейсы для ответов API
export interface CDKCheckResult {
  code: string;
  used: boolean;
  app_name: string;
  app_product_name: string;
}

export interface OutstockResult {
  task_id: string;
}

export interface TaskStatusResult {
  task_id: string;
  cdk: string;
  pending: boolean;
  success: boolean;
  message?: string;
}

export interface CDKUsageResult {
  code: string;
  used: boolean;
  app_name: string;
  user: string;
  redeem_time: string;
}

/**
 * Проверка CDK валидности
 */
export async function checkCDK(code: string, productId: string = 'chatgpt'): Promise<CDKCheckResult | null> {
  try {
    const response = await fetch(`${API_BASE}/cdks/public/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Product-ID': productId
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      console.error('CDK check failed:', response.status, await response.text());
      return null;
    }

    return await response.json() as CDKCheckResult;
  } catch (error) {
    console.error('CDK check error:', error);
    return null;
  }
}

/**
 * Запуск задачи на активацию (outstock)
 */
export async function startRecharge(cdk: string, userToken: string): Promise<OutstockResult | null> {
  try {
    const response = await fetch(`${API_BASE}/stocks/public/outstock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cdk,
        user: userToken
      })
    });

    if (!response.ok) {
      console.error('Outstock failed:', response.status, await response.text());
      return null;
    }

    const text = await response.text();
    return { task_id: text };
  } catch (error) {
    console.error('Outstock error:', error);
    return null;
  }
}

/**
 * Проверка статуса задачи
 */
export async function checkTaskStatus(taskId: string): Promise<TaskStatusResult | null> {
  try {
    const response = await fetch(`${API_BASE}/stocks/public/outstock/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Task status check failed:', response.status);
      return null;
    }

    return await response.json() as TaskStatusResult;
  } catch (error) {
    console.error('Task status error:', error);
    return null;
  }
}

/**
 * Проверка использования CDK
 */
export async function checkCDKUsage(codes: string): Promise<CDKUsageResult | null> {
  try {
    const response = await fetch(`${API_BASE}/public/check-usage/${codes}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('CDK usage check failed:', response.status);
      return null;
    }

    return await response.json() as CDKUsageResult;
  } catch (error) {
    console.error('CDK usage check error:', error);
    return null;
  }
}
