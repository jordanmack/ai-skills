# Setup and shared integration

## CLI

Install the reviewed release in an isolated environment:

```bash
uv tool install --python 3.13 'graphifyy[sql]==0.9.102'
graphify --version
```

The package name is `graphifyy`; the command is `graphify`. SQL parsing is an
optional extra. Install additional extras only for a requested capability, such
as `mcp`, `watch`, `pdf`, or a model backend. Code-only extraction needs no key.
Host-assisted semantic extraction uses the running assistant and the workflow's
chunk files. Headless semantic extraction needs a configured backend.

Resolve the environment's interpreter from `graphify`'s launcher shebang for
Python library calls. Inspect existing interpreter sidecars before trusting them
when migrating from another host. Keep system Python unchanged.

## One skill, three agents

From this repository root:

```bash
./install.sh graphify claude
./install.sh graphify codex
./install.sh graphify grok
```

Each agent's `skills/graphify` must resolve to this same directory. Before
linking, preserve any existing physical Graphify directory outside agent skill
search paths. The install script expects a missing destination or an existing
symlink; an existing real directory must be moved first.

Keep this skill repo-managed. Graphify's platform installers copy their own
host-specific skills and can overwrite this shared content. See `UPSTREAM.md`
for the reviewed update process and automatic-refresh protection.

## Project integration

Preserve existing project rules. Where needed, add concise guidance to query an
existing graph before structural exploration and run `graphify update .` after
code changes. Keep `graphify-out/` ignored when project policy requires it.

After reviewing existing executable hooks and receiving approval:

```bash
graphify hook install
graphify hook status
```

The installer adds commit, checkout, merge, and rewrite hooks plus a graph merge
driver. Code refresh runs in the background. Wait for graph output and inspect
`~/.cache/graphify-rebuild.log` before claiming refresh completed. Hook status
only confirms installation. Linked worktrees need explicit updates.

Document/media changes need the semantic workflow. Run `graphify check-update .`
to inspect pending changes. Use project-specific stdio MCP with an absolute graph
path when structured tools are requested; install the `mcp` extra first.

## Verification

Verify all three links resolve to the same `SKILL.md`. Confirm CLI extraction,
query, explain, path, and changed-file updates in a disposable repository. Exercise
semantic extraction with the host's available worker tools and inspect chunk
coverage. Check each agent's skill discovery. Report separately any host workflow
that could only be inspected rather than exercised.
