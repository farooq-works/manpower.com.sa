import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const links = [
  ['client/public/legacy', 'wwwroot'],
  ['client/public/assist', 'wwwroot/assist'],
];

for (const [link, target] of links) {
  const linkPath = path.join(projectRoot, link);
  if (fs.existsSync(linkPath)) continue;

  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  const targetPath = path.join(projectRoot, target);
  fs.symlinkSync(targetPath, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}
