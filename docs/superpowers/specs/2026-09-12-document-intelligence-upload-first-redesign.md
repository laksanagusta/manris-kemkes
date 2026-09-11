# Document Intelligence Upload-First Redesign

## Objective

Remake the initial state of Document Intelligence around a calm, upload-first canvas inspired by the supplied reference while preserving the existing analysis configuration, processing workspace, history, findings, exports, and inspector.

## Audience and Product Context

The page serves ministry staff who turn operational documents into structured risk findings. The interface must feel precise, restrained, trustworthy, and consistent with Manris's monochrome operational design system. Semantic color is reserved for status, validation, selection, focus, and the upload action.

## Chosen Direction

Use a minimal upload-first composition. The large drop zone is the visual focus. Analysis settings and history remain available through progressive disclosure so the initial page does not read like a dense form. Once processing starts, the existing workspace becomes the primary object and retains its spatial index, task lanes, factual timeline, results, and inspector.

This direction was selected over a two-column setup and a multi-step wizard because it most closely matches the supplied visual reference without removing capabilities or introducing an additional navigation step.

## Initial State

- Keep the standard `PageStack` and collection page header contract.
- Center the setup workflow in a constrained content column with generous vertical whitespace.
- Render one large, neutral, dashed drop zone with a document glyph and a compact blue upload indicator. Blue is functional and limited to the upload affordance and active progress.
- Use concise Indonesian copy explaining drag-and-drop, supported formats, and the existing 1 MB limit.
- Keep keyboard activation, focus visibility, drag feedback, reduced-motion behavior, and the native hidden file input.
- Expose mode and assessment period in a lightweight “Pengaturan analisis” disclosure below the upload surface.
- Expose processing history in a second lightweight disclosure below the setup workflow.

## Selected File State

- Replace the empty drop zone with a single bordered file row that follows the reference hierarchy: file-type thumbnail, filename, extension and size metadata, removal control, and validation feedback.
- Show a slim progress/readiness rail only when it communicates a real state. Do not fabricate upload progress.
- Keep validation issues inline and preserve an already-valid file when an invalid additional selection is attempted.
- Place “Mulai analisis” as the sole primary action after a valid file is present.
- Preserve the one-document maximum and current accepted formats.

## Processing and Results

- Preserve the existing processing adapter and job lifecycle.
- Preserve cancel, retry, export, download report, open source, review finding, create risk draft, and start-new-process actions.
- Preserve the spatial index, parallel task lanes, activity timeline, completed-results grouping, locally persisted history, and closable inspector.
- Visually align these states with the restrained upload-first surface: neutral `rounded-xl` containers, shared borders/shadows, compact metadata, and semantic status colors only.
- On narrow viewports, stack the inspector below the primary workspace without hiding critical actions.

## Component Boundaries

- `DocumentIntelligencePage` continues to own authentication-aware API integration and risk-draft navigation.
- `DocumentProcessingWorkspace` continues to own job state, analysis settings, history, and transitions between setup and processing.
- `UploadPanel` owns the empty drop zone, selected-file presentation, file issues, and start action.
- Existing result, inspector, timeline, and spatial-index components retain their behavioral responsibilities.
- Shared design-system documentation receives a representative upload-first example or documented production pattern; `DESIGN.md` receives the canonical rule.

## Error and Recovery Behavior

- Unsupported, empty, oversized, duplicate, or extra files produce inline actionable messages.
- The valid current selection remains intact after an invalid additional selection.
- Offline, failed, partial, cancelled, and resumable processing states retain their current recovery affordances.
- Upload and processing controls remain unavailable only when their prerequisites are not met.

## Verification

- Add or update component tests for the empty drop zone, selected-file state, settings disclosure, validation retention, start action, and history access.
- Run focused frontend tests and lint for changed files.
- Run a production build if the focused checks pass.
- Visually inspect desktop and narrow viewport states against the supplied reference and the Manris design-system page.

## Scope Exclusions

- No backend API contract changes.
- No new document formats or larger file-size limits.
- No replacement of the processing adapter or persistence model.
- No removal of current analysis modes, history, results, or inspector functionality.
