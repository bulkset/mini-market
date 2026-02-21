import { Sequelize } from 'sequelize';
import { config } from '../config/index.js';

const dbConfig = config.db;

export const sequelize = new Sequelize({
  dialect: dbConfig.type as 'sqlite' | 'postgres',
  storage: dbConfig.type === 'sqlite' ? dbConfig.storage : undefined,
  host: dbConfig.type !== 'sqlite' ? dbConfig.host : undefined,
  port: dbConfig.type !== 'sqlite' ? dbConfig.port : undefined,
  database: dbConfig.type !== 'sqlite' ? dbConfig.name : undefined,
  username: dbConfig.type !== 'sqlite' ? dbConfig.user : undefined,
  password: dbConfig.type !== 'sqlite' ? dbConfig.password : undefined,
  logging: config.nodeEnv === 'development' ? console.log : false,
  pool: dbConfig.type !== 'sqlite' ? {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  } : undefined,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

export async function testConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('✓ Подключение к базе данных установлено');
    return true;
  } catch (error) {
    console.error('✗ Ошибка подключения к базе данных:', error);
    return false;
  }
}

export async function syncDatabase(): Promise<void> {
  try {
    await sequelize.sync({ alter: false });
    console.log('✓ Синхронизация моделей с БД выполнена');
  } catch (error) {
    console.error('✗ Ошибка синхронизации:', error);
  }
}
