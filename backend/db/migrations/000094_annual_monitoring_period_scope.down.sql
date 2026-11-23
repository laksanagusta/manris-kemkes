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

DROP TRIGGER evaluation_scope_finalization ON evaluations;
DROP TRIGGER working_paper_scope_finalization ON working_papers;
DROP FUNCTION lock_annual_monitoring_scope_on_finalization();
DROP FUNCTION annual_monitoring_period_scope(uuid, uuid);
DROP FUNCTION annual_monitoring_members_as_of(uuid, date);
DROP FUNCTION annual_monitoring_period_profile(uuid, uuid);
DROP FUNCTION annual_monitoring_period_freeze(uuid, uuid);
DROP FUNCTION annual_monitoring_period_bounds(uuid);
DROP TABLE annual_monitoring_period_locks;
ALTER TABLE annual_risk_profile_members DROP COLUMN historical_correction;
