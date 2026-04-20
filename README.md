# claude-mem

Persistent AI coding session memory — logs tool calls and auto-injects relevant context into future sessions.

```
claude-mem init
claude-mem log session.json
claude-mem summary [date]
claude-mem search <query>
claude-mem inject <context>
```

## What

`claude-mem` captures your AI coding assistant sessions (Claude Code, OpenClaw, etc.) and makes them searchable later. It can also suggest relevant past context when you start a new task, helping the AI remember similar work without you having to repeat yourself.

## Why

AI coding assistants are stateless between sessions. Over time you solve the same pattern twice, forget what you did last week, or waste time re-explaining constraints. This tool gives you cheap, local, persistent memory.

## How

- **Storage**: `~/.claude-mem/`
  - `sessions/YYYY-MM-DD.jsonl` — one session object per line, sharded by date
  - `index.json` — flat lookup (id → file + offset + metadata)
- **Logging**: Call `claude-mem log <session.json>` at the end of a session (or have your tooling pipe output automatically)
- **Search**: `claude-mem search <keyword>` — match across titles and user messages
- **Summaries**: `claude-mem summary 2026-04-20` — prints a digest of that day's sessions
- **Context injection helper**: `claude-mem inject "<current task>"` — prints suggested past sessions to copy/paste into a new AI chat

## MVP features (done)

- Log complete sessions (id, date, title, messages array)
- Daily summary generator (shows titles + last user prompt per session)
- Full-text keyword search (titles + user messages)
- Relevance lookup for context injection suggestions
- Simple file-based storage, no database

## Usage

```bash
# First-time setup
claude-mem init

# After a coding session, log it
claude-mem log /path/to/session.json

# See what you did today (LLM-powered summary if OPENAI_API_KEY is set)
claude-mem summary

# Machine-readable output
claude-mem summary --json

# Find something from last week
claude-mem search "rate limiting"

# Start a new task — get relevant past sessions
claude-mem inject "Add auth middleware to API routes"
```

## Session JSON format

Minimal expected shape:

```json
{
  "id": "sess-12345",
  "date": "2026-04-20",
  "title": "Fix login validation",
  "messages": [
    { "role": "user", "content": "Fix the login form" },
    { "role": "assistant", "content": "Reviewed auth.js..." }
  ]
}
```

You can extend this with `subject`, `toolCalls`, etc. — the logger stores the object as-is and indexes what it needs.

## Roadmap ideas (later)

- Auto-summarization via LLM for longer sessions ✓ (basic done)
- Embedding-based semantic search (cosine similarity on message vectors)
- OpenClaw integration: built-in hook that auto-logs every session
- `claude-mem serve` — tiny local web UI to browse sessions
- Export to markdown / Notion / Obsidian

## Development

```bash
npm install
npm test
```

MIT
