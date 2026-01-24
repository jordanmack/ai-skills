# Rust Build Version Implementation

Generate build metadata (version, timestamp) at compile time using `build.rs`.

## Cargo.toml

Add build dependencies:

```toml
[build-dependencies]
chrono = "0.4"
```

## build.rs

Create in project root:

```rust
use chrono::prelude::*;
use std::fs;

fn main() {
	let build_time = Local::now().to_string();
	let build_version = env!("CARGO_PKG_VERSION").to_string();

	// Write build metadata to target directory
	fs::write("target/build_time.txt", &build_time)
		.expect("Unable to create build_time.txt");
	fs::write("target/build_version.txt", &build_version)
		.expect("Unable to create build_version.txt");

	// Optional: Create INI file for installers (e.g., Inno Setup)
	// Requires: ini = "1.3" in build-dependencies
	// use ini::Ini;
	// let mut conf = Ini::new();
	// conf.with_section(Some("Build"))
	//     .set("build_time", build_time)
	//     .set("build_version", build_version);
	// conf.write_to_file("target/build.ini").unwrap();
}
```

## Reading at Runtime

```rust
const BUILD_TIME: &str = include_str!(concat!(env!("OUT_DIR"), "/../build_time.txt"));

fn main() {
	println!("Built at: {}", BUILD_TIME.trim());
}
```

## Notes

- `build.rs` runs before compilation
- Files in `target/` are rebuilt on each build
- Use `include_str!` to embed file contents at compile time
