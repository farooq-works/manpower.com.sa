import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { fileTypeFromBuffer } from 'file-type';
import helmet from 'helmet';
import multer from 'multer';
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken,
  verifyCredentials,
} from './auth.js';
import { createPage, getPage, isValidSlug, listPages, savePage } from './content-store.js';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectDirectory = path.resolve(serverDirectory, '..');
const uploadsDirectory = path.join(serverDirectory, 'uploads');
const publicImagesDirectory = path.join(projectDirectory, 'wwwroot', 'assist', 'images');
const reportsDirectory = path.join(projectDirectory, 'wwwroot', 'reports');
const secret = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

if (!secret || secret.length < 32 || secret.includes('replace-with')) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/media', express.static(publicImagesDirectory, { fallthrough: false, maxAge: '1d' }));
app.use('/reports', express.static(reportsDirectory, { fallthrough: false, maxAge: '1d' }));
app.use('/uploads', express.static(uploadsDirectory, { fallthrough: false, maxAge: '1h' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const authenticate = requireAuth(secret);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 256) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await verifyCredentials(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    setAuthCookie(res, signToken(user, secret), isProduction);
    return res.json({ email: user.email });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res, isProduction);
  res.status(204).end();
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ email: req.admin.email });
});

app.get('/api/pages', async (_req, res, next) => {
  try {
    res.json(await listPages());
  } catch (error) {
    next(error);
  }
});

app.get('/api/pages/:slug', async (req, res, next) => {
  try {
    const page = await getPage(req.params.slug);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    return res.json(page);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/pages', authenticate, async (_req, res, next) => {
  try {
    res.json(await listPages({ includeDrafts: true }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/pages', authenticate, async (req, res, next) => {
  try {
    if (!isValidSlug(req.body?.slug)) {
      return res.status(400).json({ error: 'Invalid page slug' });
    }
    return res.status(201).json(await createPage(req.body.slug, req.body));
  } catch (error) {
    if (error.message.startsWith('Invalid ')) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

app.put('/api/admin/pages/:slug', authenticate, async (req, res, next) => {
  try {
    if (!isValidSlug(req.params.slug)) {
      return res.status(400).json({ error: 'Invalid page slug' });
    }
    res.json(await savePage(req.params.slug, req.body));
  } catch (error) {
    if (error.message.startsWith('Invalid ')) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
const allowedImages = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/avif', 'avif'],
]);

app.get('/api/admin/media', authenticate, async (_req, res, next) => {
  try {
    let names = [];
    try {
      names = await readdir(uploadsDirectory);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    res.json(names.map((name) => ({ name, url: `/uploads/${encodeURIComponent(name)}` })));
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/media', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Select an image to upload' });

    const detected = await fileTypeFromBuffer(req.file.buffer);
    const extension = detected && allowedImages.get(detected.mime);
    if (!extension) return res.status(415).json({ error: 'Only JPEG, PNG, WebP, GIF, and AVIF images are allowed' });

    await mkdir(uploadsDirectory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(uploadsDirectory, filename), req.file.buffer, { flag: 'wx' });
    return res.status(201).json({ name: filename, url: `/uploads/${filename}` });
  } catch (error) {
    return next(error);
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));

if (isProduction) {
  const frontendDirectory = path.join(projectDirectory, 'client', 'dist', 'client', 'browser');
  app.use(express.static(frontendDirectory, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    return res.sendFile(path.join(frontendDirectory, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
}

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: error.message });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status === 500) console.error(error);
  return res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`CMS API listening on http://localhost:${port}`);
});
