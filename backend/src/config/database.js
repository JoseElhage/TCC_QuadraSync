const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Testar a conexão ao inicializar
pool.getConnection()
  .then(connection => {
    console.log('✅ Conectado ao MySQL com sucesso!');
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    connection.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao MySQL:');
    console.error(`   Código: ${err.code}`);
    console.error(`   Mensagem: ${err.message}`);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Verifique usuário e senha do MySQL');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('   → MySQL não está rodando ou host/porta incorretos');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error(`   → Database '${process.env.DB_NAME}' não existe`);
    }
  });

module.exports = pool;