const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Export sessions from the past N days to a Markdown digest.
 * Includes an optional LLM summary and per-session excerpts.
 */

const DEFAULT_STORE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.claude-mem'
);

function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const fmt = d => d.toISOString().slice(0, 10);

  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(fmt(new Date(d)));
  }
  return dates;
}

function loadSessionsForDates(storeDir, dates) {
  const sessionsDir = path.join(storeDir, 'sessions');
  const all = [];
  for (const date of dates) {
    const dayFile = path.join(sessionsDir, `${date}.jsonl`);
    if (!fs.existsSync(dayFile)) continue;
    const lines = fs.readFileSync(dayFile, 'utf-8').trim().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        all.push(JSON.parse(line));
      } catch (e) {
        // skip malformed
      }
    }
  }
  return all;
}

async function exportWeek(days = 7, storeDir = DEFAULT_STORE_DIR, outPath = null) {
  const dates = getDateRange(days);
  const sessions = loadSessionsForDates(storeDir, dates);

  if (!sessions.length) {
    return { error: 'No sessions found in the past ' + days + ' days.' };
  }

  // Build markdown
  const lines = [];
  lines.push(`# claude-mem weekly digest`);
  lines.push(`**Period:** ${dates[0]} → ${dates[dates.length - 1]}  `);
  lines.push(`**Sessions:** ${sessions.length}`);
  lines.push('');

  // LLM summary if available
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY;
  if (OPENAI_API_KEY) {
    try {
      const prompt = buildWeeklyPrompt(sessions);
      const summary = await callLLM(prompt, OPENAI_API_KEY);
      lines.push('## ✨ Weekly Summary');
      lines.push('');
      lines.push(summary);
      lines.push('');
    } catch (err) {
      // fall through
    }
  }

  // Per-session sections
  lines.push('## Sessions');
  lines.push('');
  sessions.forEach(s => {
    lines.push(`### [${s.date}] ${s.title}`);
    lines.push('');
    const lastUser = (s.messages || []).filter(m => m.role === 'user').pop();
    if (lastUser) {
      lines.push('_Last user prompt:_');
      lines.push('');
      lines.push('> ' + lastUser.content.replace(/\n/g, '\n> '));
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  });

  const md = lines.join('\n');

  if (outPath) {
    fs.writeFileSync(path.resolve(outPath), md, 'utf-8');
    return { success: true, file: outPath, sessionCount: sessions.length };
  } else {
    return { success: true, content: md };
  }
}

function buildWeeklyPrompt(sessions) {
  const parts = [];
  parts.push('You are a helpful assistant that creates a concise weekly summary of AI coding sessions.');
  parts.push('Given the following sessions from the past week, produce a 3-4 sentence overview highlighting key themes, goals achieved, and any notable decisions or patterns.\n');

  sessions.forEach(s => {
    const lastUser = (s.messages || []).filter(m => m.role === 'user').pop();
    const promptText = lastUser ? lastUser.content : '(no user message)';
    parts.push(`- ${s.title}: ${promptText.slice(0, 200)}`);
  });

  return parts.join('\n');
}

async function callLLM(prompt, key, model = 'gpt-4o-mini') {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512
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

module.exports = { exportWeek };
