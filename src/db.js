const mysql = require('mysql2/promise');

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'laparin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'laparin',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
  });
}

module.exports = { createPool };
