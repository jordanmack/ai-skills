# Upstream and maintenance

This shared skill adapts Graphify Labs' Graphify skill and references from
`graphifyy==0.9.102`, tag `v0.9.102`:
https://github.com/Graphify-Labs/graphify/tree/v0.9.102

The source wheel's SHA-256, verified against PyPI metadata, is
`ee23ceb03ee7b47c6230ba2c16f02e928b11436660d5a9d4a8c14f88bf8f214b`.
License and attribution files are included beside this file.

Local adaptations: concise entry point, pinned isolated setup, host-specific
subagent dispatch with a common chunk-file contract, host-aware read limits,
untrusted-source handling, media-aware coverage, separate deep-mode caches, and
persisted unknown token accounting.

Maintain this directory as the single source for Claude Code, Codex, and Grok
Build. The repository install script links their skill directories here.
A `.graphify_version` installer stamp is deliberately absent: Graphify's automatic
stale-skill refresh requires that stamp and can otherwise overwrite managed
instructions. Upgrade the CLI and review upstream skill changes together. Avoid
running Graphify's platform installers against these symlinks.

To update: inspect the new release's packaged `skill.md` and
`skills/claude/references/`, reconcile these adaptations, verify code and semantic
extraction, then commit the reviewed changes. Package upgrades alone leave this
managed skill unchanged.
