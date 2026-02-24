const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run('ALTER TABLE products ADD COLUMN product_title_1 TEXT', (err) => {
    if (err && err.message.includes('duplicate column')) {
      console.log('✓ product_title_1 already exists');
    } else if (err) {
      console.log('✗ product_title_1:', err.message);
    } else {
      console.log('✓ product_title_1 added');
    }
  });

  db.run('ALTER TABLE products ADD COLUMN product_title_2 TEXT', (err) => {
    if (err && err.message.includes('duplicate column')) {
      console.log('✓ product_title_2 already exists');
    } else if (err) {
      console.log('✗ product_title_2:', err.message);
    } else {
      console.log('✓ product_title_2 added');
    }
  });
});

setTimeout(() => {
  db.close();
  console.log('Done!');
}, 500);
