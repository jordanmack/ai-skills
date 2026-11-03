# pinchtab skill

Drive a real browser through the PinchTab CLI for token-efficient automation.

## Origin / attribution

**This skill was not written in this repository.**

It is a vendored copy of the official PinchTab agent skill from the PinchTab project:

- Repository: [pinchtab/pinchtab](https://github.com/pinchtab/pinchtab)
- Upstream skill tree: [`skills/pinchtab`](https://github.com/pinchtab/pinchtab/tree/main/skills/pinchtab)
- Homepage (also in skill frontmatter): https://github.com/pinchtab/pinchtab

Imported into this repo as the "official pinchtab skill" (local git history:
commit `40e8d8a`, message *Add official pinchtab skill with runtime viewport docs*).
Upstream base: the `skills/pinchtab` tree at the release tag that matches the
installed CLI (`pinchtab --version`). Sync from a release tag, not `main`, because
`main` documents unreleased commands. `git log -- pinchtab` shows the last sync.

The upstream project is MIT-licensed ([LICENSE](https://github.com/pinchtab/pinchtab/blob/main/LICENSE)).

## May be modified here

This copy **may now differ** from upstream. Treat it as a local fork for this skills repo: frontmatter/`TRIGGER` style, viewport docs, safety notes, or packaging may land here without matching the official skill tree byte-for-byte. When in doubt, compare against the current [`skills/pinchtab`](https://github.com/pinchtab/pinchtab/tree/main/skills/pinchtab) tree on GitHub.

Local changes to re-apply after each upstream sync:

- Frontmatter `description` in the repo `TRIGGER` style.
- `set viewport` docs (SKILL.md *Viewport / device emulation*, the *Responsive check* pattern, and the `set viewport` and screenshot sizing notes in `references/commands.md`). Upstream omits them, but the CLI supports the command.
- The note that agent sessions must be created on the main server (default `:9867`), because bridge ports return 404 for `/sessions`.

## Upgrade gotcha

The npm/bun package `postinstall` copies its bundled skill into `~/.claude/skills/pinchtab` and `~/.codex/skills/pinchtab`. Both are symlinks to this folder, so every `pinchtab` package upgrade overwrites this fork with the stock skill. After an upgrade, review `git diff -- pinchtab` and re-apply the local changes above.

## Install (this repo)

From the repo root:

```bash
./install.sh pinchtab claude
./install.sh pinchtab grok
./install.sh pinchtab codex
```

## CLI prerequisite

The skill drives the `pinchtab` binary. Install PinchTab separately (see upstream install docs / brew / npm).
