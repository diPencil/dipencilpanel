# Agent skills (vendored)

These skills are copied from three upstream repositories so that OpenCode can
discover them automatically from `.opencode/skills/<id>/SKILL.md`. They are
plain Markdown + supporting assets — no build step and no runtime dependency.

| Source | Repository | Commit | License | Skills |
| ------ | ---------- | ------ | ------- | ------ |
| Addy Osmani — agent-skills | https://github.com/addyosmani/agent-skills | `301b02b12bff98e4688e6984af6556802322bbde` | MIT | 25 |
| morluto — rea | https://github.com/morluto/rea | `89317a39fab23df81efa4331311d09d2110377bd` | MIT | 5 |
| 21st-dev — skill | https://github.com/21st-dev/skill | `15c7436c41dc88c54094f1be93ce53bda456b114` | Apache-2.0 | 7 |

Full license texts are in [`licenses/`](licenses/).

## How they are used

OpenCode advertises a skill when its `description` matches the task, then loads
`SKILL.md` on demand. Supporting files (`references/`, `scripts/`, `assets/`)
are resolved relative to the skill's own folder.

## Updating a skill

```powershell
$tmp = "$env:TEMP\skills-src"
git clone --depth 1 https://github.com/addyosmani/agent-skills.git "$tmp\agent-skills"
Copy-Item "$tmp\agent-skills\skills\*" .opencode\skills -Recurse -Force
```

Then update the commit hash in the table above and re-copy the license file.

## Optional prerequisites

Some skills expect extra tooling that is **not** installed by this repository:

- `browser-testing-with-devtools` — requires the Chrome DevTools MCP server.
- `21st-*` skills — require the `@21st-dev/cli` (`21st`) CLI and a
  `.21st/design.json` design context (`21st init --design-context`).
- `rea-*` / `reverse-engineer-anything` — may require the REA toolchain.

The rest work with only the repository context.

## Project-specific guidance wins

These skills are general-purpose. For this repository, the binding rules are
[`CONSTITUTION.md`](../../CONSTITUTION.md) and
[`docs/DESIGN_SYSTEM.md`](../../docs/DESIGN_SYSTEM.md). The agent operating
manual is [`AGENTS.md`](../../AGENTS.md), which routes every skill to a role and
defines the MCP policy. When a skill conflicts with them, follow the project
documents.
