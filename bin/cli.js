#!/usr/bin/env node
/**
 * claude-mem CLI
 */

const fs = require('fs');
const path = require('path');
const { Store } = require('../index');

const HOME = process.env.HOME || process.env.USERPROFILE;
const STORE_DIR = process.env.CLAUDE_MEM_DIR || path.join(HOME, '.claude-mem');

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
  stats [--days=N]  Show daily session counts for last N days (default 7)
  export-week [days]  Export past N days to Markdown (default 7, optional --out=FILE)
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
      const jsonFlag = args.includes('--json');
      const { summarize } = require('../lib/summarizer');
      const result = await summarize(date, STORE_DIR);
      if (jsonFlag) {
        console.log(JSON.stringify({ date, ...result }, null, 2));
      } else {
        console.log(`\n📅 ${date} — Session Summary (${result.method})\n`);
        console.log(result.summary);
        console.log();
      }
      break;
    }

    case 'export-week': {
      const days = parseInt(args[0]) || 7;
      const outArg = args.find(a => a.startsWith('--out='));
      const outFile = outArg ? outArg.slice(6) : `claude-mem-weekly-${new Date().toISOString().slice(0,10)}.md`;
      const { exportWeek } = require('../lib/exporter');
      const result = await exportWeek(days, STORE_DIR, outFile);
      if (result.error) {
        console.error('Error:', result.error);
        process.exit(1);
      }
      console.log(`✓ Exported ${result.sessionCount} sessions → ${result.file}`);
      break;
    }

    case 'stats': {
      const daysArg = args.find(a => a.startsWith('--days='));
      const days = daysArg ? parseInt(daysArg.slice(7)) : 7;
      const counts = store.getDailyCounts(days);
      if (counts.length === 0) {
        console.log('No session data available.');
        break;
      }
      console.log(`\n📊 Session counts (last ${days} days)\n`);
      console.log('─────────────┬───────');
      console.log('Date         │ Count');
      console.log('─────────────┼───────');
      counts.forEach(c => {
        console.log(`${c.date} │ ${String(c.count).padStart(5)}`);
      });
      console.log('─────────────┴───────');
      const total = counts.reduce((sum, c) => sum + c.count, 0);
      console.log(`Total sessions: ${total}\n`);
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
