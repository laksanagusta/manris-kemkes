# Risk Detail Final PDF Export Design

## Context

Manris already has a risk detail flow, but the current detail page is effectively the existing risk form route at `/risk/register/new?id=...`. The user now wants an export specifically for finalized risks that produces a formal PDF attachment rather than a UI snapshot.

The export should follow the same formal-document direction used for the recent briefing export: restrained, document-like, and suitable for archival or official sharing. Unlike the briefing export, this feature must generate a real PDF and do so from the backend.

## Goals

- Add a PDF export for finalized risk details.
- Generate the PDF from backend data, not browser form state.
- Present the content as a complete formal attachment rather than an executive summary.
- Keep the exported structure aligned with the detail data users already trust.

## Non-Goals

- Exporting draft or unsaved risk changes.
- Including risk history, activity logs, linked descendants, or workflow audit trails.
- Building a generic PDF engine for every record type.
- Replacing the existing detail/edit route structure in this iteration.

## Scope

Add a new export action to the finalized risk detail flow:

- Frontend entry point remains the current detail/edit route: `/risk/register/new?id=...`
- Output is a backend-generated PDF download
- Availability is limited to final risks that are already stored

The first version should export:

- Risk identity and organizational metadata
- Identification content
- Analysis values and derived risk level information
- Evaluation fields
- Existing controls and treatment choice
- Mitigation or RPR table
- Residual target values
- Basic record metadata

The first version should not export:

- Version history
- Activity log
- Related downstream risks
- Approval timeline
- Unsaved browser-side edits

## User Experience

The detail page should expose an `Export PDF` action near the other primary detail actions. When clicked:

1. The frontend validates that the current record has a stored risk ID.
2. The frontend requests the backend export endpoint.
3. The backend returns a downloadable PDF.
4. The browser downloads a file named from the risk code when available, falling back to the risk ID.

If the risk is not final, the user should see a clear error message explaining that PDF export is only available for finalized risks.

## Document Structure

The PDF should be a formal attachment, not a screenshot-like rendering of the page. It should use A4 paper and preserve a stable reading order.

Recommended structure:

1. Title block
   - `Lampiran Detail Risiko`
   - Risk title
   - Risk code, if present
2. Identity section
   - Unit kerja
   - Kategori risiko
   - Sumber risiko
   - Siklus assessment
   - Status
3. Identifikasi Risiko
   - Deskripsi risiko
   - Sebab
   - Dampak
4. Analisis Risiko
   - Probability
   - Impact
   - Bobot
   - Nilai
   - Level risiko
   - Prioritas risiko
5. Evaluasi Risiko
   - Selera risiko
   - Penanda risiko utama
   - Ringkasan review bila tersedia
6. Pengendalian dan Penanganan
   - Existing control
   - Efektivitas pengendalian
   - Pilihan penanganan
7. Rencana Penanganan Risiko
   - Mitigation table with action, owner, frequency or schedule, due date, and notes when available
8. Target Residual
   - Target probability
   - Target impact
   - Target bobot
9. Metadata
   - Dibuat oleh
   - Dibuat pada
   - Terakhir diperbarui

## Visual Rules

The PDF should intentionally read like a formal attachment:

- Paper: `A4`
- Font: `Arial`
- Body size: `11pt`
- Paragraph spacing: `1.15`
- Narrative paragraphs: justified
- Labels, table headers, and section titles: left aligned
- Tables: thin formal borders, compact row spacing, no application-style decoration
- Empty values: render as `-`

Long text fields such as description, causes, impacts, and controls should be shown in full. The goal is completeness, not compression.

## Data Rules

The export must use the persisted final risk record from the backend.

Data source rules:

- Always fetch the latest stored risk detail by ID.
- Reject export when the risk status is not final.
- Use the same core detail source as the existing risk detail page wherever possible.
- Prefer already-computed values when stored, but allow the export layer to derive display-only labels such as risk level or priority from existing numeric values.

Fallback rules:

- Missing strings become `-`
- Empty arrays become `-`
- Missing dates become `-`
- Missing mitigation rows should still render the section with an empty-state row or `-`

## Backend Design

### Endpoint

Add a dedicated endpoint:

- `GET /api/v1/risks/:id/export-pdf`

Response behavior:

- Success: `200` with `application/pdf`
- File download headers set for attachment

### Handler

The HTTP handler should:

- Parse and validate the risk ID
- Read authenticated user context
- Call the export use case
- Set `Content-Type` and `Content-Disposition`
- Return PDF bytes directly

### Use Case

Create a focused export use case that:

- Verifies access to the risk organization
- Loads the persisted risk detail
- Verifies the risk is finalized
- Maps the domain or API data into a PDF-specific view model
- Invokes a PDF renderer

This use case should not be mixed into the general update flow. Export is read-only and should have its own boundary.

### PDF Renderer

Introduce a dedicated PDF builder or renderer in the backend, scoped to risk detail export.

Responsibilities:

- Render title and section headings
- Layout narrative fields and key-value pairs
- Render mitigation table across page breaks if needed
- Apply the formal type rules consistently

The renderer should be isolated from handler logic so layout changes do not ripple through transport code.

## Frontend Design

The current risk detail route already loads and displays the stored record. The frontend changes should stay small:

- Add an `Export PDF` button near existing detail actions
- Show loading state while the file request is in progress
- Use the existing authenticated request path for file download
- Show specific error toasts for:
  - not found
  - no access
  - risk not finalized
  - generic export failure

The frontend should not attempt to reconstruct the PDF content itself.

## Error Handling

Recommended server responses:

- `404` when the risk does not exist
- `403` when the user cannot access the risk organization
- `409` when the risk exists but is not in final status
- `500` when PDF generation fails unexpectedly

Recommended frontend messaging:

- `Risiko tidak ditemukan.`
- `Anda tidak memiliki akses ke risiko ini.`
- `Export PDF hanya tersedia untuk risiko final.`
- `PDF belum berhasil dibuat. Silakan coba lagi.`

## Testing

### Backend

- Unit test: finalized risk exports successfully
- Unit test: non-final risk is rejected
- Unit test: inaccessible risk is rejected
- Renderer smoke test: produced PDF bytes are non-empty
- Renderer content test: major section labels are present in extracted text when a PDF text tool is available

### Frontend

- Button renders on the risk detail page when a stored risk is loaded
- Loading state is shown during export
- Error toast matches backend failure type

### Manual Verification

- Export one finalized risk with full fields
- Export one finalized risk with many empty optional fields
- Export one finalized risk with enough mitigation rows to force table continuation
- Confirm A4 layout, Arial 11, 1.15 spacing, and justified narrative paragraphs

## Rollout Notes

- This feature is intentionally limited to finalized risks so exported documents remain stable and defensible.
- Draft export can be considered later, but it should be treated as a separate workflow rather than folded into this endpoint.
- The implementation should follow existing backend risk access rules rather than inventing a parallel permission path.
