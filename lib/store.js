const fs = require('fs');
const path = require('path');

/**
 * Store — persistent session log with simple full-text search index
 * Storage layout:
 *   sessions/YYYY-MM-DD.jsonl  — one JSON object per line, per day
 *   index.json                 — cumulative index (id -> file offset + date + title)
 */

class Store {
  constructor(storeDir) {
    this.storeDir = storeDir;
    this.sessionsDir = path.join(storeDir, 'sessions');
    this.indexPath = path.join(storeDir, 'index.json');
    fs.mkdirSync(this.sessionsDir, { recursive: true });
  }

  _loadIndex() {
    if (!fs.existsSync(this.indexPath)) return {};
    return JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
  }

  _saveIndex(index) {
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Log a session object (from OpenClaw/Claude Code)
   * Expected shape (minimal):
   *   { id, date, title, messages: [{role, content}] }
   */
  logSession(session) {
    const date = session.date || new Date().toISOString().slice(0, 10);
    const id = session.id || Date.now().toString();

    const sessionRecord = {
      id,
      date,
      title: session.title || session.subject || `Session ${id}`,
      messages: session.messages || [],
      createdAt: Date.now()
    };

    // Append to daily file
    const dayFile = path.join(this.sessionsDir, `${date}.jsonl`);
    const recordLine = JSON.stringify(sessionRecord) + '\n';

    let offset = 0;
    if (fs.existsSync(dayFile)) {
      const stat = fs.statSync(dayFile);
      offset = stat.size;
      fs.appendFileSync(dayFile, recordLine);
    } else {
      offset = 0;
      fs.writeFileSync(dayFile, recordLine);
    }

    // Update index
    const index = this._loadIndex();
    index[id] = {
      id,
      date,
      file: `${date}.jsonl`,
      offset,
      title: sessionRecord.title
    };
    this._saveIndex(index);

    return id;
  }

  /**
   * Get all sessions for a date
   */
  getSessionsForDate(date) {
    const dayFile = path.join(this.sessionsDir, `${date}.jsonl`);
    if (!fs.existsSync(dayFile)) return [];

    const lines = fs.readFileSync(dayFile, 'utf-8').trim().split('\n');
    return lines.map(l => JSON.parse(l));
  }

  /**
   * Build a crude daily summary by joining titles + last user prompts
   */
  getDailySummary(date) {
    const sessions = this.getSessionsForDate(date);
    if (!sessions.length) return '';

    const lines = [];
    lines.push(`Sessions: ${sessions.length}`);
    lines.push('');
    sessions.forEach(s => {
      const lastUser = (s.messages || []).filter(m => m.role === 'user').pop();
      lines.push(`• ${s.title}`);
      if (lastUser) {
        const snippet = lastUser.content.slice(0, 120).replace(/\n/g, ' ');
        lines.push(`  ↳ ${snippet}${lastUser.content.length > 120 ? '...' : ''}`);
      }
      lines.push('');
    });
    return lines.join('\n');
  }

  /**
   * Very simple keyword search across titles and recent user messages.
   * Returns lightweight hits.
   */
  search(query) {
    const q = query.toLowerCase();
    const index = this._loadIndex();
    const hits = [];

    for (const [id, meta] of Object.entries(index)) {
      const sessions = this.getSessionsForDate(meta.date);
      const session = sessions.find(s => s.id === id);
      if (!session) continue;

      const text = `${session.title} ${(session.messages || [])
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ')}`.toLowerCase();

      if (text.includes(q)) {
        // Extract a short snippet around the first match
        const idx = text.indexOf(q);
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + q.length + 40);
        const snippet = '...' + text.slice(start, end) + '...';
        hits.push({ date: meta.date, sessionId: id, snippet });
      }
    }
    return hits;
  }

  /**
   * Given a current context string, find past sessions that seem relevant.
   * Scoring: title match + recent message overlap.
   */
  findRelevantContext(context, limit = 3) {
    const keywords = context.toLowerCase().split(/\s+/).filter(Boolean);
    const index = this._loadIndex();
    const scores = [];

    for (const [id, meta] of Object.entries(index)) {
      const sessions = this.getSessionsForDate(meta.date);
      const session = sessions.find(s => s.id === id);
      if (!session) continue;

      const content = `${session.title} ${(session.messages || [])
        .map(m => m.content)
        .join(' ')}`.toLowerCase();

      let score = 0;
      keywords.forEach(k => {
        if (content.includes(k)) score += 1;
      });

      if (score > 0) {
        scores.push({ score, session, date: meta.date });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => {
        const userMessages = (r.session.messages || []).filter(m => m.role === 'user');
        const lastUser = userMessages[userMessages.length - 1];
        const excerpt = lastUser ? lastUser.content.slice(0, 200).replace(/\n/g, ' ') : r.session.title;
        return {
          date: r.date,
          title: r.session.title,
          excerpt
        };
      });
  }
}

module.exports = { Store };
