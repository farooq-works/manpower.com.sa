import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usersFile = path.join(serverDirectory, 'data', 'users.json');
const cookieName = 'manpower_admin';

export async function verifyCredentials(email, password) {
  let users;
  try {
    users = JSON.parse(await readFile(usersFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      const setupError = new Error('Admin account is not configured. Run npm run create-admin.');
      setupError.status = 503;
      throw setupError;
    }
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((entry) => entry.email.toLowerCase() === normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return { email: user.email };
}

export function signToken(user, secret) {
  return jwt.sign({ sub: user.email }, secret, { expiresIn: '8h' });
}

export function requireAuth(secret) {
  return (req, res, next) => {
    const token = req.cookies[cookieName];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    try {
      const payload = jwt.verify(token, secret);
      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
      req.admin = { email: payload.sub };
      return next();
    } catch {
      return res.status(401).json({ error: 'Authentication required' });
    }
  };
}

export function setAuthCookie(res, token, isProduction) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res, isProduction) {
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  });
}
