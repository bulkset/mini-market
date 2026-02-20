import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../db/models/index.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Вход администратора
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email и пароль обязательны'
      });
    }

    // Поиск пользователя
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверные учётные данные'
      });
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверные учётные данные'
      });
    }

    // Проверка активности
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Аккаунт отключён'
      });
    }

    // Обновление времени последнего входа
    await user.update({ lastLogin: new Date() });

    // Генерация токенов
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Обновление токена
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh токен обязателен'
      });
    }

    // Проверка refresh токена
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string };

    // Поиск пользователя
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Генерация нового access токена
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return res.status(200).json({
      success: true,
      data: { accessToken }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Недействительный refresh токен'
    });
  }
});

/**
 * POST /api/v1/auth/register
 * Регистрация нового администратора (только для super_admin)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email и пароль обязательны'
      });
    }

    // Проверка существования пользователя
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Пользователь уже существует'
      });
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 12);

    // Создание пользователя
    const user = await User.create({
      email,
      passwordHash,
      name: name || null,
      role: 'admin',
      isActive: true
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Получение информации о текущем пользователе
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Токен не предоставлен'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { id: string };
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Недействительный токен'
    });
  }
});

export { router as authRoutes };
