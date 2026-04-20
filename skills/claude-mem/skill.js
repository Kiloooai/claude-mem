const path = require('path');
const fs = require('fs');
const { Store } = require('claude-mem');

/**
 * claude-mem OpenClaw Skill
 *
 * Registers hooks to automatically log every coding session.
 * Hooks: session-end (persists full transcript)
 */

const STORE_DIR = process.env.CLAUDE_MEM_DIR || path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.claude-mem'
);

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

/**
 * Convert an OpenClaw/Claude Code session record to our format.
 * @param {Object} rec — session record from gateway
 */
function normalizeSession(rec) {
  // rec shape (approximated from OpenClaw Gateway /session-end payload):
  // { id, startTime, messages: [{role, content, toolCalls?}], metadata? }
  const start = rec.startTime ? new Date(rec.startTime) : new Date();
  const date = start.toISOString().slice(0, 10);
  const title = rec.metadata?.title || rec.metadata?.subject || `Session ${rec.id}`;

  return {
    id: rec.id,
    date,
    title,
    messages: (rec.messages || []).map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    })),
    createdAt: start.getTime()
  };
}

/**
 * Hook: called when a session ends.
 * @param {Object} session — raw session record
 * @param {Object} ctx — skill context (has config, etc.)
 */
async function onSessionEnd(session, ctx) {
  ensureStore();
  const store = new Store(STORE_DIR);
  const normalized = normalizeSession(session);
  store.logSession(normalized);
  ctx.logger?.info?.('[claude-mem] Logged session', normalized.id);
}

/**
 * Hook: called when a new session starts.
 * (Optional — we don't need to do anything here yet)
 */
async function onSessionNew(session, ctx) {
  // reserved for future: pre-load relevant context into session state
}

/**
 * Skill constructor
 */
function ClaudeMemSkill() {
  this.name = 'claude-mem';
  this.description = 'Persistent AI coding session memory — auto-logs sessions and enables context retrieval';
  this.version = '0.1.1';
  this.hooks = {
    'session-end': onSessionEnd,
    'session-new': onSessionNew
  };
}

module.exports = ClaudeMemSkill;
