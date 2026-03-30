-- KRI Reports (periodic reporting for Key Risk Indicators)
CREATE TABLE IF NOT EXISTS kri_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kri_id          UUID NOT NULL REFERENCES kris(id) ON DELETE CASCADE,

    -- Period identification
    period_label    TEXT NOT NULL,                    -- e.g. "20 Mar 2026", "Minggu 12, Mar 2026", "Maret 2026"
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    due_date        DATE NOT NULL,

    -- Report data (filled by user on submit)
    value           NUMERIC(15,2),                   -- the reported KRI value
    notes           TEXT DEFAULT '',                  -- explanation / evidence

    -- Status tracking
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','overdue','skipped')),
    submitted_by    UUID REFERENCES users(id),
    submitted_at    TIMESTAMPTZ,

    -- Auto-generated metadata
    generated_by    TEXT DEFAULT 'cron' CHECK (generated_by IN ('cron','manual')),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_kri_reports_kri ON kri_reports(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_reports_status ON kri_reports(status);
CREATE INDEX IF NOT EXISTS idx_kri_reports_due_date ON kri_reports(due_date);
CREATE INDEX IF NOT EXISTS idx_kri_reports_submitted_by ON kri_reports(submitted_by);

-- Prevent duplicate reports for same KRI + period
CREATE UNIQUE INDEX IF NOT EXISTS idx_kri_reports_unique_period
    ON kri_reports(kri_id, period_start, period_end);
