DROP TRIGGER risk_initial_assessment ON risks;
DROP FUNCTION log_initial_risk_assessment();
DROP INDEX risk_initial_assessment_once;
DROP TRIGGER mitigation_report_transaction ON mitigation_tasks;
DROP FUNCTION guard_report_transaction();
DROP TRIGGER risk_transaction_identity ON risk_monitorings;
DROP FUNCTION guard_risk_transaction_identity();
-- Reverting changes after revised transactions exist would erase their semantics.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM risk_monitorings WHERE transaction_kind<>'monitoring') THEN RAISE EXCEPTION 'Rollback requires an explicit data migration for revision history.'; END IF; END $$;
DROP TRIGGER monitoring_report_completeness ON risk_monitorings;
DROP FUNCTION require_complete_monitoring_reports();
DROP INDEX risk_revision_open_draft;
DROP INDEX mitigation_monitoring_report_unique;
DROP INDEX idx_mitigation_tasks_unique_period;
CREATE UNIQUE INDEX idx_mitigation_tasks_unique_period ON mitigation_tasks(mitigation_id,period_start,period_end);
ALTER TABLE mitigations DROP COLUMN plan_identity_id;
CREATE OR REPLACE FUNCTION guard_configured_monitoring_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org uuid; rule uuid; family uuid; p uuid; period uuid; document jsonb; old_document jsonb; root_profile uuid;
BEGIN
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
ALTER TABLE risk_monitorings DROP COLUMN transaction_kind;
