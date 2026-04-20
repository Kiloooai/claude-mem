const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Summarize a day's sessions via LLM (if API key configured).
 * Falls back to crude summary if no key or on error.
 */

const DEFAULT_STORE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.claude-mem'
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY || process.env.OPENCLOUD_API_KEY;

function loadSessions(storeDir, date) {
  const sessionsDir = path.join(storeDir, 'sessions');
  const dayFile = path.join(sessionsDir, `${date}.jsonl`);
  if (!fs.existsSync(dayFile)) return [];

  const lines = fs.readFileSync(dayFile, 'utf-8').trim().split('\n');
  return lines.map(l => JSON.parse(l));
}

function buildPrompt(sessions) {
  const lines = [];
  lines.push('You are a helpful assistant that creates concise daily summaries of AI coding sessions.');
  lines.push('Given a list of session titles and the last user message from each, produce a 2-3 sentence overview of the day\'s work.');
  lines.push('Focus on themes, completed tasks, and notable decisions. Be brief.\n');

  sessions.forEach(s => {
    const lastUser = (s.messages || []).filter(m => m.role === 'user').pop();
    const lastUserText = lastUser ? lastUser.content : '(no user message)';
    lines.push(`- Title: ${s.title}`);
    lines.push(`  Last user: ${lastUserText}`);
    lines.push('');
  });

  return lines.join('\n');
}

async function callLLM(messages) {
  return new Promise((resolve, reject) => {
    const key = OPENAI_API_KEY;
    if (!key) {
      reject(new Error('No API key configured'));
      return;
    }

    const body = JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 256
    });

    const opts = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body
    };

    https.request('https://api.openai.com/v1/chat/completions', opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.choices[0].message.content.trim());
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

async function summarize(date, storeDir = DEFAULT_STORE_DIR) {
  const sessions = loadSessions(storeDir, date);
  if (!sessions.length) {
    return { method: 'none', summary: 'No sessions recorded for this date.' };
  }

  // Try LLM if key available
  if (OPENAI_API_KEY) {
    try {
      const prompt = buildPrompt(sessions);
      const llmSummary = await callLLM([{ role: 'user', content: prompt }]);
      return { method: 'llm', summary: llmSummary };
    } catch (err) {
      // fall through to crude
    }
  }

  // Crude fallback
  const titles = sessions.map(s => s.title).join('; ');
  const crude = `Sessions: ${sessions.length}. Titles: ${titles}`;
  return { method: 'crude', summary: crude };
}

// CLI entrypoint when run directly
if (require.main === module) {
  const [,, date] = process.argv;
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const storeDir = process.env.CLAUDE_MEM_DIR || DEFAULT_STORE_DIR;

  summarize(targetDate, storeDir).then(result => {
    console.log(`\n📅 ${targetDate} — Session Summary (${result.method})\n`);
    console.log(result.summary);
    console.log();
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { summarize };
