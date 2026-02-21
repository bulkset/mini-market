const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], function(err, rows) {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Tables:');
    rows.forEach(row => console.log(row.name));
  }
  db.close();
});
