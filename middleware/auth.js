// Simple token-based auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !token.startsWith('admin-token-')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

module.exports = authMiddleware;
