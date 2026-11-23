import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Fresh SQLite file with all migrations applied, once per test run. */
export default function setup() {
  for (const f of ['test.db', 'test.db-journal']) fs.rmSync(path.join(root, 'data', f), { force: true });
  execSync('npx prisma migrate deploy', { cwd: root, env: { ...process.env, DATABASE_URL: 'file:../data/test.db' }, stdio: 'pipe' });
}
