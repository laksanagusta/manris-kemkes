# Decisions — Kertas Kerja Working Paper

## [2026-04-10] Initialization
- Risk data snapshotted as JSONB (not live-referenced)
- QR code generated server-side (Go), returned as base64 PNG
- Separate tables from approval system (NOT reusing approval tables)
- Excel export only (no PDF)
- Simple lifecycle: draft → signing → completed (+ cancelled)
