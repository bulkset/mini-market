const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.run("ALTER TABLE instruction_templates ADD COLUMN type TEXT DEFAULT 'simple'", function(err) {
  if (err) {
    console.error('Error adding column:', err.message);
  } else {
    console.log('Column "type" added successfully!');
  }
  db.close();
});
