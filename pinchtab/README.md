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

The upstream project is MIT-licensed ([LICENSE](https://github.com/pinchtab/pinchtab/blob/main/LICENSE)).

## May be modified here

This copy **may now differ** from upstream. Treat it as a local fork for this skills repo: frontmatter/`TRIGGER` style, viewport docs, safety notes, or packaging may land here without matching the official skill tree byte-for-byte. When in doubt, compare against the current [`skills/pinchtab`](https://github.com/pinchtab/pinchtab/tree/main/skills/pinchtab) tree on GitHub.

## Install (this repo)

From the repo root:

```bash
./install.sh pinchtab claude
./install.sh pinchtab grok
./install.sh pinchtab codex
```

## CLI prerequisite

The skill drives the `pinchtab` binary. Install PinchTab separately (see upstream install docs / brew / npm).
