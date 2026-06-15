const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { isBanned: true, banReason: true, banUntil: true }
    });

    if (user) {
      if (user.isBanned) {
        if (user.banUntil && new Date(user.banUntil) < new Date()) {
          await prisma.user.update({
            where: { id: decoded.id },
            data: { isBanned: false, banReason: null, banUntil: null }
          });
        } else {
          const banInfo = user.banReason
            ? `${user.banReason}${user.banUntil ? ` (до ${new Date(user.banUntil).toLocaleString('ru-RU')})` : ' (навсегда)'}`
            : 'Аккаунт заблокирован';
          return res.status(403).json({ error: banInfo });
        }
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };
