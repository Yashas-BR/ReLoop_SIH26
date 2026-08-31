const db = require('../db/database');
console.log('transactions schema:');
console.log(db.prepare("PRAGMA table_info('transactions')").all());
console.log('\ntraceability schema:');
console.log(db.prepare("PRAGMA table_info('traceability')").all());
