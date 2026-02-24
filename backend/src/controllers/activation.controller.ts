import { Request, Response } from 'express';
import { activateCode } from '../services/code.service.js';
import { startRecharge, checkTaskStatus } from '../services/duriel-api.js';
import { ChatGPTCDK, getAvailableCDK } from '../db/models/chatgpt-cdk.js';
import { ActivationCode } from '../db/models/index.js';

/**
 * POST /api/v1/activate
 * Активация кода
 */
export async function activateCodeHandler(req: Request, res: Response) {
  try {
    const { code } = req.body;
    const userIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent');

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Код обязателен'
      });
    }

    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Код слишком короткий'
      });
    }

    const result = await activateCode(cleanCode, userIp, userAgent);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.product
    });

  } catch (error) {
    console.error('Ошибка активации:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
}

/**
 * GET /api/v1/activate/status/:code
 * Проверка статуса кода (без активации)
 */
export async function checkCodeStatusHandler(req: Request, res: Response) {
  try {
    const { code } = req.params;
    
    return res.status(200).json({
      success: true,
      message: 'Для активации используйте POST /api/v1/activate'
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
}

/**
 * POST /api/v1/activate/recharge
 * Активация с токеном пользователя (DurielAPI)
 */
export async function rechargeWithTokenHandler(req: Request, res: Response) {
  try {
    const { gptType, token, code } = req.body;
    const userIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!gptType || typeof gptType !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Тип GPT обязателен'
      });
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Токен обязателен'
      });
    }

    const cleanToken = token.trim();
    const cleanCode = typeof code === 'string' ? code.trim().toUpperCase() : null;

    let activationCode: ActivationCode | null = null;
    if (cleanCode) {
      activationCode = await ActivationCode.findOne({ where: { code: cleanCode } });
      if (!activationCode) {
        return res.status(400).json({
          success: false,
          error: 'Код не найден'
        });
      }
    }

    // Получаем CDK из пула
    const cdk = await getAvailableCDK(gptType);
    
    if (!cdk) {
      if (activationCode) {
        await activationCode.update({
          cdkStatus: 'failed',
          cdkMessage: 'Нет доступных CDK'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Нет доступных CDK. Обратитесь к администратору.'
      });
    }

    const cleanCDK = cdk.trim().toUpperCase();

    // Запускаем активацию
    const result = await startRecharge(cleanCDK, cleanToken);
    
    if (!result) {
      if (activationCode) {
        await activationCode.update({
          cdkCode: cleanCDK,
          cdkStatus: 'failed',
          cdkMessage: 'Не удалось запустить активацию, неверный токен'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Не удалось запустить активацию, неверный токен'
      });
    }

    if (activationCode) {
      await activationCode.update({
        cdkCode: cleanCDK,
        cdkTaskId: result.task_id,
        cdkStatus: 'pending',
        cdkMessage: null
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        taskId: result.task_id,
        cdk: cleanCDK
      }
    });

  } catch (error) {
    console.error('Ошибка активации:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
}

/**
 * GET /api/v1/activate/recharge/status/:taskId
 * Проверка статуса активации
 */
export async function rechargeStatusHandler(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID обязателен'
      });
    }

    const status = await checkTaskStatus(taskId);

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Не удалось получить статус'
      });
    }

    const nextStatus = status.pending ? 'pending' : (status.success ? 'success' : 'failed');
    const updateData: Record<string, unknown> = {
      cdkStatus: nextStatus,
      cdkMessage: status.message || null
    };
    if (status.cdk) {
      updateData.cdkCode = status.cdk;
    }

    await ActivationCode.update(updateData, { where: { cdkTaskId: taskId } });

    if (!status.pending) {
      const cdkStatus = status.success ? 'used' : 'failed';
      await ChatGPTCDK.update(
        { status: cdkStatus, usedAt: status.success ? new Date() : null },
        { where: { cdk: status.cdk } }
      );
    }

    return res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Ошибка проверки статуса:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
}
