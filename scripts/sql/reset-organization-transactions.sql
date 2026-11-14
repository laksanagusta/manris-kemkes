-- Manrisk, schema migration 83.
-- Ganti UUID organisasi pada satu baris INSERT di bawah.
-- Jalankan saat aktivitas tulis organisasi dihentikan.
-- Default ROLLBACK. Ganti baris terakhir menjadi COMMIT untuk menyimpan penghapusan.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL search_path = public, pg_temp;

CREATE TEMP TABLE purge_org (id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO purge_org VALUES ('00000000-0000-0000-0000-000000000000');

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = (SELECT id FROM purge_org)) THEN
        RAISE EXCEPTION 'UUID organisasi tidak ditemukan. Isi UUID target pada INSERT purge_org.';
    END IF;
END $$;

SELECT id, name AS organisasi_target FROM organizations WHERE id IN (SELECT id FROM purge_org);
SELECT id FROM organizations WHERE id IN (SELECT id FROM purge_org) FOR UPDATE;

-- Tampung seluruh versi, termasuk draf dan arsip.
CREATE TEMP TABLE purge_ids (
    table_name text NOT NULL,
    id uuid NOT NULL,
    PRIMARY KEY (table_name, id)
) ON COMMIT DROP;

INSERT INTO purge_ids
SELECT 'risks', id FROM risks WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'incidents', id FROM incidents WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'controls', id FROM controls WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'lessons_learned', id FROM lessons_learned WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'working_papers', id FROM working_papers WHERE org_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'evaluations', id FROM evaluations WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'formal_reports', id FROM formal_reports WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'risk_charters', id FROM risk_charters WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'risk_objectives', id FROM risk_objectives WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'tmpmr_assessments', id FROM tmpmr_assessments WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'meeting_minutes', id FROM meeting_minutes WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'annual_risk_profile_versions', id FROM annual_risk_profile_versions WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'upr_report_versions', id FROM upr_report_versions WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'risk_cascades', id FROM risk_cascades
    WHERE source_org_id IN (SELECT id FROM purge_org) OR target_org_id IN (SELECT id FROM purge_org);

INSERT INTO purge_ids
SELECT 'upr_report_deliveries', d.id FROM upr_report_deliveries d
WHERE d.recipient_organization_id IN (SELECT id FROM purge_org)
   OR d.report_version_id IN (SELECT id FROM purge_ids WHERE table_name = 'upr_report_versions')
UNION ALL
SELECT 'risk_monitorings', m.id FROM risk_monitorings m
WHERE m.source_risk_id IN (SELECT id FROM purge_ids WHERE table_name = 'risks')
UNION ALL
SELECT 'mitigations', m.id FROM mitigations m
WHERE m.risk_id IN (SELECT id FROM purge_ids WHERE table_name = 'risks');

INSERT INTO purge_ids
SELECT 'mitigation_tasks', t.id FROM mitigation_tasks t
WHERE t.risk_id IN (SELECT id FROM purge_ids WHERE table_name = 'risks')
UNION ALL
SELECT 'risk_event_notes', n.id FROM risk_event_notes n
WHERE n.event_id IN (SELECT id FROM purge_ids WHERE table_name = 'incidents')
UNION ALL
SELECT 'approval_requests', a.id FROM approval_requests a
WHERE a.entity_id IN (SELECT id FROM purge_ids);

-- Rekap transaksi utama sebelum penghapusan.
SELECT table_name, count(*) AS jumlah
FROM purge_ids GROUP BY table_name ORDER BY table_name;

-- Snapshot dan histori pengiriman lebih dulu.
DELETE FROM upr_report_deliveries WHERE id IN (
    SELECT id FROM purge_ids WHERE table_name = 'upr_report_deliveries'
);
DELETE FROM upr_report_versions WHERE id IN (
    SELECT id FROM purge_ids WHERE table_name = 'upr_report_versions'
);
DELETE FROM annual_risk_profile_members WHERE profile_version_id IN (
    SELECT id FROM purge_ids WHERE table_name = 'annual_risk_profile_versions'
);
DELETE FROM annual_risk_profile_versions WHERE id IN (
    SELECT id FROM purge_ids WHERE table_name = 'annual_risk_profile_versions'
);

DELETE FROM approval_histories WHERE approval_request_id IN (
    SELECT id FROM purge_ids WHERE table_name = 'approval_requests'
);
DELETE FROM approval_steps WHERE approval_request_id IN (
    SELECT id FROM purge_ids WHERE table_name = 'approval_requests'
);
DELETE FROM approval_requests WHERE id IN (
    SELECT id FROM purge_ids WHERE table_name = 'approval_requests'
);

-- Anak KK dan Evaluasi memiliki ON DELETE CASCADE.
DELETE FROM working_papers WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'working_papers');
DELETE FROM evaluations WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'evaluations');
DELETE FROM formal_reports WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'formal_reports');
DELETE FROM tmpmr_assessments WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'tmpmr_assessments');
DELETE FROM risk_cascades WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'risk_cascades');
DELETE FROM meeting_minutes WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'meeting_minutes');

DELETE FROM mitigation_tasks WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'mitigation_tasks');

-- Ledger periode memakai version_group_id. Pertahankan ledger kelompok yang
-- masih dimiliki risiko organisasi lain.
DELETE FROM risk_monitoring_periods p
WHERE EXISTS (
    SELECT 1 FROM risks r
    WHERE r.version_group_id = p.version_group_id
      AND r.id IN (SELECT id FROM purge_ids WHERE table_name = 'risks')
)
AND NOT EXISTS (
    SELECT 1 FROM risks r
    WHERE r.version_group_id = p.version_group_id
      AND r.organization_id IS DISTINCT FROM (SELECT id FROM purge_org)
);

DELETE FROM risk_monitorings WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'risk_monitorings');
DELETE FROM risk_event_notes WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'risk_event_notes');
DELETE FROM incidents WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'incidents');
DELETE FROM mitigations WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'mitigations');
DELETE FROM controls WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'controls');
DELETE FROM lessons_learned WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'lessons_learned');

-- Semua versi risiko organisasi dihapus dalam satu statement agar referensi
-- previous_risk_id antarversi dalam organisasi terselesaikan bersama.
DELETE FROM risks WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'risks');
DELETE FROM risk_objectives WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'risk_objectives');
DELETE FROM risk_charters WHERE id IN (SELECT id FROM purge_ids WHERE table_name = 'risk_charters');
DELETE FROM audit_logs WHERE entity_id IN (SELECT id FROM purge_ids);

-- Pemeriksaan akhir transaksi utama target.
SELECT 'risks' AS tabel, count(*) AS sisa FROM risks WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'incidents', count(*) FROM incidents WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'working_papers', count(*) FROM working_papers WHERE org_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'evaluations', count(*) FROM evaluations WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'annual_profiles', count(*) FROM annual_risk_profile_versions WHERE organization_id IN (SELECT id FROM purge_org)
UNION ALL SELECT 'upr_reports', count(*) FROM upr_report_versions WHERE organization_id IN (SELECT id FROM purge_org);

ROLLBACK;
-- Untuk penghapusan permanen, ganti ROLLBACK di atas dengan COMMIT.
