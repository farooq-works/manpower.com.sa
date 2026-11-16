# Manpower CMS

Angular/Tailwind frontend and Express REST API for migrating the static site in `wwwroot`.
The original HTML and assets remain unchanged so the migration can be checked page by page.

## Requirements

- Node.js 20.19 or newer
- npm

## Local setup

1. Install dependencies from the project root:

   ```powershell
   npm install
   ```

2. Copy `server/.env.example` to `server/.env`. Set a random `JWT_SECRET` of at least 32 characters and choose a unique `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters).
3. Create the initial admin account:

   ```powershell
   npm run create-admin
   ```

   The password is stored as a bcrypt hash in the ignored `server/data/users.json`. Remove `ADMIN_PASSWORD` from `server/.env` after account creation.
4. Import content from the existing static pages:

   ```powershell
   npm run migrate:static
   ```

   This imports the current pages into `server/data/pages` as structured JSON sections; it skips the legacy/staging pages `comingsoon.html`, `hostingstart.html`, `index-old.html`, and `index=bp.html`. Existing JSON pages are not overwritten. Use `npm run migrate:static -- --force` only when intentionally replacing an import; existing files are backed up under `server/data/revisions`.
5. Start the API and Angular development server:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:4200`; the Angular proxy forwards API, media, upload, and report requests to Express on port 3000. Admin sign-in is at `/admin/login`.

The root `.vscode/tasks.json` provides matching full-stack start, build, test, and import tasks in VS Code.

## Content and API

- JSON page records are stored in `server/data/pages/*.json`.
- Public routes: `GET /api/pages`, `GET /api/pages/:slug`.
- Admin routes use an HTTP-only JWT cookie: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `POST /api/admin/pages`, `PUT /api/admin/pages/:slug`, and `/api/admin/media`.
- The public navigation follows the original Home, Recruitment, Solutions, About, Insights, and Contact groupings and links to the active migrated pages.
- `PUT /api/admin/pages/:slug` validates content and atomically replaces its JSON file.
- Each edit backs up the previous page JSON under `server/data/revisions/<slug>`.
- Existing images and reports are served from `wwwroot/assist/images` and `wwwroot/reports`; new image uploads are stored in the ignored `server/uploads` directory. Uploads are limited to 5 MB and checked by file signature.

The importer converts page headings, paragraph/list text, and selected images into structured content. It does not preserve the original Divi layout, CSS, links, forms, or JavaScript interactions; those need to be recreated and checked in Angular as each page is visually migrated.

For production, build Angular with `npm run build`, set `NODE_ENV=production`, and run the server. Express serves the Angular build from `client/dist/client/browser` and the API from the same origin.

JSON files are intended for a small editorial team with modest write concurrency. Back up `server/data/pages`, `server/data/users.json`, and `server/uploads` together; use a database or add cross-process file locking if multiple API instances or frequent concurrent edits are required.
