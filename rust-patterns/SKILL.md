# Rust Patterns

Common Rust patterns and best practices.

## Version from Cargo.toml

Never hardcode version strings in multiple places. Use the `CARGO_PKG_VERSION` environment variable that Cargo sets at compile time:

```rust
// In Clap derive
#[command(version = env!("CARGO_PKG_VERSION"))]

// At runtime
info!("Starting server v{}", env!("CARGO_PKG_VERSION"));

// In structs
version: env!("CARGO_PKG_VERSION").to_string(),
```

This reads the version from `Cargo.toml` at compile time, ensuring a single source of truth.

## Related Cargo Environment Variables

- `CARGO_PKG_NAME` - Package name
- `CARGO_PKG_VERSION` - Full version (e.g., "1.5.0")
- `CARGO_PKG_VERSION_MAJOR` - Major version number
- `CARGO_PKG_VERSION_MINOR` - Minor version number
- `CARGO_PKG_VERSION_PATCH` - Patch version number
- `CARGO_PKG_AUTHORS` - Package authors
- `CARGO_PKG_DESCRIPTION` - Package description
