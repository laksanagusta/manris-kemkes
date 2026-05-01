-- Task 5: Likelihood Assessments
CREATE TABLE IF NOT EXISTS likelihood_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('frequency','probability','expert_judgement','benchmarking','consensus')),
    frequency_type TEXT NOT NULL CHECK (frequency_type IN ('low_frequency','non_low_frequency')),
    observation_period_months INTEGER NOT NULL CHECK (observation_period_months > 0),
    event_count INTEGER CHECK (event_count >= 0),
    population_count INTEGER CHECK (population_count IS NULL OR population_count > 0),
    calculated_probability NUMERIC(8,4),
    selected_probability_level INTEGER NOT NULL CHECK (selected_probability_level BETWEEN 1 AND 5),
    justification TEXT NOT NULL DEFAULT '',
    data_source TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_likelihood_assessments_risk UNIQUE (risk_id)
);

CREATE INDEX IF NOT EXISTS idx_likelihood_assessments_risk ON likelihood_assessments(risk_id);

-- Add FK column to risks table for quick lookups
ALTER TABLE risks ADD COLUMN IF NOT EXISTS likelihood_assessment_id UUID REFERENCES likelihood_assessments(id);
CREATE INDEX IF NOT EXISTS idx_risks_likelihood_assessment_id ON risks(likelihood_assessment_id);
