#!/usr/bin/env node
/**
 * claude-mem CLI
 * Usage:
 *   claude-mem init              # Initialize storage (~/.claude-mem)
 *   claude-mem log <session.json>  # Log a session transcript
 *   claude-mem summary [date]    # Print daily summary (default: today)
 *   claude-mem search <query>    # Search past sessions
 */

const fs = require('fs');
const path = require('path');
const { Store } = require('../index');

const HOME = process.env.HOME || process.env.USERPROFILE;
const STORE_DIR = path.join(HOME, '.claude-mem');

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(`
claude-mem — persistent AI coding session memory

Commands:
  init              Create ~/.claude-mem storage directory
  log <session.json>  Log a session transcript (from OpenClaw/Claude Code)
  summary [date]    Print daily summary (YYYY-MM-DD, default today)
  search <query>    Search past sessions by keyword
  inject <context>  Suggest context to inject (CLI helper)
`);
    process.exit(0);
  }

  ensureStore();
  const store = new Store(STORE_DIR);

  switch (cmd) {
    case 'init':
      console.log(`✓ Storage initialized at ${STORE_DIR}`);
      break;

    case 'log': {
      const sessionPath = args[0];
      if (!sessionPath) {
        console.error('Error: session file path required');
        process.exit(1);
      }
      const raw = fs.readFileSync(sessionPath, 'utf-8');
      const session = JSON.parse(raw);
      store.logSession(session);
      console.log(`✓ Logged session ${session.id || 'unknown'}`);
      break;
    }

    case 'summary': {
      const date = args[0] || new Date().toISOString().slice(0, 10);
      const summary = store.getDailySummary(date);
      console.log(`\n📅 ${date} — Session Summary\n`);
      console.log(summary || 'No sessions recorded for this date.\n');
      break;
    }

    case 'search': {
      const query = args[0];
      if (!query) {
        console.error('Error: search query required');
        process.exit(1);
      }
      const results = store.search(query);
      console.log(`\n🔍 Results for "${query}" (${results.length}):\n`);
      results.forEach(r => {
        console.log(`  [${r.date}] ${r.sessionId} — ${r.snippet}`);
      });
      console.log();
      break;
    }

    case 'inject': {
      const context = args.join(' ');
      if (!context) {
        console.error('Error: context string required');
        process.exit(1);
      }
      const suggestions = store.findRelevantContext(context);
      console.log('\n💡 Suggested context to inject:\n');
      suggestions.forEach(s => {
        console.log(`  • [${s.date}] ${s.title}`);
        console.log(`    ${s.excerpt}\n`);
      });
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
