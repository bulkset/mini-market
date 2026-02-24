// Скрипт для добавления колонки gpt_type в таблицу products
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err);
    process.exit(1);
  }
  console.log('✓ Подключено к БД:', dbPath);
});

// Проверяем есть ли уже колонка
db.all("PRAGMA table_info(products)", (err, rows) => {
  if (err) {
    console.error('Ошибка:', err);
    db.close();
    process.exit(1);
  }
  
  const hasGptType = rows.some(row => row.name === 'gpt_type');
  
  if (hasGptType) {
    console.log('✓ Колонка gpt_type уже существует');
    db.close();
    process.exit(0);
  }
  
  db.run("ALTER TABLE products ADD COLUMN gpt_type TEXT", (err) => {
    if (err) {
      console.error('Ошибка добавления колонки:', err);
    } else {
      console.log('✓ Колонка gpt_type добавлена в таблицу products!');
    }
    db.close();
    process.exit(0);
  });
});
