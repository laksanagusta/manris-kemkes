-- New profiles opt into a fixed named schedule. Legacy documents remain unlinked.
CREATE TABLE monitoring_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
 year integer NOT NULL CHECK (year BETWEEN 1900 AND 9998),
 frequency text NOT NULL CHECK (frequency IN ('monthly','quarterly','semester')),
 active boolean NOT NULL DEFAULT true,
 created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE monitoring_rule_periods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 rule_id uuid NOT NULL REFERENCES monitoring_rules(id) ON DELETE CASCADE,
 label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 160),
 ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 12),
 opens_on date NOT NULL,
 closes_on date NOT NULL CHECK (closes_on >= opens_on),
 UNIQUE(rule_id,ordinal)
);
ALTER TABLE annual_risk_profile_versions ADD COLUMN monitoring_rule_id uuid REFERENCES monitoring_rules(id);
ALTER TABLE risk_monitorings ADD COLUMN monitoring_profile_id uuid REFERENCES annual_risk_profile_versions(id), ADD COLUMN profile_version_id uuid REFERENCES annual_risk_profile_versions(id), ADD COLUMN monitoring_period_id uuid REFERENCES monitoring_rule_periods(id),
 ADD CONSTRAINT monitoring_profile_period_pair CHECK ((profile_version_id IS NULL)=(monitoring_period_id IS NULL));
ALTER TABLE working_papers ADD COLUMN monitoring_profile_id uuid REFERENCES annual_risk_profile_versions(id), ADD COLUMN monitoring_period_id uuid REFERENCES monitoring_rule_periods(id);
ALTER TABLE evaluations ADD COLUMN monitoring_profile_id uuid REFERENCES annual_risk_profile_versions(id), ADD COLUMN profile_version_id uuid REFERENCES annual_risk_profile_versions(id), ADD COLUMN monitoring_period_id uuid REFERENCES monitoring_rule_periods(id),
 ADD CONSTRAINT evaluation_profile_period_pair CHECK (profile_version_id IS NOT NULL OR monitoring_period_id IS NULL);
CREATE UNIQUE INDEX risk_monitorings_profile_period_family ON risk_monitorings(monitoring_profile_id,monitoring_period_id,version_group_id) WHERE profile_version_id IS NOT NULL;
CREATE UNIQUE INDEX working_papers_profile_period ON working_papers(monitoring_profile_id,monitoring_period_id) WHERE monitoring_period_id IS NOT NULL AND status<>'cancelled';
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_organization_id_period_template_id_key;
CREATE UNIQUE INDEX evaluations_legacy_org_period_template ON evaluations(organization_id,period,template_id) WHERE monitoring_period_id IS NULL;
CREATE UNIQUE INDEX evaluations_profile_period ON evaluations(monitoring_profile_id,monitoring_period_id) WHERE profile_version_id IS NOT NULL;
-- Configured periods replace the legacy cutoff uniqueness rule only for new rows.
DROP INDEX working_papers_active_profile_cutoff;
CREATE UNIQUE INDEX working_papers_active_profile_cutoff ON working_papers(profile_version_id,observation_cutoff) WHERE profile_version_id IS NOT NULL AND monitoring_period_id IS NULL AND status<>'cancelled';

CREATE FUNCTION validate_monitoring_rule() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid uuid; expected integer; ry integer; actual integer;
BEGIN
 rid := CASE WHEN TG_TABLE_NAME='monitoring_rules' THEN (to_jsonb(NEW)->>'id')::uuid ELSE COALESCE((to_jsonb(NEW)->>'rule_id')::uuid,(to_jsonb(OLD)->>'rule_id')::uuid) END;
 SELECT CASE frequency WHEN 'monthly' THEN 12 WHEN 'quarterly' THEN 4 ELSE 2 END,year INTO expected,ry FROM monitoring_rules WHERE id=rid;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT count(*) INTO actual FROM monitoring_rule_periods WHERE rule_id=rid;
 IF actual<>expected OR EXISTS(SELECT 1 FROM monitoring_rule_periods WHERE rule_id=rid AND (ordinal>expected OR opens_on<make_date(ry,1,1) OR closes_on>=make_date(ry+2,1,1))) OR EXISTS(
  SELECT 1 FROM monitoring_rule_periods a JOIN monitoring_rule_periods b ON b.rule_id=a.rule_id AND b.ordinal>a.ordinal
  WHERE a.rule_id=rid AND a.closes_on>=b.opens_on
 ) THEN RAISE EXCEPTION 'Jumlah, urutan, atau rentang periode aturan pemantauan tidak valid.' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER monitoring_rule_complete AFTER INSERT OR UPDATE ON monitoring_rules DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_monitoring_rule();
CREATE CONSTRAINT TRIGGER monitoring_periods_complete AFTER INSERT OR UPDATE OR DELETE ON monitoring_rule_periods DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_monitoring_rule();

CREATE FUNCTION protect_selected_monitoring_rule() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid uuid;
BEGIN
 rid := CASE WHEN TG_TABLE_NAME='monitoring_rules' THEN (to_jsonb(OLD)->>'id')::uuid ELSE (to_jsonb(OLD)->>'rule_id')::uuid END;
 -- Serialize selection and editing to close the race between them.
 PERFORM id FROM monitoring_rules WHERE id=rid FOR UPDATE;
 IF TG_TABLE_NAME='monitoring_rule_periods' AND TG_OP='UPDATE' AND (to_jsonb(NEW)->>'rule_id') IS DISTINCT FROM (to_jsonb(OLD)->>'rule_id') THEN RAISE EXCEPTION 'Aturan induk periode tidak dapat diganti.' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM annual_risk_profile_versions WHERE monitoring_rule_id=rid) THEN
  IF TG_TABLE_NAME='monitoring_rules' AND TG_OP='UPDATE' AND (to_jsonb(NEW)-'active')=(to_jsonb(OLD)-'active') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Aturan yang sudah dipilih profil tidak dapat diubah atau dihapus.' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER monitoring_rule_immutable BEFORE UPDATE OR DELETE ON monitoring_rules FOR EACH ROW EXECUTE FUNCTION protect_selected_monitoring_rule();
CREATE TRIGGER monitoring_period_immutable BEFORE UPDATE OR DELETE ON monitoring_rule_periods FOR EACH ROW EXECUTE FUNCTION protect_selected_monitoring_rule();
CREATE FUNCTION guard_profile_monitoring_rule() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ry integer; enabled boolean; previous_rule uuid; prior_org uuid; prior_year integer; prior_version integer; prior_final timestamptz;
BEGIN
 IF TG_OP='UPDATE' AND NEW.monitoring_rule_id IS DISTINCT FROM OLD.monitoring_rule_id THEN
  RAISE EXCEPTION 'Aturan pemantauan profil tidak dapat diganti.' USING ERRCODE='23514';
 END IF;
 IF NEW.monitoring_rule_id IS NOT NULL THEN
  IF TG_OP='UPDATE' AND (NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.year IS DISTINCT FROM OLD.year OR NEW.version IS DISTINCT FROM OLD.version OR NEW.previous_version_id IS DISTINCT FROM OLD.previous_version_id) THEN RAISE EXCEPTION 'Identitas dan riwayat versi profil tidak dapat diganti.' USING ERRCODE='23514'; END IF;
  IF TG_OP='INSERT' AND NEW.previous_version_id IS NULL AND EXISTS(SELECT 1 FROM annual_risk_profile_versions WHERE organization_id=NEW.organization_id AND year=NEW.year) THEN RAISE EXCEPTION 'Profil tahun ini sudah ada. Buat revisi dari profil sebelumnya.' USING ERRCODE='23514'; END IF;
  SELECT year,active INTO ry,enabled FROM monitoring_rules WHERE id=NEW.monitoring_rule_id FOR SHARE;
  IF ry IS DISTINCT FROM NEW.year OR (TG_OP='INSERT' AND NEW.previous_version_id IS NULL AND NOT enabled) THEN
   RAISE EXCEPTION 'Pilih aturan aktif untuk tahun profil ini.' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP='INSERT' AND NEW.previous_version_id IS NOT NULL THEN
  SELECT monitoring_rule_id,organization_id,year,version,finalized_at INTO previous_rule,prior_org,prior_year,prior_version,prior_final FROM annual_risk_profile_versions WHERE id=NEW.previous_version_id;
  IF NEW.monitoring_rule_id IS NOT NULL AND (prior_org IS DISTINCT FROM NEW.organization_id OR prior_year IS DISTINCT FROM NEW.year OR prior_final IS NULL OR NEW.version<>prior_version+1) THEN RAISE EXCEPTION 'Revisi harus meneruskan profil final dari organisasi dan tahun yang sama.' USING ERRCODE='23514'; END IF;
  IF previous_rule IS DISTINCT FROM NEW.monitoring_rule_id THEN RAISE EXCEPTION 'Revisi wajib menggunakan aturan profil sebelumnya.' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER profile_monitoring_rule_guard BEFORE INSERT OR UPDATE ON annual_risk_profile_versions FOR EACH ROW EXECUTE FUNCTION guard_profile_monitoring_rule();

CREATE FUNCTION assert_monitoring_period_open(pid uuid, period_id uuid, org uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE rule uuid; p_org uuid; final_at timestamptz; opens date; closes date; today date;
BEGIN
 IF pid IS NULL AND period_id IS NULL THEN RETURN; END IF;
 SELECT monitoring_rule_id,organization_id,finalized_at INTO rule,p_org,final_at FROM annual_risk_profile_versions WHERE id=pid;
 IF p_org IS DISTINCT FROM org OR rule IS NULL OR period_id IS NULL OR final_at IS NULL THEN
  RAISE EXCEPTION 'Pilih profil final dan periode pemantauan dari organisasi yang sama.' USING ERRCODE='23514';
 END IF;
 SELECT opens_on,closes_on INTO opens,closes FROM monitoring_rule_periods WHERE id=period_id AND rule_id=rule;
 IF NOT FOUND THEN RAISE EXCEPTION 'Periode tidak termasuk aturan profil.' USING ERRCODE='23514'; END IF;
 today := (COALESCE(NULLIF(current_setting('manris.simulated_now',true),'')::timestamptz,clock_timestamp()) AT TIME ZONE 'Asia/Jakarta')::date;
 IF today<opens OR today>closes THEN RAISE EXCEPTION 'Pengisian periode pemantauan belum dibuka atau sudah ditutup.' USING ERRCODE='23514'; END IF;
END $$;

CREATE FUNCTION guard_configured_monitoring_document() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER monitoring_document_period_guard BEFORE INSERT OR UPDATE OR DELETE ON risk_monitorings FOR EACH ROW EXECUTE FUNCTION guard_configured_monitoring_document();
CREATE TRIGGER working_paper_period_guard BEFORE INSERT OR UPDATE OR DELETE ON working_papers FOR EACH ROW EXECUTE FUNCTION guard_configured_monitoring_document();
CREATE TRIGGER evaluation_period_guard BEFORE INSERT OR UPDATE OR DELETE ON evaluations FOR EACH ROW EXECUTE FUNCTION guard_configured_monitoring_document();

-- Child writes (including signing and direct agent SQL) obey the parent window.
CREATE FUNCTION guard_monitoring_period_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE document jsonb; parent uuid; pid uuid; period uuid; org uuid; state text;
BEGIN
 IF TG_OP='DELETE' THEN document:=to_jsonb(OLD); ELSE document:=to_jsonb(NEW); END IF;
 IF TG_OP='UPDATE' AND (
  (to_jsonb(OLD)->>'working_paper_id') IS DISTINCT FROM (document->>'working_paper_id')
  OR (to_jsonb(OLD)->>'evaluation_id') IS DISTINCT FROM (document->>'evaluation_id')
  OR (to_jsonb(OLD)->>'section_id') IS DISTINCT FROM (document->>'section_id')
  OR ((to_jsonb(OLD)->>'monitoring_id') IS NOT NULL AND (to_jsonb(OLD)->>'monitoring_id') IS DISTINCT FROM (document->>'monitoring_id') AND EXISTS(SELECT 1 FROM risk_monitorings WHERE id=(to_jsonb(OLD)->>'monitoring_id')::uuid))
 ) THEN RAISE EXCEPTION 'Dokumen induk tidak dapat diganti.' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME IN ('working_paper_signatories','working_paper_risks','working_paper_risk_exclusions') THEN
  parent:=(document->>'working_paper_id')::uuid;
  SELECT profile_version_id,monitoring_period_id,org_id,status INTO pid,period,org,state FROM working_papers WHERE id=parent FOR SHARE;
 ELSIF TG_TABLE_NAME IN ('evaluation_sections','evaluation_items') THEN
  IF TG_TABLE_NAME='evaluation_items' THEN SELECT evaluation_id INTO parent FROM evaluation_sections WHERE id=(document->>'section_id')::uuid;
  ELSE parent:=(document->>'evaluation_id')::uuid; END IF;
  SELECT profile_version_id,monitoring_period_id,organization_id,status INTO pid,period,org,state FROM evaluations WHERE id=parent FOR SHARE;
 ELSE
  parent:=(document->>'monitoring_id')::uuid;
  SELECT rm.profile_version_id,rm.monitoring_period_id,r.organization_id,rm.status INTO pid,period,org,state FROM risk_monitorings rm JOIN risks r ON r.id=rm.source_risk_id WHERE rm.id=parent FOR SHARE OF rm;
 END IF;
 IF period IS NOT NULL THEN
  IF state IN ('final','completed') THEN RAISE EXCEPTION 'Isi dokumen yang sudah final tidak dapat diubah.' USING ERRCODE='23514'; END IF;
  PERFORM assert_monitoring_period_open(pid,period,org);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER wp_signatory_period_guard BEFORE INSERT OR UPDATE OR DELETE ON working_paper_signatories FOR EACH ROW EXECUTE FUNCTION guard_monitoring_period_child();
CREATE TRIGGER wp_risk_period_guard BEFORE INSERT OR UPDATE OR DELETE ON working_paper_risks FOR EACH ROW EXECUTE FUNCTION guard_monitoring_period_child();
CREATE TRIGGER wp_exclusion_period_guard BEFORE INSERT OR UPDATE OR DELETE ON working_paper_risk_exclusions FOR EACH ROW EXECUTE FUNCTION guard_monitoring_period_child();
CREATE TRIGGER evaluation_section_period_guard BEFORE INSERT OR UPDATE OR DELETE ON evaluation_sections FOR EACH ROW EXECUTE FUNCTION guard_monitoring_period_child();
CREATE TRIGGER evaluation_item_period_guard BEFORE INSERT OR UPDATE OR DELETE ON evaluation_items FOR EACH ROW EXECUTE FUNCTION guard_monitoring_period_child();
CREATE TRIGGER mitigation_task_period_guard BEFORE INSERT OR UPDATE OR DELETE ON mitigation_tasks FOR EACH ROW EXECUTE FUNCTION guard_monitoring_period_child();

-- Calendar coverage is distinct from the user-configured submission window.
CREATE FUNCTION monitoring_observation_in_period(pid uuid, period_id uuid, observed date) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE(bool_or(observed>=make_date(p.year,1,1)+(rp.ordinal-1)*CASE r.frequency WHEN 'monthly' THEN interval '1 month' WHEN 'quarterly' THEN interval '3 months' ELSE interval '6 months' END
 AND observed<make_date(p.year,1,1)+rp.ordinal*CASE r.frequency WHEN 'monthly' THEN interval '1 month' WHEN 'quarterly' THEN interval '3 months' ELSE interval '6 months' END),false)
 FROM annual_risk_profile_versions p JOIN monitoring_rules r ON r.id=p.monitoring_rule_id JOIN monitoring_rule_periods rp ON rp.rule_id=r.id WHERE p.id=pid AND rp.id=period_id
$$;
CREATE FUNCTION guard_monitoring_observation_and_completion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d jsonb; observed date; today date;
BEGIN
 d:=to_jsonb(NEW);
 IF NEW.monitoring_period_id IS NULL THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='risk_monitorings' THEN observed:=(d->>'observed_at')::date;
 ELSIF TG_TABLE_NAME='working_papers' THEN observed:=(d->>'observation_cutoff')::date; END IF;
 today := (COALESCE(NULLIF(current_setting('manris.simulated_now',true),'')::timestamptz,clock_timestamp()) AT TIME ZONE 'Asia/Jakarta')::date;
 IF TG_TABLE_NAME<>'evaluations' AND (observed IS NULL OR observed>today OR NOT monitoring_observation_in_period(NEW.profile_version_id,NEW.monitoring_period_id,observed)) THEN
  RAISE EXCEPTION 'Tanggal pengamatan harus berada dalam periode kalender terpilih dan tidak melewati hari ini.' USING ERRCODE='23514';
 END IF;
 IF TG_TABLE_NAME='risk_monitorings' AND d->>'status'='final' AND NOT COALESCE((d->'draft_payload'->>'observedScoreConfirmed')::boolean,false) THEN
  RAISE EXCEPTION 'Tinjau dan konfirmasi penilaian risiko sebelum finalisasi pemantauan.' USING ERRCODE='23514';
 END IF;
 IF TG_TABLE_NAME='evaluations' AND d->>'status'='final' AND (NOT EXISTS(SELECT 1 FROM evaluation_sections s JOIN evaluation_items i ON i.section_id=s.id WHERE s.evaluation_id=NEW.id) OR EXISTS(SELECT 1 FROM evaluation_sections s JOIN evaluation_items i ON i.section_id=s.id WHERE s.evaluation_id=NEW.id AND i.answer NOT IN ('yes','no'))) THEN
  RAISE EXCEPTION 'Jawab setiap butir evaluasi sebelum finalisasi.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER monitoring_observation_guard BEFORE INSERT OR UPDATE ON risk_monitorings FOR EACH ROW EXECUTE FUNCTION guard_monitoring_observation_and_completion();
CREATE TRIGGER wp_observation_guard BEFORE INSERT OR UPDATE ON working_papers FOR EACH ROW EXECUTE FUNCTION guard_monitoring_observation_and_completion();
CREATE TRIGGER evaluation_completion_guard BEFORE INSERT OR UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION guard_monitoring_observation_and_completion();

CREATE FUNCTION protect_selected_monitoring_period_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM monitoring_rules WHERE id=NEW.rule_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM annual_risk_profile_versions WHERE monitoring_rule_id=NEW.rule_id) THEN RAISE EXCEPTION 'Aturan yang sudah dipilih profil tidak dapat diubah.' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER monitoring_period_insert_immutable BEFORE INSERT ON monitoring_rule_periods FOR EACH ROW EXECUTE FUNCTION protect_selected_monitoring_period_insert();
