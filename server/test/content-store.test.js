import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidSlug, validatePage } from '../src/content-store.js';

const validPage = {
  title: 'About us',
  description: 'Learn about our company.',
  status: 'published',
  hero: { heading: 'About us', body: 'A short introduction.', image: '/media/about.png' },
  sections: [{ heading: 'Our story', body: 'Our story text.', image: '' }],
};

test('accepts a valid slug and a structured page', () => {
  assert.equal(isValidSlug('about-us'), true);
  assert.equal(validatePage('about-us', validPage).slug, 'about-us');
});

test('rejects path traversal and unsupported image URLs', () => {
  assert.equal(isValidSlug('../users'), false);
  assert.throws(() => validatePage('about-us', {
    ...validPage,
    hero: { ...validPage.hero, image: 'https://example.test/image.png' },
  }), /Invalid hero image/);
});

test('rejects malformed or oversized page sections', () => {
  assert.throws(() => validatePage('about-us', { ...validPage, sections: 'not-an-array' }), /Invalid page sections/);
  assert.throws(() => validatePage('about-us', {
    ...validPage,
    sections: [{ heading: 'x'.repeat(161), body: '', image: '' }],
  }), /Invalid section heading/);
});
