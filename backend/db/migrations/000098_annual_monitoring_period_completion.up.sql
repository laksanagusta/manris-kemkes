CREATE TABLE annual_monitoring_period_completion (
    organization_id uuid NOT NULL REFERENCES organizations(id),
    monitoring_period_id uuid NOT NULL REFERENCES monitoring_rule_periods(id),
    started_at timestamptz NOT NULL,
    approved_at timestamptz,
    approved_by uuid REFERENCES users(id),
    approval_reason text,
    PRIMARY KEY (organization_id, monitoring_period_id),
    CHECK (
        (approved_at IS NULL AND approved_by IS NULL AND approval_reason IS NULL)
        OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND approval_reason IS NOT NULL
            AND length(btrim(approval_reason)) BETWEEN 1 AND 2000)
    )
);

INSERT INTO annual_monitoring_period_completion (organization_id, monitoring_period_id, started_at)
SELECT p.organization_id, rm.monitoring_period_id, min(rm.created_at)
FROM risk_monitorings rm
JOIN annual_risk_profile_versions p ON p.id = rm.profile_version_id
WHERE rm.transaction_kind = 'monitoring' AND rm.monitoring_period_id IS NOT NULL
GROUP BY p.organization_id, rm.monitoring_period_id;

-- Keep the start recorded even if the first monitoring draft is deleted.
CREATE FUNCTION record_annual_monitoring_period_start() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.transaction_kind = 'monitoring' AND NEW.monitoring_period_id IS NOT NULL THEN
        INSERT INTO annual_monitoring_period_completion (organization_id, monitoring_period_id, started_at)
        SELECT organization_id, NEW.monitoring_period_id, NEW.created_at
        FROM annual_risk_profile_versions WHERE id = NEW.profile_version_id
        ON CONFLICT (organization_id, monitoring_period_id) DO NOTHING;
    END IF;
    RETURN NEW;
END
$$;

CREATE TRIGGER annual_monitoring_period_started
AFTER INSERT ON risk_monitorings
FOR EACH ROW EXECUTE FUNCTION record_annual_monitoring_period_start();

CREATE FUNCTION annual_monitoring_revision_periods(profile_id uuid)
RETURNS TABLE(period_id uuid, label text, ordinal integer, window_closed boolean,
              blocks_revision boolean, approved_at timestamptz, approval_reason text)
LANGUAGE sql STABLE AS $$
    SELECT period.id, period.label, period.ordinal,
           (COALESCE(NULLIF(current_setting('manris.simulated_now', true), '')::timestamptz,
                     statement_timestamp()) AT TIME ZONE 'Asia/Jakarta')::date > period.closes_on,
           progress.approved_at IS NULL AND (
               EXISTS (
                   SELECT 1 FROM annual_monitoring_period_scope(profile.id, period.id) member
                   WHERE NOT EXISTS (
                       SELECT 1 FROM risk_monitorings observation
                       JOIN annual_risk_profile_versions source ON source.id = observation.profile_version_id
                       WHERE source.organization_id = profile.organization_id
                         AND observation.monitoring_period_id = period.id
                         AND observation.version_group_id = member.version_group_id
                         AND observation.transaction_kind = 'monitoring'
                         AND observation.status = 'final' AND observation.superseded_by_monitoring_id IS NULL
                   )
               )
               OR NOT EXISTS (
                   SELECT 1 FROM working_papers paper
                   WHERE paper.org_id = profile.organization_id
                     AND paper.monitoring_period_id = period.id AND paper.status = 'completed'
               )
               OR NOT EXISTS (
                   SELECT 1 FROM evaluations evaluation
                   WHERE evaluation.organization_id = profile.organization_id
                     AND evaluation.monitoring_period_id = period.id AND evaluation.status = 'final'
               )
           ),
           progress.approved_at, progress.approval_reason
    FROM annual_risk_profile_versions profile
    JOIN monitoring_rule_periods period ON period.rule_id = profile.monitoring_rule_id
    JOIN annual_monitoring_period_completion progress
      ON progress.organization_id = profile.organization_id AND progress.monitoring_period_id = period.id
    WHERE profile.id = profile_id
$$;
