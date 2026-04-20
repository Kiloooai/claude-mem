const { Store } = require('../index');
const path = require('path');
const fs = require('fs');

const tmpDir = path.join(__dirname, '..', 'test-store');
if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

const store = new Store(tmpDir);

// Create a mock session
const session1 = {
  id: 'sess-001',
  date: '2026-04-20',
  title: 'Fix login validation',
  messages: [
    { role: 'user', content: 'Fix the login form validation bug' },
    { role: 'assistant', content: ' Reviewed auth.js, added required checks' }
  ]
};

const session2 = {
  id: 'sess-002',
  date: '2026-04-20',
  title: 'API rate limiting',
  messages: [
    { role: 'user', content: 'Add rate limiting to the public API endpoints' },
    { role: 'assistant', content: ' Implemented token bucket in middleware' }
  ]
};

store.logSession(session1);
store.logSession(session2);

console.log('Sessions logged ✓');

const summary = store.getDailySummary('2026-04-20');
console.log('\nDaily summary:\n', summary);

const searchHits = store.search('validation');
console.log('\nSearch "validation":', searchHits);

const relevant = store.findRelevantContext('Add middleware for auth');
console.log('\nRelevant context for "Add middleware for auth":', relevant);

process.exit(0);
