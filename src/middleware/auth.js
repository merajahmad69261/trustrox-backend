const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authorization token required.',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'trustrox_secret', (err, decodedUser) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }
    req.user = decodedUser;
    next();
  });
}

function verifyRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}].`,
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  verifyRole,
};
