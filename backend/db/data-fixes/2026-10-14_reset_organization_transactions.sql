-- Reset transaksi satu organisasi, SEMUA tahun/periode dan SEMUA versi risiko.
-- Berdasarkan skema repositori sampai migration 000071; bukan migration otomatis.
-- Cakupan: risiko, monitoring/jadwal, mitigasi/tugas, insiden/link, workpaper,
-- approval risiko, komunikasi, kontrol/pengujian, lessons learned, notulen/link,
-- laporan formal, evaluasi/item, dan penilaian maturitas TMPMR/item.
-- Dipertahankan: organizations, users/auth, API keys, planning*, risk_charters,
-- risk_objectives, impact_criteria, evaluation_templates*, external_pics,
-- organization_groups*, system_settings, audit_logs, dan chat*.
-- Audit tetap tersimpan sebagai histori; file lampiran di storage tidak dihapus.
-- Jalankan saat input/cron transaksi dihentikan; lock juga menahan penulisan
-- pada tabel transaksi selama transaksi ini, termasuk organisasi lain.
-- Jalankan dengan role maintenance yang dapat melihat seluruh baris (bypass RLS).
-- Guard memeriksa FK relasional; referensi teks/JSON dalam histori tidak diubah.
-- Jadwal yatim tanpa risiko/version group yang masih ada tidak dapat diatribusikan
-- ke organisasi karena risk_monitoring_periods tidak punya organization_id.
-- Jalankan seluruh file dalam satu koneksi. Jika error, lakukan ROLLBACK.
-- DEFAULT: dry run (DELETE sungguhan dalam transaksi, lalu ROLLBACK).
-- Setelah memeriksa hasil dan menyiapkan backup, ganti ROLLBACK terakhir
-- dengan COMMIT untuk menerapkan reset. Jangan mengubah constraint/trigger.

BEGIN;
SET LOCAL search_path = public, pg_temp;
SET LOCAL row_security = off;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';

CREATE TEMP TABLE _reset_config (organization_id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _reset_config VALUES ('45d10cad-084d-4a05-9a3e-9317305f34bb'::uuid);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = (SELECT organization_id FROM _reset_config)
    ) THEN
        RAISE EXCEPTION 'Organisasi target tidak ditemukan; reset dibatalkan';
    END IF;
END $$;
SELECT id, name FROM public.organizations
WHERE id = (SELECT organization_id FROM _reset_config);

CREATE TEMP TABLE _reset_tables (
    capture_order integer PRIMARY KEY,
    table_name text UNIQUE NOT NULL,
    delete_order integer NOT NULL,
    scope_sql text NOT NULL
) ON COMMIT DROP;
INSERT INTO _reset_tables VALUES
    (1, 'risks', 100, 'organization_id = (SELECT organization_id FROM _reset_config)'),
    (2, 'risk_monitorings', 90, 'source_risk_id IN (SELECT id FROM _reset_rows WHERE table_name = ''risks'')'),
    (3, 'mitigations', 80, 'risk_id IN (SELECT id FROM _reset_rows WHERE table_name = ''risks'')'),
    (4, 'mitigation_tasks', 70, 'risk_id IN (SELECT id FROM _reset_rows WHERE table_name = ''risks'')'),
    (5, 'risk_monitoring_periods', 60, 'version_group_id IN (SELECT version_group_id FROM public.risks WHERE id IN (SELECT id FROM _reset_rows WHERE table_name = ''risks''))'),
    (6, 'likelihood_assessments', 110, 'risk_id IN (SELECT id FROM _reset_rows WHERE table_name = ''risks'')'),
    (7, 'communication_logs', 60, 'risk_id IN (SELECT id FROM _reset_rows WHERE table_name = ''risks'')'),
    (8, 'risk_cascades', 60, 'source_org_id = (SELECT organization_id FROM _reset_config) OR target_org_id = (SELECT organization_id FROM _reset_config)'),
    (9, 'incidents', 85, 'organization_id = (SELECT organization_id FROM _reset_config)'),
    (10, 'working_papers', 55, 'org_id = (SELECT organization_id FROM _reset_config)'),
    (11, 'working_paper_risks', 50, 'working_paper_id IN (SELECT id FROM _reset_rows WHERE table_name = ''working_papers'')'),
    (12, 'working_paper_risk_exclusions', 50, 'working_paper_id IN (SELECT id FROM _reset_rows WHERE table_name = ''working_papers'')'),
    (13, 'working_paper_signatories', 50, 'working_paper_id IN (SELECT id FROM _reset_rows WHERE table_name = ''working_papers'')'),
    (14, 'meeting_minutes', 55, 'organization_id = (SELECT organization_id FROM _reset_config)'),
    (15, 'meeting_minutes_risks', 50, 'meeting_id IN (SELECT id FROM _reset_rows WHERE table_name = ''meeting_minutes'')'),
    (16, 'controls', 55, 'organization_id = (SELECT organization_id FROM _reset_config)'),
    (17, 'control_tests', 50, 'control_id IN (SELECT id FROM _reset_rows WHERE table_name = ''controls'')'),
    (18, 'lessons_learned', 55, 'organization_id = (SELECT organization_id FROM _reset_config)'),
    (19, 'formal_reports', 55, 'organization_id = (SELECT organization_id FROM _reset_config)'),
    (20, 'evaluations', 55, 'organization_id = (SELECT organization_id FROM _reset_config)'),
    (21, 'evaluation_sections', 50, 'evaluation_id IN (SELECT id FROM _reset_rows WHERE table_name = ''evaluations'')'),
    (22, 'evaluation_items', 45, 'section_id IN (SELECT id FROM _reset_rows WHERE table_name = ''evaluation_sections'')'),
    (23, 'tmpmr_assessments', 55, 'organization_id = (SELECT organization_id FROM _reset_config)'),
    (24, 'tmpmr_items', 50, 'assessment_id IN (SELECT id FROM _reset_rows WHERE table_name = ''tmpmr_assessments'')'),
    (25, 'approval_requests', 40, 'request_type IN (''risk'', ''assessment'') AND entity_id IN (SELECT id FROM _reset_rows WHERE table_name = ''risks'')'),
    (26, 'approval_histories', 30, 'approval_request_id IN (SELECT id FROM _reset_rows WHERE table_name = ''approval_requests'')'),
    (27, 'approval_steps', 30, 'approval_request_id IN (SELECT id FROM _reset_rows WHERE table_name = ''approval_requests'')');

-- Lock tabel target dan semua tabel yang langsung mereferensikannya agar
-- tidak muncul referensi baru di antara pemeriksaan dan DELETE.
DO $$
DECLARE t record;
BEGIN
    FOR t IN
        SELECT n.nspname, c.relname
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.oid IN (
            SELECT ('public.' || table_name)::regclass::oid FROM _reset_tables
            UNION SELECT 'public.incident_risk_links'::regclass::oid
            UNION
            SELECT fk.conrelid FROM pg_constraint fk
            WHERE fk.contype = 'f' AND fk.confrelid IN (
                SELECT ('public.' || table_name)::regclass::oid FROM _reset_tables
            )
        )
        ORDER BY n.nspname, c.relname
    LOOP
        EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE', t.nspname, t.relname);
    END LOOP;
END $$;

CREATE TEMP TABLE _reset_rows (
    table_name text NOT NULL,
    id uuid NOT NULL,
    PRIMARY KEY (table_name, id)
) ON COMMIT DROP;
DO $$
DECLARE t record;
BEGIN
    FOR t IN SELECT table_name, scope_sql FROM _reset_tables ORDER BY capture_order LOOP
        EXECUTE format(
            'INSERT INTO _reset_rows SELECT %L, id FROM public.%I WHERE %s',
            t.table_name, t.table_name, t.scope_sql
        );
    END LOOP;
END $$;

CREATE TEMP TABLE _reset_incident_links ON COMMIT DROP AS
SELECT l.incident_id, l.risk_id FROM public.incident_risk_links l
WHERE l.incident_id IN (SELECT id FROM _reset_rows WHERE table_name = 'incidents')
   OR l.risk_id IN (SELECT id FROM _reset_rows WHERE table_name = 'risks');

-- Stop jika version group atau link cascade/insiden melibatkan organisasi lain.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.risks r
        WHERE r.organization_id IS DISTINCT FROM (SELECT organization_id FROM _reset_config)
          AND r.version_group_id IN (
              SELECT version_group_id FROM public.risks
              WHERE id IN (SELECT id FROM _reset_rows WHERE table_name = 'risks')
          )
    ) THEN
        RAISE EXCEPTION 'Version group risiko dipakai organisasi lain; reset dibatalkan';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.risk_cascades c
        WHERE c.id IN (SELECT id FROM _reset_rows WHERE table_name = 'risk_cascades')
          AND (c.source_org_id IS DISTINCT FROM (SELECT organization_id FROM _reset_config)
               OR c.target_org_id IS DISTINCT FROM (SELECT organization_id FROM _reset_config))
    ) THEN
        RAISE EXCEPTION 'Ada cascade lintas organisasi; tinjau link sebelum reset';
    END IF;
    IF EXISTS (
        SELECT 1 FROM _reset_incident_links l
        JOIN public.incidents i ON i.id = l.incident_id
        JOIN public.risks r ON r.id = l.risk_id
        WHERE i.organization_id IS DISTINCT FROM (SELECT organization_id FROM _reset_config)
           OR r.organization_id IS DISTINCT FROM (SELECT organization_id FROM _reset_config)
    ) THEN
        RAISE EXCEPTION 'Ada link insiden-risiko lintas organisasi; reset dibatalkan';
    END IF;
END $$;

-- Periksa semua FK aktif di database, termasuk CASCADE dan SET NULL.
-- Setiap child yang mereferensikan target harus masuk daftar penghapusan.
-- Ini mencegah perubahan diam-diam pada transaksi organisasi lain.
DO $$
DECLARE fk record; outside_scope boolean;
BEGIN
    FOR fk IN
        SELECT k.conname, ns.nspname AS child_schema, c.relname AS child_table,
               p.relname AS parent_table, ca.attname AS child_column,
               pa.attname AS parent_column,
               cardinality(k.conkey) AS column_count
        FROM pg_constraint k
        JOIN pg_class c ON c.oid = k.conrelid
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        JOIN pg_class p ON p.oid = k.confrelid
        JOIN pg_namespace pn ON pn.oid = p.relnamespace
        JOIN pg_attribute ca ON ca.attrelid = k.conrelid AND ca.attnum = k.conkey[1]
        JOIN pg_attribute pa ON pa.attrelid = k.confrelid AND pa.attnum = k.confkey[1]
        WHERE k.contype = 'f' AND pn.nspname = 'public'
          AND p.relname IN (SELECT DISTINCT table_name FROM _reset_rows)
    LOOP
        IF fk.column_count <> 1 OR fk.parent_column <> 'id' THEN
            RAISE EXCEPTION 'FK % belum didukung skrip; tinjau skema sebelum reset', fk.conname;
        END IF;
        EXECUTE format($query$
            SELECT EXISTS (
                SELECT 1 FROM %I.%I child
                JOIN _reset_rows parent
                  ON parent.table_name = %L AND parent.id = child.%I
                WHERE NOT EXISTS (
                    SELECT 1 FROM _reset_rows selected
                    WHERE %L = 'public' AND selected.table_name = %L
                      AND selected.id::text = to_jsonb(child)->>'id'
                ) AND NOT (
                    %L = 'public' AND %L = 'incident_risk_links'
                    AND EXISTS (
                        SELECT 1 FROM _reset_incident_links l
                        WHERE l.incident_id::text = to_jsonb(child)->>'incident_id'
                          AND l.risk_id::text = to_jsonb(child)->>'risk_id'
                    )
                )
            )
        $query$, fk.child_schema, fk.child_table, fk.parent_table, fk.child_column,
                 fk.child_schema, fk.child_table, fk.child_schema, fk.child_table)
        INTO outside_scope;
        IF outside_scope THEN
            RAISE EXCEPTION 'Referensi di luar cakupan: %.% via FK %. Reset dibatalkan',
                fk.child_schema, fk.child_table, fk.conname;
        END IF;
    END LOOP;
END $$;

-- Jumlah SEBELUM reset; seluruh versi/draft/final ikut dihitung.
SELECT t.table_name, count(r.id) AS rows_before
FROM _reset_tables t LEFT JOIN _reset_rows r USING (table_name)
GROUP BY t.table_name
UNION ALL SELECT 'incident_risk_links', count(*) FROM _reset_incident_links
ORDER BY table_name;

DELETE FROM public.incident_risk_links l
USING _reset_incident_links target
WHERE l.incident_id = target.incident_id AND l.risk_id = target.risk_id;

-- Child lebih dahulu; likelihood_assessments terhapus lewat CASCADE risiko
-- agar FK melingkar risks.likelihood_assessment_id tidak dilanggar.
DO $$
DECLARE t record;
BEGIN
    FOR t IN SELECT table_name FROM _reset_tables ORDER BY delete_order, table_name LOOP
        EXECUTE format(
            'DELETE FROM public.%I WHERE id IN (SELECT id FROM _reset_rows WHERE table_name = %L)',
            t.table_name, t.table_name
        );
    END LOOP;
END $$;

-- Verifikasi scope awal dan predicate organisasi: semua harus nol.
CREATE TEMP TABLE _reset_results (
    table_name text, remaining_target_rows bigint, remaining_scope_rows bigint
) ON COMMIT DROP;
DO $$
DECLARE t record; target_count bigint; scope_count bigint;
BEGIN
    FOR t IN SELECT table_name, scope_sql FROM _reset_tables ORDER BY capture_order LOOP
        EXECUTE format(
            'SELECT count(*) FROM public.%I WHERE id IN (SELECT id FROM _reset_rows WHERE table_name = %L)',
            t.table_name, t.table_name
        ) INTO target_count;
        EXECUTE format('SELECT count(*) FROM public.%I WHERE %s', t.table_name, t.scope_sql)
        INTO scope_count;
        INSERT INTO _reset_results VALUES (t.table_name, target_count, scope_count);
        IF target_count <> 0 OR scope_count <> 0 THEN
            RAISE EXCEPTION 'Verifikasi gagal: transaksi % belum kosong', t.table_name;
        END IF;
    END LOOP;
    IF EXISTS (
        SELECT 1 FROM public.incident_risk_links l JOIN _reset_incident_links target
        ON l.incident_id = target.incident_id AND l.risk_id = target.risk_id
    ) THEN
        RAISE EXCEPTION 'Verifikasi gagal: incident_risk_links belum kosong';
    END IF;
END $$;
SELECT table_name, remaining_target_rows, remaining_scope_rows FROM _reset_results ORDER BY table_name;

-- Dry run: seluruh DELETE di atas dibatalkan. Ganti dengan COMMIT untuk reset.
ROLLBACK;

-- Setelah reset dengan COMMIT, perbarui statistik planner (jalankan terpisah):
-- ANALYZE public.risks, public.risk_monitorings, public.risk_monitoring_periods,
--         public.mitigations, public.mitigation_tasks, public.incidents,
--         public.working_papers, public.working_paper_risks;
