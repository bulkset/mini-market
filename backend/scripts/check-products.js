const sqlite3 = require('sqlite3').verbose();

const dbPath = 'C:/Users/GlowNestOffice/Documents/GitHub/mini-market/backend/database.sqlite';
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(products)", [], function(err, rows) {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Products table columns:');
    rows.forEach(row => console.log(row.name, '-', row.type));
  }
  db.close();
});
