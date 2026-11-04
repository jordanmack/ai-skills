# graphify reference: commit hook and native CLAUDE.md integration

Load this when the user asked to install the post-commit hook or wire graphify into a project's CLAUDE.md.

## Hook and project setup

Read `references/setup.md` for shared-skill installation and approved Git hook
setup. Current Graphify installs commit, checkout, merge, and rewrite hooks; the
rebuild runs in the background. Existing project guidance should be preserved.
Use `graphify update .` explicitly in linked worktrees.

## Source-read freshness

The source-read guard treats a file newer than `graph.json` as potentially stale,
but a checkout can refresh timestamps without changing content. For newer files,
the guard checks the exact project-relative path (or an exact legacy absolute
path) in the configured output directory's extraction manifest. Every populated
AST/semantic hash must match the current content; a matching tier cannot hide a
stale tier. Unchanged content retains the normal graph guidance and strict-mode
first-read deny.

Missing, unreadable, malformed or oversized manifests, unknown paths, and absent
or invalid hashes retain the conservative stale soft nudge. A `needs_update`
marker always softens the guard, even when content matches. Older-mtime files
are not hashed; this is a checkout-timestamp check, not a full freshness audit.
