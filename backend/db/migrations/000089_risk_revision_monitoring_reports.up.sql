ALTER TABLE risk_monitorings ADD COLUMN transaction_kind text NOT NULL DEFAULT 'monitoring' CHECK(transaction_kind IN ('initial','monitoring','revision'));
-- Existing observations keep their historical period semantics; explicit revisions start after this migration.
CREATE UNIQUE INDEX risk_revision_open_draft ON risk_monitorings(version_group_id) WHERE transaction_kind='revision' AND status='draft';
DROP INDEX idx_mitigation_tasks_unique_period;
CREATE UNIQUE INDEX idx_mitigation_tasks_unique_period ON mitigation_tasks(mitigation_id,period_start,period_end) WHERE monitoring_id IS NULL;
CREATE UNIQUE INDEX mitigation_monitoring_report_unique ON mitigation_tasks(monitoring_id,mitigation_id) WHERE monitoring_id IS NOT NULL;
ALTER TABLE mitigations ADD COLUMN plan_identity_id uuid NOT NULL DEFAULT gen_random_uuid();

-- Provision missing items on existing drafts, including unfinished windows
-- which have already closed. This only inserts empty items and leaves all
-- existing report data intact.
ALTER TABLE mitigation_tasks DISABLE TRIGGER mitigation_task_period_guard;
INSERT INTO mitigation_tasks(mitigation_id,risk_id,monitoring_id,period_label,period_start,period_end,due_date,status,generated_by)
SELECT m.id,m.risk_id,rm.id,rm.assessment_cycle,b.starts_on,b.ends_on,
       COALESCE(rp.closes_on,m.due_date,b.ends_on),'pending','manual'
FROM risk_monitorings rm
JOIN mitigations m ON m.risk_id=rm.source_risk_id
LEFT JOIN monitoring_rule_periods rp ON rp.id=rm.monitoring_period_id
LEFT JOIN monitoring_rules rules ON rules.id=rp.rule_id
CROSS JOIN LATERAL (SELECT
  CASE WHEN rp.id IS NULL THEN date_trunc('quarter',rm.observed_at)
       ELSE make_date(rules.year,1,1)+(rp.ordinal-1)*CASE rules.frequency
         WHEN 'monthly' THEN interval '1 month' WHEN 'quarterly' THEN interval '3 months' ELSE interval '6 months' END END AS start_at,
  CASE rules.frequency WHEN 'monthly' THEN interval '1 month'
       WHEN 'semester' THEN interval '6 months' ELSE interval '3 months' END AS duration
) coverage
CROSS JOIN LATERAL (SELECT coverage.start_at::date AS starts_on,
  (coverage.start_at+coverage.duration-interval '1 day')::date AS ends_on) b
WHERE rm.status='draft'
ON CONFLICT(monitoring_id,mitigation_id) WHERE monitoring_id IS NOT NULL DO NOTHING;
ALTER TABLE mitigation_tasks ENABLE TRIGGER mitigation_task_period_guard;

CREATE OR REPLACE FUNCTION guard_configured_monitoring_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org uuid; rule uuid; family uuid; p uuid; period uuid; document jsonb; old_document jsonb; root_profile uuid;
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
  IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM annual_risk_profile_versions selected JOIN annual_risk_profile_versions newer ON newer.organization_id=selected.organization_id AND newer.year=selected.year AND newer.version>selected.version AND newer.finalized_at IS NOT NULL WHERE selected.id=p) THEN RAISE EXCEPTION 'Pilih versi profil final terbaru untuk membuat dokumen.' USING ERRCODE='23514'; END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND (old_document->>'status' IN ('final','completed') OR (TG_OP='DELETE' AND document->>'status' IN ('final','completed'))) THEN
   IF NOT (TG_TABLE_NAME='risk_monitorings' AND TG_OP='UPDATE' AND old_document->'evidence_snapshot'='null'::jsonb AND document->'evidence_snapshot'<>'null'::jsonb AND (old_document-'evidence_snapshot'-'mitigation_completion_percent')=(document-'evidence_snapshot'-'mitigation_completion_percent')) THEN RAISE EXCEPTION 'Dokumen yang sudah final tidak dapat diubah atau dihapus.' USING ERRCODE='23514'; END IF;
  END IF;
  PERFORM assert_monitoring_period_open(p,period,org);
  WITH RECURSIVE lineage AS (SELECT id,previous_version_id FROM annual_risk_profile_versions WHERE id=p UNION ALL SELECT ap.id,ap.previous_version_id FROM annual_risk_profile_versions ap JOIN lineage l ON ap.id=l.previous_version_id) SELECT id INTO root_profile FROM lineage WHERE previous_version_id IS NULL;
  IF TG_OP<>'DELETE' THEN NEW.monitoring_profile_id:=root_profile; END IF;
  IF TG_TABLE_NAME='risk_monitorings' AND ((document->>'version_group_id')::uuid IS DISTINCT FROM family OR (TG_OP='UPDATE' AND (document->>'version_group_id') IS DISTINCT FROM (old_document->>'version_group_id')) OR NOT EXISTS(SELECT 1 FROM annual_risk_profile_members WHERE profile_version_id=p AND version_group_id=family AND effective_from<=(document->>'observed_at')::date)) THEN
   RAISE EXCEPTION 'Risiko tidak terdaftar dalam profil terpilih.' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION require_complete_monitoring_reports() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.transaction_kind='monitoring' AND NEW.status='final' AND OLD.status='draft' THEN
 IF EXISTS(SELECT 1 FROM mitigations m WHERE m.risk_id=NEW.source_risk_id AND NOT EXISTS(SELECT 1 FROM mitigation_tasks t WHERE t.monitoring_id=NEW.id AND t.mitigation_id=m.id AND t.status IN ('pending','done','skipped') AND t.reported_at IS NOT NULL AND length(btrim(COALESCE(t.notes,'')))>=10)) THEN
 RAISE EXCEPTION 'Lengkapi laporan setiap mitigasi sebelum finalisasi.' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER monitoring_report_completeness BEFORE UPDATE ON risk_monitorings FOR EACH ROW EXECUTE FUNCTION require_complete_monitoring_reports();

CREATE FUNCTION guard_risk_transaction_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.transaction_kind IS DISTINCT FROM OLD.transaction_kind OR NEW.source_risk_id IS DISTINCT FROM OLD.source_risk_id OR NEW.version_group_id IS DISTINCT FROM OLD.version_group_id) THEN RAISE EXCEPTION 'Identitas transaksi tidak dapat diganti.' USING ERRCODE='23514'; END IF;
 IF TG_OP<>'INSERT' AND OLD.status='final' THEN
  IF TG_OP='UPDATE' AND OLD.evidence_snapshot IS NULL AND NEW.evidence_snapshot IS NOT NULL AND (to_jsonb(OLD)-'evidence_snapshot'-'mitigation_completion_percent')=(to_jsonb(NEW)-'evidence_snapshot'-'mitigation_completion_percent') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Transaksi final tidak dapat diubah.' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE TRIGGER risk_transaction_identity BEFORE UPDATE OR DELETE ON risk_monitorings FOR EACH ROW EXECUTE FUNCTION guard_risk_transaction_identity();

CREATE FUNCTION guard_report_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent uuid; state text; kind text;
BEGIN
 IF TG_OP='UPDATE' AND OLD.monitoring_id IS DISTINCT FROM NEW.monitoring_id THEN RAISE EXCEPTION 'Laporan tidak dapat dipindah ke transaksi lain.' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN parent:=OLD.monitoring_id; ELSE parent:=NEW.monitoring_id; END IF;
 IF parent IS NOT NULL THEN
 SELECT status,transaction_kind INTO state,kind FROM risk_monitorings WHERE id=parent FOR SHARE;
 IF state='final' OR kind<>'monitoring' THEN RAISE EXCEPTION 'Pelaporan hanya pada draf pemantauan.' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE TRIGGER mitigation_report_transaction BEFORE INSERT OR UPDATE OR DELETE ON mitigation_tasks FOR EACH ROW EXECUTE FUNCTION guard_report_transaction();

CREATE FUNCTION log_initial_risk_assessment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE observed date;cycle text;
BEGIN
 IF NEW.status<>'final' OR NEW.previous_risk_id IS NOT NULL OR NEW.version_number<>1 OR NEW.probability NOT BETWEEN 1 AND 5 OR NEW.impact NOT BETWEEN 1 AND 5 THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.status='final' THEN RETURN NEW; END IF;
 observed:=COALESCE(NEW.effective_from,(NEW.finalized_at AT TIME ZONE 'Asia/Jakarta')::date,(NEW.created_at AT TIME ZONE 'Asia/Jakarta')::date);
 cycle:=to_char(observed,'YYYY')||'-Q'||EXTRACT(QUARTER FROM observed)::int;
 INSERT INTO risk_monitorings(source_risk_id,result_risk_id,version_group_id,assessment_cycle,status,mode,transaction_kind,source_probability,source_impact,source_weight,source_nilai,source_version_number,observed_probability,observed_impact,observed_weight,observed_nilai,observed_at,finalized_by,finalized_at,draft_payload)
 VALUES(NEW.id,NEW.id,NEW.version_group_id,cycle,'final','score_only','initial',NEW.probability,NEW.impact,COALESCE(NEW.weight,1),COALESCE(NEW.nilai,0),1,NEW.probability,NEW.impact,COALESCE(NEW.weight,1),COALESCE(NEW.nilai,0),observed,NEW.finalized_by,COALESCE(NEW.finalized_at,clock_timestamp()),jsonb_build_object('observedScoreConfirmed',true))
 ON CONFLICT(source_risk_id) WHERE transaction_kind='initial' DO NOTHING;
 RETURN NEW;
END $$;
CREATE UNIQUE INDEX risk_initial_assessment_once ON risk_monitorings(source_risk_id) WHERE transaction_kind='initial';
CREATE TRIGGER risk_initial_assessment AFTER INSERT OR UPDATE OF status ON risks FOR EACH ROW EXECUTE FUNCTION log_initial_risk_assessment();
