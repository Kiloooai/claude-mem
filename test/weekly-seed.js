const { Store } = require('../index');
const path = require('path');
const fs = require('fs');

const tmpDir = path.join(__dirname, '..', 'test-store');
if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

const store = new Store(tmpDir);

// Seed sessions across a range of dates
const sessions = [
  { id: 's1', date: '2026-04-15', title: 'Setup auth service', messages: [{role:'user', content:'Set up JWT auth'}] },
  { id: 's2', date: '2026-04-16', title: 'Database schema design', messages: [{role:'user', content:'Design users table'}] },
  { id: 's3', date: '2026-04-17', title: 'API rate limiting', messages: [{role:'user', content:'Implement rate limit middleware'}] },
  { id: 's4', date: '2026-04-18', title: 'Login page UI', messages: [{role:'user', content:'Build login form'}] },
  { id: 's5', date: '2026-04-19', title: 'Session cookies', messages: [{role:'user', content:'Set secure cookies'}] },
  { id: 's6', date: '2026-04-20', title: 'CSRF protection', messages: [{role:'user', content:'Add CSRF tokens'}] },
  { id: 's7', date: '2026-04-21', title: 'Password reset flow', messages: [{role:'user', content:'Implement reset email'}] },
];

sessions.forEach(s => store.logSession(s));
console.log('Seeded', sessions.length, 'sessions ✓');

// Test exportWeek by calling it directly
const { exportWeek } = require('../lib/exporter');
(async () => {
  const res = await exportWeek(7, tmpDir, '/tmp/weekly-digest.md');
  console.log('\nExport result:', res);
  if (res.success) {
    console.log('\n--- Digest preview (first 30 lines) ---\n');
    const content = fs.readFileSync(res.file, 'utf-8');
    console.log(content.split('\n').slice(0, 30).join('\n'));
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
