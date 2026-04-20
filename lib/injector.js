const fs = require('fs');
const path = require('path');
const { Store } = require('./store');

/**
 * Capture a session event (tool call, response, user message) and log it.
 * Designed to be called by a language-server / CLI wrapper around AI coding tools.
 */

const DEFAULT_STORE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.claude-mem'
);

/**
 * Log a complete session transcript.
 * @param {Object} session - { id, date, title, messages: [] }
 */
function logSession(session, storeDir = DEFAULT_STORE_DIR) {
  const store = new Store(storeDir);
  store.logSession(session);
}

/**
 * Given the current task description, decide whether we should inject past context.
 * Simple heuristic: if we can find relevant sessions, return them.
 * @param {string} context
 */
function shouldInject(context, storeDir = DEFAULT_STORE_DIR, limit = 3) {
  const store = new Store(storeDir);
  const relevant = store.findRelevantContext(context, limit);
  return relevant;
}

module.exports = { logSession, shouldInject };
