import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usersFile = path.join(serverDirectory, 'data', 'users.json');
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Set a valid ADMIN_EMAIL in the project .env file.');
}
if (!password || password.length < 12 || password.includes('replace-with')) {
  throw new Error('Set an ADMIN_PASSWORD with at least 12 characters in the project .env file.');
}

try {
  await readFile(usersFile, 'utf8');
  throw new Error('An admin account already exists. Remove server/data/users.json only if you intend to reset it.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

await mkdir(path.dirname(usersFile), { recursive: true });
const user = { email, role: 'super-admin', passwordHash: await bcrypt.hash(password, 12) };
await writeFile(usersFile, `${JSON.stringify([user], null, 2)}\n`, { flag: 'wx', mode: 0o600 });
console.log(`Created admin account for ${email}. Remove ADMIN_PASSWORD from .env when setup is complete.`);
