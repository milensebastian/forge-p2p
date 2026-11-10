# FORGE Desktop Application (Reserved for Future Tauri Integration)

This package is reserved for future integration with [Tauri v2](https://tauri.app/).

## Planned Architecture
- **Runtime**: Tauri Rust backend + React Web frontend.
- **Shared Code**: Consumes `@forge/core`, `@forge/collaboration`, and `@forge/ui` directly from the monorepo.
- **Local File System**: Direct binding to local disk directories via Tauri native filesystem APIs, syncing bidirectionally with the Yjs document model.
- **Offline Persistence**: Leverages SQLite or RocksDB via native Rust plugins alongside IndexedDB.

*Implementation is intentionally deferred per the MVP browser-first specification.*

