# Auto-Versioning

Techniques for embedding version and build metadata at compile time across different stacks.

## Quick Reference: Rust Cargo Environment Variables

Never hardcode version strings. Use Cargo's compile-time environment variables:

```rust
// In Clap derive
#[command(version = env!("CARGO_PKG_VERSION"))]

// At runtime
info!("Starting server v{}", env!("CARGO_PKG_VERSION"));

// In structs
version: env!("CARGO_PKG_VERSION").to_string(),
```

**Available variables:** `CARGO_PKG_NAME`, `CARGO_PKG_VERSION`, `CARGO_PKG_VERSION_MAJOR/MINOR/PATCH`, `CARGO_PKG_AUTHORS`, `CARGO_PKG_DESCRIPTION`

## Detailed Implementations

### Rust Build Metadata (build.rs)

Generate build timestamps and version files at compile time using `build.rs`.

**When to use:** Build timestamp in binary, version info for installers, deployment metadata.

→ See `rust-build-version.md` for full implementation.

### Vite Auto-Increment Plugin

Auto-increment patch version in package.json on build and hot reload.

**When to use:** Automatic version bumping during development, deployment version tracking.

→ See `vite-version-plugin.js` for full implementation.

## Accessing Version at Runtime

**Rust:**
```rust
const BUILD_TIME: &str = include_str!(concat!(env!("OUT_DIR"), "/../build_time.txt"));
```

**Vite/React:**
```typescript
// Option 1: Import package.json
import packageJson from '../package.json';
const version = packageJson.version;

// Option 2: Use Vite define (in vite.config.ts)
define: { __APP_VERSION__: JSON.stringify(packageJson.version) }
// Then in code:
declare const __APP_VERSION__: string;
```
