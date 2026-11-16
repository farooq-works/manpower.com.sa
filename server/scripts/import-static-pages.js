import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { savePage } from '../src/content-store.js';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectDirectory = path.resolve(serverDirectory, '..');
const sourceDirectory = path.join(projectDirectory, 'wwwroot');
const pagesDirectory = path.join(serverDirectory, 'data', 'pages');
const excludedFiles = new Set(['comingsoon.html', 'hostingstart.html', 'index-old.html', 'index=bp.html']);
const force = process.argv.includes('--force');

function plainText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function localImageUrl(source) {
  if (!source || !source.includes('/assist/images/')) return '';
  let decoded = source;
  try {
    decoded = decodeURIComponent(source);
  } catch {
    // Keep the original URL when it contains malformed percent-encoding.
  }
  const filename = decoded.split(/[?#]/, 1)[0].slice(decoded.lastIndexOf('/') + 1);
  return filename ? `/media/${encodeURIComponent(filename)}` : '';
}

function extractSections($, root) {
  const nodes = root.find('.et_pb_section, .et_pb_row').toArray().filter((node) => (
    $(node).hasClass('et_pb_section') || $(node).closest('.et_pb_section').length === 0
  ));
  const sections = [];

  for (const node of nodes) {
    const section = $(node);
    const heading = plainText(section.find('h1, h2, h3').first().text());
    const bodyParts = section.find('h1, h2, h3, p, li').toArray()
      .filter((item) => {
        if (item.name === 'li' && $(item).find('p').length > 0) return false;
        return !['h1', 'h2', 'h3'].includes(item.name) || item !== section.find('h1, h2, h3').first()[0];
      })
      .map((item) => plainText($(item).text()))
      .filter(Boolean);
    const image = localImageUrl(section.find('img').first().attr('src') ?? '');

    if (heading || bodyParts.length || image) {
      sections.push({
        heading,
        body: bodyParts.join('\n\n').slice(0, 12000),
        image,
      });
    }
  }

  if (!sections.length) {
    const heading = plainText(root.find('h1, h2, h3').first().text());
    const body = plainText(root.find('p').map((_, item) => $(item).text()).get().join(' '));
    if (heading || body) sections.push({ heading, body: body.slice(0, 12000), image: '' });
  }
  return sections;
}

await readdir(sourceDirectory);
await mkdir(pagesDirectory, { recursive: true });
const files = (await readdir(sourceDirectory))
  .filter((name) => name.endsWith('.html') && !excludedFiles.has(name))
  .sort();
let imported = 0;
let skipped = 0;

for (const filename of files) {
  const source = await readFile(path.join(sourceDirectory, filename), 'utf8');
  const $ = cheerio.load(source);
  const root = $('body').find('#page-container').first();
  const contentRoot = root.length ? root : $('body');
  contentRoot.find('header, footer, nav, form, script, style, noscript, iframe, .et-l--header, .et-l--footer').remove();

  const sections = extractSections($, contentRoot);
  const [heroSection, ...remainingSections] = sections;
  const slug = filename === 'index.html'
    ? 'home'
    : filename.replace(/\.html$/i, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const title = plainText($('title').first().text()).replace(/\s*[|–-]\s*Manpower.*$/i, '') || slug;
  const metaDescription = plainText($('meta[name="description"]').attr('content') ?? '');
  const heroHeading = heroSection?.heading || title;
  const heroBody = (heroSection?.body ?? '').slice(0, 4000);
  const description = metaDescription === 'Manpower'
    ? heroHeading.slice(0, 320)
    : metaDescription.slice(0, 320);

  const page = {
    slug,
    title,
    description,
    status: 'published',
    hero: {
      heading: heroHeading,
      body: heroBody,
      image: heroSection?.image ?? '',
    },
    sections: remainingSections,
    updatedAt: new Date().toISOString(),
  };
  const destination = path.join(pagesDirectory, `${slug}.json`);

  if (!force) {
    try {
      await readFile(destination, 'utf8');
      skipped += 1;
      continue;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  await savePage(slug, page);
  imported += 1;
}

console.log(`Imported ${imported} pages; skipped ${skipped} existing pages.`);
