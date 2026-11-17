import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usersFile = path.join(serverDirectory, 'data', 'users.json');
const cookieName = 'manpower_admin';

async function readUsers() {
  return JSON.parse(await readFile(usersFile, 'utf8'));
}

async function writeUsers(users) {
  await mkdir(path.dirname(usersFile), { recursive: true });
  const temporary = `${usersFile}.tmp`;
  await writeFile(temporary, `${JSON.stringify(users, null, 2)}\n`, { flag: 'w' });
  await rename(temporary, usersFile);
}

function normalizeUser(user) {
  return {
    email: user.email,
    role: user.role === 'editor' ? 'editor' : 'super-admin',
  };
}

export async function verifyCredentials(email, password) {
  let users;
  try {
    users = await readUsers();
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
  return normalizeUser(user);
}

export function signToken(user, secret) {
  return jwt.sign({ sub: user.email, role: user.role }, secret, { expiresIn: '8h' });
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
      req.admin = { email: payload.sub, role: payload.role === 'editor' ? 'editor' : 'super-admin' };
      return next();
    } catch {
      return res.status(401).json({ error: 'Authentication required' });
    }
  };
}

export function isSuperAdmin(user) {
  return user?.role === 'super-admin';
}

export async function listUsers() {
  return (await readUsers()).map(normalizeUser);
}

export async function createUser(email, password, role = 'editor') {
  const users = await readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    const error = new Error('User already exists');
    error.status = 409;
    throw error;
  }
  users.push({ email: normalizedEmail, role: role === 'super-admin' ? 'super-admin' : 'editor', passwordHash: await bcrypt.hash(password, 12) });
  await writeUsers(users);
  return normalizeUser(users.at(-1));
}

export async function updatePassword(email, password) {
  const users = await readUsers();
  const user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  user.passwordHash = await bcrypt.hash(password, 12);
  await writeUsers(users);
  return normalizeUser(user);
}

export async function removeUser(email) {
  const users = await readUsers();
  const normalizedEmail = email.toLowerCase();
  const remaining = users.filter((user) => user.email.toLowerCase() !== normalizedEmail);
  if (remaining.length === users.length) return false;
  if (!remaining.some((user) => normalizeUser(user).role === 'super-admin')) {
    const error = new Error('At least one super admin is required');
    error.status = 400;
    throw error;
  }
  await writeUsers(remaining);
  return true;
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
