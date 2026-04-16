# Draft: Risk Monitoring Workflow Review & Improvement

## Requirements (confirmed)
- **Primary users**: Risk Owner (Unit level) dan Pimpinan
- **Pain points**: Belum diimplementasi — perlu desain best practice dari awal
- **Frekuensi monitoring**: Bulanan
- **Standard**: ISO 31000:2018

## Research Findings

### ISO 31000:2018 Clause 6.6 Key Requirements
- Monitoring & review harus continuous, bukan hanya calendar-based
- Harus embedded di SEMUA stage lifecycle, bukan hanya akhir
- Harus ada change triggers (event-driven), bukan cuma scheduled
- Hasil monitoring harus feed back ke decision-making

### Enterprise GRC Best Practices (2026)
- KRI auto-escalation: breach threshold → auto-assign owner + notify
- Incident-to-Risk feedback loop: incident resolved → risk auto-reassess
- Evidence pipeline: automated, bukan manual upload
- One-click actions: approve/reject/escalate tanpa form panjang
- Leading KRIs (control exceptions, test failures) bukan hanya lagging

### Top Practitioner Complaints
1. Dashboard green tapi risiko sebenarnya tinggi (wrong KRI thresholds)
2. Alert fatigue — 90% alerts diabaikan
3. Ownership fuzzy — tidak ada escalation on inaction
4. Evidence collection manual — auditor butuh 2 minggu cari PDF
5. Monitoring jadi compliance theater bukan decision tool

## Gap Analysis (Codebase vs Best Practices)

### ✅ Sudah Solid
1. Risk lifecycle flow (draft→in_review→in_approval→approved) — lengkap
2. Multi-step approval (Reviewer→Pimpinan) — proper sequential steps
3. KRI threshold monitoring (normal/warning/breached) — calculation logic ada
4. Risk versioning & reassessment — version_group_id chain tracking
5. Incident-Risk linking (M2M) — junction table ada
6. KRI report periodic generation — cron daily
7. Heatmap 5×5, velocity, top risks, KPI dashboard — data aggregation ada
8. Mitigation task overdue marking — cron-based

### ⚠️ Gap Kritis (Harus Diperbaiki)

**GAP 1: Zero Notification System**
- Tidak ada notifikasi sama sekali — no email, no in-app, no push
- Approval pending? User harus manual cek inbox
- KRI breach? Tidak ada yang diberitahu
- Impact: Risk owner dan Pimpinan tidak aware ada action yang perlu dilakukan

**GAP 2: No Escalation on Inaction**
- Overdue mitigation tasks hanya di-mark overdue, tapi tidak ada escalation
- KRI report overdue? Tidak ada consequences
- Approval stuck 2 minggu? Tidak ada auto-escalation ke atasan
- Impact: Silent risk drift — risiko membesar tanpa ada yang bertindak

**GAP 3: Incident Tidak Trigger Risk Reassessment**
- Incident bisa link ke risk, tapi TIDAK auto-trigger reassessment
- Risk score tidak berubah meskipun 3 incident terjadi
- Impact: Risk register outdated, false sense of safety

**GAP 4: KRI Monitoring Passive, Bukan Actionable**
- KRI breach terdeteksi tapi tidak ada "then what?"
- Tidak ada auto-assign action plan ke risk owner saat breach
- Tidak ada trend analysis (apakah membaik atau memburuk)
- Impact: Dashboard merah tapi tidak ada yang bertindak

**GAP 5: No "My Tasks" / Owner Accountability View**
- Risk owner tidak punya landing page "ini yang harus kamu kerjakan"
- Pimpinan tidak punya "ini yang butuh approval kamu"
- Harus navigasi manual ke berbagai halaman
- Impact: User frustration, low adoption

**GAP 6: No Evidence Pipeline**
- KRI report ada submission tapi evidence manual
- Mitigation task completion tanpa bukti
- Control effectiveness tidak di-track
- Impact: Audit butuh berminggu-minggu kumpulkan bukti

**GAP 7: Monitoring Bulanan Tanpa Event-Driven Trigger**
- ISO 31000 mensyaratkan monitoring bukan hanya calendar-based
- Harus ada trigger: incident baru → monitor, KRI breach → monitor
- Saat ini 100% cron-based, 0% event-driven

## Open Questions
- (Resolved — gap analysis selesai)

## Scope Boundaries
- INCLUDE: Workflow pemantauan risiko end-to-end + notification + escalation + owner accountability
- EXCLUDE: Mobile app, offline-first, third-party risk monitoring
