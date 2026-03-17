/**
 * Скрипт миграции: добавление колонки gpt_type в таблицу activation_codes
 * Запустить: node backend/scripts/add-gpt-type-to-activation-codes.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './.env' });

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✓ Подключение к БД установлено');

    // Проверяем, существует ли колонка
    const tableInfo = await sequelize.query("PRAGMA table_info(activation_codes)");
    const columns = tableInfo[0];
    const hasGptType = columns.some(col => col.name === 'gpt_type');

    if (hasGptType) {
      console.log('! Колонка gpt_type уже существует');
    } else {
      // Добавляем колонку
      await sequelize.query(`
        ALTER TABLE activation_codes ADD COLUMN gpt_type VARCHAR(50)
      `);
      console.log('✓ Колонка gpt_type добавлена');
    }

    // Обновляем существующие записи с GPT товарами
    // Берем gptType из связанного продукта
    await sequelize.query(`
      UPDATE activation_codes 
      SET gpt_type = (
        SELECT gpt_type FROM products 
        WHERE products.id = activation_codes.product_id
      )
      WHERE activation_codes.product_id IN (
        SELECT id FROM products WHERE gpt_type IS NOT NULL
      )
    `);
    console.log('✓ Существующие записи обновлены');

    await sequelize.close();
    console.log('✓ Миграция завершена');
    process.exit(0);
  } catch (error) {
    console.error('✗ Ошибка миграции:', error);
    await sequelize.close();
    process.exit(1);
  }
}

migrate();
