ALTER TABLE annual_risk_profile_members
    ADD COLUMN historical_correction boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT annual_historical_correction_reason
        CHECK (NOT historical_correction OR btrim(change_reason) <> '');

CREATE TABLE annual_monitoring_period_locks (
    organization_id uuid NOT NULL REFERENCES organizations(id),
    monitoring_period_id uuid NOT NULL REFERENCES monitoring_rule_periods(id),
    profile_version_id uuid NOT NULL REFERENCES annual_risk_profile_versions(id),
    locked_at timestamptz NOT NULL,
    needs_review boolean NOT NULL DEFAULT false,
    PRIMARY KEY (organization_id, monitoring_period_id)
);

-- Recover the first documented scope without changing the original documents.
WITH finalized_documents AS (
    SELECT org_id AS organization_id, monitoring_period_id, profile_version_id,
           COALESCE(completed_at, updated_at) AS finished_at, completed_at IS NULL AS inferred
    FROM working_papers WHERE status = 'completed' AND monitoring_period_id IS NOT NULL
    UNION ALL
    SELECT organization_id, monitoring_period_id, profile_version_id,
           COALESCE(finalized_at, updated_at), finalized_at IS NULL
    FROM evaluations WHERE status = 'final' AND monitoring_period_id IS NOT NULL
), ranked AS (
    SELECT d.*, p.version,
           first_value(d.profile_version_id) OVER document_order AS first_profile,
           first_value(d.finished_at) OVER document_order AS first_finished
    FROM finalized_documents d
    JOIN annual_risk_profile_versions p ON p.id = d.profile_version_id
    WINDOW document_order AS (PARTITION BY d.organization_id, d.monitoring_period_id
                              ORDER BY d.finished_at, p.version, d.profile_version_id)
)
INSERT INTO annual_monitoring_period_locks
    (organization_id, monitoring_period_id, profile_version_id, locked_at, needs_review)
SELECT organization_id, monitoring_period_id, first_profile, first_finished,
       bool_or(inferred OR first_profile <> profile_version_id)
FROM ranked GROUP BY organization_id, monitoring_period_id, first_profile, first_finished;

CREATE FUNCTION annual_monitoring_period_bounds(period_id uuid)
RETURNS TABLE(starts_on date, ends_on date)
LANGUAGE sql STABLE AS $$
    SELECT (make_date(r.year, 1, 1) + (p.ordinal - 1) * duration.span)::date,
           (make_date(r.year, 1, 1) + p.ordinal * duration.span - interval '1 day')::date
    FROM monitoring_rule_periods p
    JOIN monitoring_rules r ON r.id = p.rule_id
    CROSS JOIN LATERAL (
        SELECT CASE r.frequency WHEN 'monthly' THEN interval '1 month'
               WHEN 'quarterly' THEN interval '3 months' ELSE interval '6 months' END AS span
    ) duration
    WHERE p.id = period_id
$$;

CREATE FUNCTION annual_monitoring_period_freeze(profile_id uuid, period_id uuid)
RETURNS TABLE(locked_at timestamptz, profile_version_id uuid, needs_review boolean)
LANGUAGE sql STABLE AS $$
    SELECT CASE WHEN saved.locked_at IS NOT NULL AND (saved.locked_at < closing.at OR clock.at < closing.at)
                    THEN saved.locked_at ELSE closing.at END,
           CASE WHEN saved.locked_at IS NOT NULL AND (saved.locked_at < closing.at OR clock.at < closing.at)
                    THEN saved.profile_version_id ELSE COALESCE(closed.id, saved.profile_version_id) END,
           COALESCE(saved.needs_review, false) OR
               (saved.locked_at >= closing.at AND saved.profile_version_id IS DISTINCT FROM closed.id) IS TRUE
    FROM annual_risk_profile_versions selected
    JOIN monitoring_rule_periods period ON period.rule_id = selected.monitoring_rule_id
    CROSS JOIN LATERAL (SELECT (period.closes_on + 1)::timestamp AT TIME ZONE 'Asia/Jakarta' AS at) closing
    CROSS JOIN LATERAL (SELECT COALESCE(NULLIF(current_setting('manris.simulated_now', true), '')::timestamptz, statement_timestamp()) AS at) clock
    LEFT JOIN annual_monitoring_period_locks saved
      ON saved.organization_id = selected.organization_id AND saved.monitoring_period_id = period.id
    LEFT JOIN LATERAL (
        SELECT p.id FROM annual_risk_profile_versions p
        WHERE p.organization_id = selected.organization_id AND p.year = selected.year
          AND p.monitoring_rule_id = selected.monitoring_rule_id AND p.finalized_at < closing.at
        ORDER BY p.version DESC LIMIT 1
    ) closed ON clock.at >= closing.at
    WHERE selected.id = profile_id AND period.id = period_id
      AND (saved.locked_at IS NOT NULL OR clock.at >= closing.at)
$$;

CREATE FUNCTION annual_monitoring_period_profile(profile_id uuid, period_id uuid)
RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT p.id
    FROM annual_risk_profile_versions selected
    JOIN monitoring_rule_periods period ON period.rule_id = selected.monitoring_rule_id
    LEFT JOIN LATERAL annual_monitoring_period_freeze(selected.id, period.id) frozen ON true
    LEFT JOIN annual_risk_profile_versions anchor ON anchor.id = frozen.profile_version_id
    JOIN annual_risk_profile_versions p ON p.organization_id = selected.organization_id
      AND p.year = selected.year AND p.monitoring_rule_id = selected.monitoring_rule_id
    WHERE selected.id = profile_id AND period.id = period_id
      AND p.finalized_at IS NOT NULL AND p.version <= selected.version
      AND (frozen.locked_at IS NULL OR p.version <= anchor.version)
    ORDER BY p.version DESC LIMIT 1
$$;

CREATE FUNCTION annual_monitoring_members_as_of(profile_id uuid, cutoff date)
RETURNS TABLE(version_group_id uuid, risk_id uuid, profile_version_id uuid, effective_from date,
              baseline jsonb, objective_id uuid, change_reason text)
LANGUAGE sql STABLE AS $$
    SELECT DISTINCT ON (m.version_group_id)
           m.version_group_id, m.risk_id, p.id, m.effective_from, m.baseline, m.objective_id, m.change_reason
    FROM annual_risk_profile_versions selected
    JOIN annual_risk_profile_versions p
      ON p.organization_id = selected.organization_id AND p.year = selected.year AND p.version <= selected.version
    JOIN annual_risk_profile_members m ON m.profile_version_id = p.id
    WHERE selected.id = profile_id AND p.finalized_at IS NOT NULL AND m.effective_from <= cutoff
    ORDER BY m.version_group_id, p.version DESC
$$;

CREATE FUNCTION annual_monitoring_period_scope(profile_id uuid, period_id uuid)
RETURNS TABLE(version_group_id uuid, risk_id uuid, profile_version_id uuid, effective_from date,
              baseline jsonb, objective_id uuid, change_reason text)
LANGUAGE sql STABLE AS $$
    SELECT member.*
    FROM annual_monitoring_period_bounds(period_id) bounds
    CROSS JOIN LATERAL annual_monitoring_members_as_of(
        annual_monitoring_period_profile(profile_id, period_id), bounds.ends_on
    ) member
$$;

CREATE FUNCTION lock_annual_monitoring_scope_on_finalization() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE doc jsonb := to_jsonb(NEW); old_status text;
        profile uuid; period uuid; org uuid; latest uuid; anchor uuid;
BEGIN
    period := (doc->>'monitoring_period_id')::uuid;
    IF period IS NULL OR doc->>'status' NOT IN ('completed', 'final') THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' THEN
        old_status := to_jsonb(OLD)->>'status';
        IF old_status = doc->>'status' THEN RETURN NEW; END IF;
    END IF;
    profile := (doc->>'profile_version_id')::uuid;
    org := COALESCE((doc->>'org_id')::uuid, (doc->>'organization_id')::uuid);
    PERFORM id FROM organizations WHERE id = org FOR NO KEY UPDATE;
    SELECT p.id INTO latest FROM annual_risk_profile_versions selected
    JOIN annual_risk_profile_versions p ON p.organization_id = selected.organization_id AND p.year = selected.year
    WHERE selected.id = profile AND p.finalized_at IS NOT NULL ORDER BY p.version DESC LIMIT 1;

    anchor := annual_monitoring_period_profile(latest, period);
    IF anchor IS NULL THEN RETURN NEW; END IF;
    IF profile <> anchor AND EXISTS (
        SELECT 1 FROM annual_monitoring_period_scope(latest, period) proposed
        FULL JOIN annual_monitoring_period_scope(profile, period) original USING (version_group_id)
        WHERE (proposed.risk_id, proposed.effective_from, proposed.baseline, proposed.objective_id)
           IS DISTINCT FROM (original.risk_id, original.effective_from, original.baseline, original.objective_id)
    ) THEN
        RAISE EXCEPTION 'Cakupan periode berubah. Gunakan dokumen dari profil yang berlaku untuk periode ini.' USING ERRCODE = '23514';
    END IF;
    INSERT INTO annual_monitoring_period_locks (organization_id, monitoring_period_id, profile_version_id, locked_at)
    VALUES (org, period, anchor, COALESCE(NULLIF(current_setting('manris.simulated_now', true), '')::timestamptz, clock_timestamp()))
    ON CONFLICT (organization_id, monitoring_period_id) DO NOTHING;
    RETURN NEW;
END $$;

CREATE TRIGGER working_paper_scope_finalization
    BEFORE INSERT OR UPDATE OF status ON working_papers
    FOR EACH ROW EXECUTE FUNCTION lock_annual_monitoring_scope_on_finalization();
CREATE TRIGGER evaluation_scope_finalization
    BEFORE INSERT OR UPDATE OF status ON evaluations
    FOR EACH ROW EXECUTE FUNCTION lock_annual_monitoring_scope_on_finalization();

-- Mark pre-existing observations that cannot be reconciled with the locked roster.
UPDATE annual_monitoring_period_locks l SET needs_review = true
WHERE EXISTS (
    SELECT 1 FROM risk_monitorings rm
    JOIN annual_risk_profile_versions p ON p.id = rm.profile_version_id
    WHERE rm.monitoring_period_id = l.monitoring_period_id AND p.organization_id = l.organization_id
      AND rm.status = 'final' AND rm.transaction_kind = 'monitoring'
      AND NOT EXISTS (
          SELECT 1 FROM annual_monitoring_members_as_of(l.profile_version_id, rm.observed_at) m
          WHERE m.version_group_id = rm.version_group_id
      )
);

CREATE OR REPLACE FUNCTION guard_configured_monitoring_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org uuid; rule uuid; family uuid; p uuid; period uuid; document jsonb; old_document jsonb; root_profile uuid; latest_profile uuid; period_profile uuid; effective_risk uuid;
BEGIN
 IF TG_TABLE_NAME='risk_monitorings' AND COALESCE((CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'transaction_kind','monitoring')<>'monitoring' THEN
  IF TG_OP<>'INSERT' AND to_jsonb(OLD)->>'status'='final' THEN RAISE EXCEPTION 'Transaksi final tidak dapat diubah.' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND (to_jsonb(OLD)->>'transaction_kind') IS DISTINCT FROM (to_jsonb(NEW)->>'transaction_kind') THEN RAISE EXCEPTION 'Jenis transaksi tidak dapat diganti.' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW.profile_version_id IS NOT NULL OR NEW.monitoring_period_id IS NOT NULL THEN RAISE EXCEPTION 'Revisi tidak memakai slot pemantauan berkala.' USING ERRCODE='23514'; END IF;
  IF NEW.transaction_kind='revision' AND TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM risks WHERE id=NEW.source_risk_id AND is_current AND status='final' AND archived_at IS NULL) THEN RAISE EXCEPTION 'Revisi hanya dari profil aktif.' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN document:=to_jsonb(OLD); ELSE document:=to_jsonb(NEW); END IF;
 p := (document->>'profile_version_id')::uuid; period:=(document->>'monitoring_period_id')::uuid;
 IF TG_TABLE_NAME='risk_monitorings' THEN
  SELECT organization_id,version_group_id INTO org,family FROM risks WHERE id=(document->>'source_risk_id')::uuid;
 ELSE org:=COALESCE((document->>'org_id')::uuid,(document->>'organization_id')::uuid); END IF;
 IF TG_OP='UPDATE' THEN
  old_document:=to_jsonb(OLD);
  IF (old_document->>'profile_version_id') IS DISTINCT FROM (document->>'profile_version_id') OR (old_document->>'monitoring_period_id') IS DISTINCT FROM (document->>'monitoring_period_id') THEN
   RAISE EXCEPTION 'Konteks profil dan periode dokumen tidak dapat diganti.' USING ERRCODE='23514';
  END IF;
 END IF;
 IF p IS NOT NULL THEN SELECT monitoring_rule_id INTO rule FROM annual_risk_profile_versions WHERE id=p; END IF;
 IF p IS NOT NULL AND NOT EXISTS(SELECT 1 FROM annual_risk_profile_versions WHERE id=p AND organization_id=org) THEN RAISE EXCEPTION 'Profil tidak termasuk organisasi dokumen.' USING ERRCODE='23514'; END IF;
 IF p IS NULL OR rule IS NULL THEN
  IF period IS NOT NULL THEN RAISE EXCEPTION 'Pilih profil dengan aturan pemantauan.' USING ERRCODE='23514'; END IF;
  -- Existing legacy rows remain editable. New calls must choose explicit context
  -- when the risk family / organization already has a configured profile.
  IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM annual_risk_profile_versions ap WHERE ap.organization_id=org AND ap.monitoring_rule_id IS NOT NULL
    AND ((TG_TABLE_NAME='risk_monitorings' AND EXISTS(SELECT 1 FROM annual_risk_profile_members m WHERE m.profile_version_id=ap.id AND m.version_group_id=family))
     OR (TG_TABLE_NAME<>'risk_monitorings' AND ap.year=LEFT(COALESCE(document->>'assessment_cycle',document->>'period'),4)::int))) THEN
   RAISE EXCEPTION 'Buka profil tahunan dan pilih periode pemantauan sebelum membuat dokumen.' USING ERRCODE='23514';
  END IF;
 ELSE
  IF TG_OP='INSERT' THEN
   PERFORM id FROM organizations WHERE id=org FOR NO KEY UPDATE;
   SELECT newer.id INTO latest_profile
   FROM annual_risk_profile_versions selected
   JOIN annual_risk_profile_versions newer ON newer.organization_id=selected.organization_id AND newer.year=selected.year
   WHERE selected.id=p AND newer.finalized_at IS NOT NULL ORDER BY newer.version DESC LIMIT 1;
   period_profile := annual_monitoring_period_profile(latest_profile, period);
   IF period_profile IS NULL OR (p <> latest_profile AND p <> period_profile) THEN
    RAISE EXCEPTION 'Pilih profil final yang berlaku untuk periode pemantauan.' USING ERRCODE='23514';
   END IF;
   -- Only a final selected profile is eligible for period actions.
   PERFORM assert_monitoring_period_open(p,period,org);
   p := period_profile;
   NEW.profile_version_id := p;
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND (old_document->>'status' IN ('final','completed') OR (TG_OP='DELETE' AND document->>'status' IN ('final','completed'))) THEN
   IF NOT (TG_TABLE_NAME='risk_monitorings' AND TG_OP='UPDATE' AND old_document->'evidence_snapshot'='null'::jsonb AND document->'evidence_snapshot'<>'null'::jsonb AND (old_document-'evidence_snapshot'-'mitigation_completion_percent')=(document-'evidence_snapshot'-'mitigation_completion_percent')) THEN RAISE EXCEPTION 'Dokumen yang sudah final tidak dapat diubah atau dihapus.' USING ERRCODE='23514'; END IF;
  END IF;
  PERFORM assert_monitoring_period_open(p,period,org);
  WITH RECURSIVE lineage AS (SELECT id,previous_version_id FROM annual_risk_profile_versions WHERE id=p UNION ALL SELECT ap.id,ap.previous_version_id FROM annual_risk_profile_versions ap JOIN lineage l ON ap.id=l.previous_version_id) SELECT id INTO root_profile FROM lineage WHERE previous_version_id IS NULL;
  IF TG_OP<>'DELETE' THEN NEW.monitoring_profile_id:=root_profile; END IF;
  IF TG_TABLE_NAME='risk_monitorings' THEN
   SELECT m.risk_id INTO effective_risk
   FROM annual_monitoring_members_as_of(p, (document->>'observed_at')::date) m
   WHERE m.version_group_id=family;
   IF (document->>'version_group_id')::uuid IS DISTINCT FROM family
      OR effective_risk IS NULL
      OR (TG_OP='INSERT' AND effective_risk IS DISTINCT FROM (document->>'source_risk_id')::uuid) THEN
    RAISE EXCEPTION 'Versi risiko tidak berlaku pada tanggal pengamatan di periode ini.' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
