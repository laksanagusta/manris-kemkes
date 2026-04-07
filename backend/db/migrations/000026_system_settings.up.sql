-- Create system_settings table for configurable system parameters
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default AI model settings
INSERT INTO system_settings (key, value, description, category) VALUES
    ('ai.model.default', 'gpt-4o-mini', 'Default AI model for all AI features', 'ai'),
    ('ai.model.cause', '', 'AI model for root cause analysis (fishbone). Falls back to default if empty.', 'ai'),
    ('ai.model.impact', '', 'AI model for impact analysis. Falls back to default if empty.', 'ai'),
    ('ai.model.mitigation', '', 'AI model for mitigation recommendations. Falls back to default if empty.', 'ai'),
    ('ai.model.transcript', '', 'AI model for meeting transcript analysis. Falls back to default if empty.', 'ai'),
    ('ai.model.predictive', '', 'AI model for predictive risk scoring. Falls back to default if empty.', 'ai'),
    ('ai.model.minutes', '', 'AI model for meeting minutes generation. Falls back to default if empty.', 'ai'),
    ('ai.model.kri', '', 'AI model for KRI suggestions. Falls back to default if empty.', 'ai'),
    ('ai.model.risk-suggestion', '', 'AI model for risk suggestions. Falls back to default if empty.', 'ai'),
    ('ai.model.incident', '', 'AI model for incident extraction. Falls back to default if empty.', 'ai'),
    ('ai.model.cba', '', 'AI model for Cost-Benefit Analysis. Falls back to default if empty.', 'ai');

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_updated_at();