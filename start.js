// start.js — corre migrações e arranca o servidor
const { execSync, spawn } = require('child_process');

console.log('🔄 A correr migrações...');
try {
  execSync('node node_modules/prisma/build/index.js migrate deploy', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('✅ Migrações aplicadas.');
} catch (err) {
  console.error('⚠️ Migrações falharam, a continuar...', err.message);
}

console.log('🚀 A arrancar servidor...');
require('./src/index.js');
