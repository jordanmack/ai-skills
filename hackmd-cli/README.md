# hackmd-cli skill

Agent skill for the official HackMD CLI (`@hackmd/hackmd-cli`).

## Origin / attribution

**This skill was not written in this repository.**

It is a vendored copy of the official agent skill published by the HackMD project in:

- Repository: [hackmdio/hackmd-cli](https://github.com/hackmdio/hackmd-cli)
- Skill archive: [`hackmd-cli.skill`](https://github.com/hackmdio/hackmd-cli/blob/develop/hackmd-cli.skill)
- Upstream path inside the archive: `hackmd-cli/SKILL.md`

Imported from the `develop` branch around commit
[`bf73672740f42991011c7cf56125aa5ede2e9df2`](https://github.com/hackmdio/hackmd-cli/commit/bf73672740f42991011c7cf56125aa5ede2e9df2)
(2026-05-27).

The upstream package is MIT-licensed ([LICENSE](https://github.com/hackmdio/hackmd-cli/blob/develop/LICENSE)).

## May be modified here

This copy **may now differ** from upstream. Treat it as a local fork for this skills repo: fixes, local defaults, or packaging changes may land here without matching the official skill file byte-for-byte. When in doubt, compare against the current
[`hackmd-cli.skill`](https://github.com/hackmdio/hackmd-cli/blob/develop/hackmd-cli.skill)
on GitHub.

## Install (this repo)

From the repo root:

```bash
./install.sh hackmd-cli claude
./install.sh hackmd-cli grok
./install.sh hackmd-cli codex
```

## CLI prerequisite

The skill drives the `hackmd-cli` binary. Install and authenticate separately:

```bash
npm install -g @hackmd/hackmd-cli
hackmd-cli login   # or set HMD_API_ACCESS_TOKEN
```
