# Profile period rules verification

Implemented superadmin rules (12/4/2 inclusive Jakarta windows), selected during annual profile initiation while keeping year and risk pickup. Calendar coverage differs from submission dates. Existing unconfigured profiles retain legacy behavior. Configured records share uniqueness across profile revisions. Working paper/evaluation progress is shown on profile rows; monitoring on risk rows. Pending/Ongoing/Done follows lifecycle independently of percent. Design system catalog and DESIGN.md are synchronized.

Verification 2026-11-14:
- Production-source TypeScript check passes; full repository typecheck has existing fixture/generated-route errors.
- 27 targeted frontend tests pass across six files.
- Six related Go packages pass: entity, risk, workingpaper, evaluation, HTTP, PostgreSQL.
- Four integration tests pass on fresh isolated PostgreSQL with final migration88: Jakarta boundaries, observation versus submission periods, revision/legacy behavior, concurrent duplicate monitoring, WP/evaluation uniqueness, evaluation completeness, immutable final documents and children.
- Migration88 up/down/up passes on isolated DB. Baseline migration1 test copy required ownership/schema_migrations compatibility adjustments; repository migration1 not changed.
- Browser verifies superadmin settings, creating monthly rule with12 windows, dynamic semester columns, creating/saving monitoring and 2/2 Ongoing100%. Evaluation picker correctly binds profile/period; full browser evaluation creation was blocked by missing active template in smoke fixture. Evaluation DB tests pass.
- Scoped lint: zero errors, one existing React Hook Form compiler warning.
- Full frontend Bun run:302 pass,157 fail,55 errors (legacy/source-contract/harness failures); overall suite not green. Backend baseline failures exist in AI, obsolete approval workflow and report averages.
- Independent spec and quality reviews completed. Fixed role normalization, canonical revision uniqueness, stale WP previews/navigation, context/window bypasses, finalized-evaluation races, frequency-specific evidence and enum comparison in generic DB triggers.

Only disposable test databases were migrated. Main application DB was not modified; migration88 must be applied before feature activation. No commits/deployment; existing workspace changes retained.

Follow-up activation: applied migration88 to local application database localhost:5439/manris after confirming clean version87 and missing monitoring_rules. Verified version88, dirty=false, both rule tables present and successful rules query. Existing profile data remains unlinked per legacy compatibility.
