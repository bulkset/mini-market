import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { testConnection, syncDatabase } from './db/connection.js';
import { activateCodeHandler, checkCodeStatusHandler } from './controllers/activation.controller.js';
import { authRoutes } from './routes/auth.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { Setting } from './db/models/index.js';

const app: Express = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

const generalLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.maxRequests,
  message: { success: false, error: 'Слишком много запросов' }
});
app.use(generalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =====================================================
// ROUTES - Публичный API
// =====================================================

// API v1
app.post('/api/v1/activate', activateCodeHandler);
app.get('/api/v1/activate/status/:code', checkCodeStatusHandler);

app.get('/api/v1/settings', async (req: Request, res: Response) => {
  try {
    const settings = await Setting.findAll();
    const settingsObj = settings.reduce((acc: any, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json({ 
      success: true, 
      data: {
        store_name: settingsObj.store_name || 'KABAN STORE',
        store_description: settingsObj.store_description || ''
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка загрузки настроек' });
  }
});

app.use('/uploads', express.static(config.upload.dir));

app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/admin', adminRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================================================
// ERROR HANDLING
// =====================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Ресурс не найден' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Ошибка:', err);
  res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
});

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Не удалось подключиться к базе данных');
      process.exit(1);
    }

    await syncDatabase();

    app.listen(config.port, () => {
      console.log(`✓ Сервер запущен на порту ${config.port}`);
      console.log(`✓ Режим: ${config.nodeEnv}`);
      console.log(`✓ API: http://localhost:${config.port}/api/v1`);
    });
  } catch (error) {
    console.error('Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

startServer();

export default app;
