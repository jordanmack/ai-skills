# Preferred Libraries

Use these libraries instead of custom implementations.

## React / TypeScript

**Bootstrapping:** Always use official CLI tools, never generate boilerplate manually.
Research current install instructions at setup time - commands change between versions.

```bash
# Project setup (research current syntax)
bun create vite my-app --template react-ts

# Tailwind (follow official install guide)
# https://tailwindcss.com/docs/installation
```

| Need | Library/Tool | Notes |
|------|--------------|-------|
| Project setup | `bun create vite` | Use React + TypeScript template |
| CSS framework | `tailwindcss` | Install via official instructions |
| Responsive hooks | `react-responsive` | SSR + testing support |
| Tooltips/popovers | `@floating-ui/react` | Smart positioning |
| Routing | `navigo` | Lightweight, ~3KB |
| Single-file build | `vite-plugin-singlefile` | Bundle to one HTML file |
| Clipboard | Native browser APIs | No library. Use `navigator.clipboard.writeText()` with `document.execCommand('copy')` fallback for non-secure contexts (HTTP). See `react-ui-patterns` for implementation. |

**CSS Conventions:**
- Always use `cursor: pointer` on interactive elements (buttons, links, dropdowns, checkboxes, toggles, clickable cards, etc.)

## Rust

| Need | Library | Notes |
|------|---------|-------|
| Error types | `thiserror` | Derive macros |
| Error propagation | `anyhow` | Ergonomic context |
| CLI args | `clap` | Derive macros |
| Async runtime | `tokio` | Full-featured |
| HTTP server | `rocket` | Macro routing, guards |
| HTTP client | `reqwest` | Pooling, timeouts |
| Serialization | `serde` | With `serde_json` |
| Logging | `log` + `fern` | Facade + multi-output routing |
| Database | `rusqlite` | Use `bundled` feature |
| Connection pool | `r2d2` + `r2d2_sqlite` | Thread-safe pools |
| Static file embedding | `rust-embed` | Embed assets in binary |

## Build Tools

| Need | Tool | Notes |
|------|------|-------|
| JS package manager | `bun` | Faster than npm |
| Rust test runner | `cargo-nextest` | Parallel, better output |

## CKB Development

Consult CKB AI MCP server for CKB-specific guidance.
Key decision: Use CCC (`@ckb-ccc/core`), not Lumos (deprecated).
