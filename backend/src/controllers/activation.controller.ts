import { Request, Response } from 'express';
import { activateCode } from '../services/code.service.js';

/**
 * POST /api/v1/activate
 * Активация кода
 */
export async function activateCodeHandler(req: Request, res: Response) {
  try {
    const { code } = req.body;
    const userIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent');

    // Валидация
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Код обязателен'
      });
    }

    // Очистка кода от лишних символов
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Код слишком короткий'
      });
    }

    // Активация
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
    
    // Возвращаем только информацию о статусе, без активации
    // Это нужно для реализации UI с проверкой
    
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
