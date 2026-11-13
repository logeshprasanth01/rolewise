# Project skills (UI/UX)

Installed 2026-11-13 for Claude Code / agent work on Rolewise. Each folder is copied unmodified from its source repo.

| Skill | Use it for | Source | License |
|---|---|---|---|
| `frontend-design` | Distinctive visual direction; avoids templated "AI default" UI | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | see LICENSE.txt |
| `ui-ux-pro-max` | Searchable design data: palettes, type pairings, 120 UX guidelines, stack-specific rules (Next.js/React) | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT |
| `web-design-guidelines` | UX + accessibility audit of UI code (`file:line` findings) | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | — |
| `impeccable` | Critique / audit / polish / animate commands for existing screens | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0 |

Notes
- `web-design-guidelines` fetches its rule list from GitHub at review time.
- `impeccable`'s CLI commands download a checksum-verified engine binary on first run.
- Rolewise's own rules still win: neutral grey/ivory first, yellow `#FFD84D` only for primary actions, no violet.
