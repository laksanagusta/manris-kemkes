# Draft: Risk Assessment Form Review vs ISO 31000:2018

## Scope
- Focus: Risk Assessment form & workflow
- Framework: ISO 31000:2018
- Context: Ministry (Ditjen P2P) risk management SaaS

## Current State Summary

### Form Structure (6 sections accordion)
1. **Identifikasi Risiko**: title, description, category (6 types), causes[], riskSource, controllability, impacts[]
2. **Analisis Risiko**: existingControl (text), controlEffectiveness, probability (1-5), impact (1-5), auto-calc weight/nilai/score
3. **Evaluasi Risiko**: riskAppetite (binary), treatmentOption
4. **Rencana Penanganan**: mitigations[] (action, owner, dueDate, frequency)
5. **Target Penurunan**: targetProbability (1-5), targetImpact (1-5), nextReviewDate
6. **Approval Line**: reviewer + sequential approvers

### Scoring Model
- Bobot Matrix 5×5 custom weights
- Nilai = probability × impact × weight
- 5 risk levels: Sangat Rendah (<5) → Sangat Tinggi (≥20)
- Dual score: Skor Sementara (unit) + Skor Penilaian (reviewer)

### Workflow
- draft → in_review → in_approval → approved
- Rejection returns to draft

---

## GAP ANALYSIS vs ISO 31000:2018

### ✅ SUDAH BAIK (Aligned)
1. Multi-step form (6 sections) - sesuai wizard approach
2. Risk identification: title, description, category, causes, impacts, source, controllability
3. Risk analysis: existing controls, control effectiveness, probability/impact 1-5
4. Risk evaluation: appetite, treatment option
5. Mitigation planning with owner, due date, frequency
6. Target residual risk
7. Dual score model (unit + reviewer)
8. Multi-step approval workflow
9. Version history & audit trail
10. AI-assisted features
11. Assessment cycle tracking (semester)
12. Risk code auto-generation

### ❌ GAPS KRITIS

#### GAP-1: Single-Dimension Impact (KRITIS)
- Current: 1 impact score (1-5)
- ISO 31000: Multi-dimensional - Financial, Operational, Regulatory, Reputational, Strategic
- Government context: wajib multi-dimensi, karena dampak politik ≠ dampak finansial

#### GAP-2: Bobot Matrix Non-Standard (PERLU DISKUSI)
- Current: custom 5×5 weight matrix modifies base score
- ISO 31000: standard = Likelihood × Impact = Risk Score (no weight modifier)
- Concern: auditor mungkin questioning basis weight matrix ini

#### GAP-3: Treatment Options Mismatch (MEDIUM)
- Frontend: hanya 2 options (menerima, mitigasi)
- Backend: 4 options (avoid, mitigate, transfer, accept)
- ISO 31000: 4T - Treat/Mitigate, Transfer, Terminate/Avoid, Tolerate/Accept

#### GAP-4: No Residual Risk Layer (KRITIS)
- Current: Inherent score → target score
- ISO 31000: Inherent → (existing controls) → Residual → (treatment) → Target
- Missing: explicit residual risk calculation after controls

#### GAP-5: Risk Appetite Binary Only (MEDIUM)
- Current: dalam_batas / di_atas_batas (binary)
- Best practice: configurable thresholds per category, auto-escalation

#### GAP-6: No Risk Event Field (MINOR)
- Current: only "description"
- ISO 31000 distinguishes: source, event, cause, consequence as separate concepts

#### GAP-7: No Confidence Level (MINOR)
- Assessor certainty not captured
- Helps reviewer understand reliability of assessment

#### GAP-8: Likelihood/Impact Without Detailed Criteria (MEDIUM)
- Current: labels only (Sangat Jarang, etc.)
- Best practice: each level has specific criteria (frequency, dollar amount, etc.)
- Makes scoring consistent across assessors

#### GAP-9: Control-Risk Linkage Weak (MEDIUM)
- existingControl = free text, no link to Controls module
- Should show how specific controls reduce specific dimensions

#### GAP-10: No Evidence/Attachment (MEDIUM)
- No file upload for supporting documentation
- Audit trail needs evidence

#### GAP-11: No Risk Interdependencies (LOW)
- Risks treated as independent
- No compound/cascade risk modeling

#### GAP-12: No Escalation Rules (LOW)
- Manual approval only
- No auto-escalation based on score thresholds

---

## Open Questions
- Bobot matrix: mau pertahankan atau switch ke standard L×I?
- Multi-dimensional impact: full 5 dimensi atau simplified?
- Residual risk layer: explicit field atau derived from control effectiveness?
- Treatment options: expand frontend to 4T?
- Risk appetite: keep binary atau configurable thresholds?
- Priority: which gaps to fix first?

## Research Source
- ISO 31000:2018 framework analysis
- IEC 31010 risk assessment techniques
- Government risk management best practices
- Current codebase analysis (frontend + backend + DB schema)
