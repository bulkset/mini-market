import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    type: process.env.DB_TYPE || 'sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'mini_market',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    storage: process.env.DB_STORAGE || './database.sqlite',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || '').split(','),
  },

  security: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    codeAttempts: {
      max: parseInt(process.env.CODE_ATTEMPTS_MAX || '5', 10),
      windowMinutes: parseInt(process.env.CODE_ATTEMPTS_WINDOW_MINUTES || '15', 10),
      blockDurationMinutes: parseInt(process.env.CODE_BLOCK_DURATION_MINUTES || '30', 10),
    },
    defaultCodesExpirationDays: parseInt(process.env.DEFAULT_CODES_EXPIRATION_DAYS || '365', 10),
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
