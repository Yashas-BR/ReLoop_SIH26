const db = require('../db/database');

/**
 * GET /api/health
 * Performs a real DB query to confirm connectivity.
 */
function healthCheck(req, res) {
  try {
    // Real DB query: get table counts to prove the DB is live
    const tables = ['collectors', 'recyclers', 'materials', 'prices', 'lots', 'transactions', 'traceability'];
    const counts = {};
    tables.forEach(table => {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      counts[table] = row.count;
    });

    // Also get DB file info
    const dbInfo = db.prepare("SELECT sqlite_version() as version").get();
    const dbPageCount = db.prepare("PRAGMA page_count").get();
    const dbPageSize = db.prepare("PRAGMA page_size").get();
    const dbSizeBytes = dbPageCount.page_count * dbPageSize.page_size;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        sqlite_version: dbInfo.version,
        size_bytes: dbSizeBytes,
        table_counts: counts,
      },
      server: {
        node_version: process.version,
        uptime_seconds: Math.floor(process.uptime()),
        env: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      database: { connected: false },
    });
  }
}

module.exports = { healthCheck };
