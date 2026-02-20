import bcrypt from 'bcryptjs';
import { sequelize } from '../src/db/connection.js';
import { User } from '../src/db/models/index.js';
import { config } from '../src/config/index.js';

// Настройка логирования
if (config.nodeEnv === 'development') {
  console.log = (...args: any[]) => process.stdout.write(args.join(' ') + '\n');
}

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✓ Подключение к БД установлено');

    // Синхронизация моделей
    await sequelize.sync({ alter: true });
    console.log('✓ Модели синхронизированы');

    // Проверка существования админа
    const existingAdmin = await User.findOne({ where: { email: 'admin@minimarket.local' } });
    
    if (existingAdmin) {
      console.log('✓ Админ уже существует:', existingAdmin.email);
      console.log('  Роль:', existingAdmin.role);
      console.log('  Активен:', existingAdmin.isActive);
      process.exit(0);
    }

    // Создание админа
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    const admin = await User.create({
      email: 'admin@minimarket.local',
      passwordHash,
      name: 'Администратор',
      role: 'super_admin',
      isActive: true
    });

    console.log('✓ Админ создан успешно!');
    console.log('  Email:', admin.email);
    console.log('  Пароль: admin123');
    console.log('  Роль:', admin.role);

    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
}

createAdmin();
