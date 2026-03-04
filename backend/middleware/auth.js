const jwt = require('jsonwebtoken');

// Аутентификация
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// Проверка роли администратора
const checkAdmin = (req, res, next) => {
  if (req.user.role_id !== 2) {
    return res.status(403).json({ error: 'Требуются права администратора' });
  }
  next();
};

module.exports = { authenticateToken, checkAdmin };