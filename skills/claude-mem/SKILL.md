# claude-mem Skill

Persistent AI coding session memory for OpenClaw and Claude Code.

Auto-logs every session and makes past context searchable. No manual `claude-mem log` needed.

## What it does

- Hooks into session lifecycle (`session-new`, `session-end`)
- Logs every message exchange to `~/.claude-mem/`
- Generates daily summaries (LLM-powered if `OPENAI_API_KEY` set)
- Suggests relevant past context when starting new tasks via `claude-mem inject`

## Install

```bash
npm install -g claude-mem
claude-mem init
```

Then enable in OpenClaw:

```bash
openclaw skill enable claude-mem
```

Or via ClawHub:

```bash
clawhub install claude-mem
```

## Commands

Same as the `claude-mem` CLI:

- `claude-mem init` — initialize storage
- `claude-mem summary [date]` — view daily summary
- `claude-mem search <query>` — search past sessions
- `claude-mem inject <context>` — suggest relevant past sessions
- `claude-mem log <file>` — manual log (if you ever need it)

## Storage

All data stays local in `~/.claude-mem/`:
- `sessions/YYYY-MM-DD.jsonl` — raw session logs
- `index.json` — lookup index

## LLM summaries

Set `OPENAI_API_KEY` (or `CLAUDE_API_KEY`) in your environment to enable AI-generated daily summaries. Falls back to a crude list of titles if no key.

## Roadmap

- [x] CLI + store
- [x] Search + relevance
- [x] LLM summaries
- [x] OpenClaw hook integration
- [ ] Web UI (`claude-mem serve`)
- [ ] Semantic embeddings search
- [ ] Export (markdown, Notion, Obsidian)

## License

MIT
