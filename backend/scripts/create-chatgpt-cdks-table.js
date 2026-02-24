// Скрипт для создания таблицы chatgpt_cdks напрямую через sqlite3
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

db.run(`
  CREATE TABLE IF NOT EXISTS chatgpt_cdks (
    id TEXT PRIMARY KEY,
    cdk TEXT NOT NULL UNIQUE,
    gpt_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    used_at DATETIME,
    order_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Ошибка создания таблицы:', err);
  } else {
    console.log('✓ Таблица chatgpt_cdks создана успешно!');
  }
  
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='chatgpt_cdks'", (err, rows) => {
    if (err) {
      console.error('Ошибка проверки:', err);
    } else {
      console.log('Таблица существует:', rows.length > 0);
    }
    db.close();
    process.exit(0);
  });
});
