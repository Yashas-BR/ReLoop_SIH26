const db = require('./db/database');
console.log(db.prepare("PRAGMA table_info('recyclers')").all());
console.log(db.prepare("SELECT * FROM recyclers LIMIT 2").all());
