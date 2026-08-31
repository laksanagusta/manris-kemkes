-- Remove the retired mitigation field and AI model setting.
ALTER TABLE mitigations
    DROP COLUMN IF EXISTS cost_benefit_note;

DELETE FROM system_settings
WHERE key = 'ai.model.cba';
