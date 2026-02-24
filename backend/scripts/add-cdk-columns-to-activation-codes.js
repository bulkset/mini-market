// Скрипт для добавления CDK полей в таблицу activation_codes
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

const columnsToAdd = [
  { name: 'cdk_code', ddl: 'ALTER TABLE activation_codes ADD COLUMN cdk_code TEXT' },
  { name: 'cdk_status', ddl: "ALTER TABLE activation_codes ADD COLUMN cdk_status TEXT DEFAULT 'pending'" },
  { name: 'cdk_task_id', ddl: 'ALTER TABLE activation_codes ADD COLUMN cdk_task_id TEXT' },
  { name: 'cdk_message', ddl: 'ALTER TABLE activation_codes ADD COLUMN cdk_message TEXT' }
];

db.all('PRAGMA table_info(activation_codes)', (err, rows) => {
  if (err) {
    console.error('Ошибка:', err);
    db.close();
    process.exit(1);
  }

  const existing = new Set(rows.map((row) => row.name));
  const pending = columnsToAdd.filter((col) => !existing.has(col.name));

  if (pending.length === 0) {
    console.log('✓ Все CDK колонки уже существуют');
    db.close();
    process.exit(0);
  }

  let completed = 0;
  pending.forEach((col) => {
    db.run(col.ddl, (addErr) => {
      if (addErr) {
        console.error(`Ошибка добавления ${col.name}:`, addErr.message);
      } else {
        console.log(`✓ Колонка ${col.name} добавлена`);
      }

      completed += 1;
      if (completed === pending.length) {
        db.close();
        process.exit(0);
      }
    });
  });
});
