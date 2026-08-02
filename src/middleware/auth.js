const jwt = require('jsonwebtoken');
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado.' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET não está configurado no servidor.' });
  }
  try {
    req.admin = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch (err) {
    console.error('Auth token verify error:', err);
    return res.status(401).json({ error: 'Token inválido.' });
  }
}
module.exports = { requireAuth };