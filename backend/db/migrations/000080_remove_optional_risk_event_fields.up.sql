BEGIN;
ALTER TABLE incidents
    DROP COLUMN actual_impact,
    DROP COLUMN immediate_response,
    DROP COLUMN post_response_condition,
    DROP COLUMN "where",
    DROP COLUMN who,
    DROP COLUMN why_how,
    DROP COLUMN disruption_duration,
    DROP COLUMN extraordinary_reason,
    DROP COLUMN ongoing_action,
    DROP COLUMN evidence_url;
COMMIT;
