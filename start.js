// start.js
const { execSync } = require('child_process');

console.log('🔧 A preparar base de dados...');
try {
  execSync('node setup-db.js', { stdio: 'inherit', env: process.env });
} catch(e) {
  console.error('Setup erro:', e.message);
}

console.log('🚀 A arrancar servidor...');
require('./src/index.js');
