const sqlite3 = require('sqlite3').verbose();

const dbPath = '/mini-market/backend/database.sqlite';
const db = new sqlite3.Database(dbPath);

db.run("ALTER TABLE products ADD COLUMN instruction_template_id TEXT", function(err) {
  if (err) {
    console.error('Error adding column:', err.message);
  } else {
    console.log('Column "instruction_template_id" added successfully!');
  }
  db.close();
});
