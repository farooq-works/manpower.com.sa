import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDirectory = path.join(serverDirectory, 'data', 'pages');
const revisionsDirectory = path.join(serverDirectory, 'data', 'revisions');
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let writes = Promise.resolve();

export function isValidSlug(slug) {
  return typeof slug === 'string' && slugPattern.test(slug);
}

function assertText(value, field, maxLength, allowEmpty = false) {
  if (
    typeof value !== 'string' ||
    value.length > maxLength ||
    (!allowEmpty && value.trim().length === 0)
  ) {
    throw new Error(`Invalid ${field}`);
  }
  return value.trim();
}

export function validatePage(slug, input) {
  if (!isValidSlug(slug) || !input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid page');
  }

  const hero = input.hero;
  if (!hero || typeof hero !== 'object' || Array.isArray(hero)) {
    throw new Error('Invalid page hero');
  }

  if (!Array.isArray(input.sections) || input.sections.length > 80) {
    throw new Error('Invalid page sections');
  }

  const sections = input.sections.map((section) => {
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      throw new Error('Invalid page section');
    }

    const image = assertText(section.image ?? '', 'section image', 500, true);
    if (image && !image.startsWith('/media/') && !image.startsWith('/uploads/')) {
      throw new Error('Invalid section image');
    }

    return {
      heading: assertText(section.heading, 'section heading', 160, true),
      body: assertText(section.body, 'section body', 12000, true),
      image,
    };
  });

  if (!['draft', 'published'].includes(input.status)) {
    throw new Error('Invalid page status');
  }

  const heroImage = assertText(hero.image ?? '', 'hero image', 500, true);
  if (heroImage && !heroImage.startsWith('/media/') && !heroImage.startsWith('/uploads/')) {
    throw new Error('Invalid hero image');
  }

  const pdf = assertText(input.pdf ?? '', 'page PDF', 500, true);
  if (pdf && !pdf.startsWith('/reports/')) {
    throw new Error('Invalid page PDF');
  }

  return {
    slug,
    title: assertText(input.title, 'title', 160),
    description: assertText(input.description, 'description', 320, true),
    status: input.status,
    hero: {
      heading: assertText(hero.heading, 'hero heading', 200),
      body: assertText(hero.body ?? '', 'hero body', 4000, true),
      image: heroImage,
    },
    pdf,
    sections,
    updatedAt: new Date().toISOString(),
  };
}

export function deletePage(slug) {
  const operation = writes.then(async () => {
    if (!isValidSlug(slug)) throw new Error('Invalid page slug');
    const destination = path.join(pagesDirectory, `${slug}.json`);
    await backupExistingPage(slug);
    try {
      await unlink(destination);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const missing = new Error('Page not found');
        missing.status = 404;
        throw missing;
      }
      throw error;
    }
    return true;
  });
  writes = operation.catch(() => {});
  return operation;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function listPages({ includeDrafts = false } = {}) {
  let filenames;
  try {
    filenames = await readdir(pagesDirectory);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const pages = await Promise.all(
    filenames.filter((name) => name.endsWith('.json')).map((name) => readJson(path.join(pagesDirectory, name))),
  );
  return pages
    .filter((page) => includeDrafts || page.status === 'published')
    .sort((left, right) => left.title.localeCompare(right.title));
}

export async function getPage(slug, { includeDraft = false } = {}) {
  if (!isValidSlug(slug)) return null;

  try {
    const page = await readJson(path.join(pagesDirectory, `${slug}.json`));
    return includeDraft || page.status === 'published' ? page : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function backupExistingPage(slug) {
  if (!isValidSlug(slug)) throw new Error('Invalid page slug');
  const source = path.join(pagesDirectory, `${slug}.json`);
  let contents;
  try {
    contents = await readFile(source, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }

  const pageRevisionsDirectory = path.join(revisionsDirectory, slug);
  await mkdir(pageRevisionsDirectory, { recursive: true });
  const revision = path.join(
    pageRevisionsDirectory,
    `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.json`,
  );
  await writeFile(revision, contents, { flag: 'wx' });
  return revision;
}

export function createPage(slug, page) {
  const operation = writes.then(async () => {
    const validated = validatePage(slug, page);
    await mkdir(pagesDirectory, { recursive: true });
    const destination = path.join(pagesDirectory, `${slug}.json`);
    try {
      await readFile(destination, 'utf8');
      const conflict = new Error('Page already exists');
      conflict.status = 409;
      throw conflict;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    await writeFile(destination, `${JSON.stringify(validated, null, 2)}\n`, { flag: 'wx' });
    return validated;
  });
  writes = operation.catch(() => {});
  return operation;
}

export function savePage(slug, page) {
  const operation = writes.then(async () => {
    const validated = validatePage(slug, page);
    await mkdir(pagesDirectory, { recursive: true });

    const destination = path.join(pagesDirectory, `${slug}.json`);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await backupExistingPage(slug);
    try {
      await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, { flag: 'wx' });
      await rename(temporary, destination);
    } catch (error) {
      await unlink(temporary).catch((cleanupError) => {
        if (cleanupError.code !== 'ENOENT') throw cleanupError;
      });
      throw error;
    }
    return validated;
  });
  writes = operation.catch(() => {});
  return operation;
}
