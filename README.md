# claude-mem

Persistent AI coding session memory — logs tool calls and auto-injects relevant context into future sessions.

```
claude-mem init
claude-mem log session.json
claude-mem summary [date]
claude-mem stats [--days=N]
claude-mem export-week [days] [--out=FILE]
claude-mem search <query>
claude-mem inject <context>
```

## What

`claude-mem` captures your AI coding assistant sessions (Claude Code, OpenClaw, etc.) and makes them searchable later. It can also suggest relevant past context when you start a new task, helping the AI remember similar work without you having to repeat yourself.

## Why

AI coding assistants are stateless between sessions. Over time you solve the same pattern twice, forget what you did last week, or waste time re-explaining constraints. This tool gives you cheap, local, persistent memory.

## How it works

- **Storage**: `~/.claude-mem/`
  - `sessions/YYYY-MM-DD.jsonl` — one session object per line, sharded by date
  - `index.json` — flat lookup (id → file + offset + metadata)
- **Logging**: Two modes:
  - CLI: `claude-mem log <session.json>` at end of session
  - OpenClaw skill: hooks `session-end` and auto-logs every session (no manual step)
- **Search**: `claude-mem search <keyword>` — match across titles and user messages
- **Summaries**: `claude-mem summary [date]` — LLM-powered if `OPENAI_API_KEY` set; falls back to title list
- **Stats**: `claude-mem stats [--days=N]` — daily session count table (default 7 days)
- **Weekly export**: `claude-mem export-week [days] [--out=FILE]` — markdown digest with optional LLM summary
- **Context injection**: `claude-mem inject "<current task>"` — suggests relevant past sessions


## MVP features (done)

- Log complete sessions (id, date, title, messages array)
- Daily summary generator (shows titles + last user prompt per session)
- Full-text keyword search (titles + user messages)
- Relevance lookup for context injection suggestions
- Simple file-based storage, no database
- Daily session count statistics (`stats` command)

## Install & setup

```bash
# Install globally
npm install -g claude-mem

# Initialize storage
claude-mem init
```

### As an OpenClaw Skill (auto-logging)

Install the skill to automatically log every session — no manual `claude-mem log` needed:

```bash
# Option 1: via ClawHub (when published to clawhub.ai)
clawhub install claude-mem

# Option 2: manual skill link (development)
openclaw skill link /path/to/claude-mem/skills/claude-mem
openclaw skill enable claude-mem
openclaw restart
```

Once enabled, every session is automatically logged to `~/.claude-mem/`. Use `claude-mem summary`, `claude-mem search`, and `claude-mem inject` as usual.

---

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

- Embedding-based semantic search (cosine similarity on message vectors)
- `claude-mem serve` — tiny local web UI to browse sessions
- Export to markdown / Notion / Obsidian
- [x] Daily session count statistics (`stats` command) (v0.1.4)
- [x] Weekly digest export (`export-week` with LLM summary) (v0.1.3)
- [x] OpenClaw integration: built-in hook that auto-logs every session (v0.1.1)
- [x] LLM-powered daily summaries with `--json` flag (v0.1.1)


## Development

```bash
npm install
npm test
```

MIT
