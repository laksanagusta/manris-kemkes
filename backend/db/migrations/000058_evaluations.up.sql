CREATE TABLE evaluation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_key, version)
);

CREATE TABLE evaluation_template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES evaluation_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, section_key)
);

CREATE TABLE evaluation_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES evaluation_template_sections(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    item_no TEXT NOT NULL,
    label TEXT NOT NULL,
    default_condition TEXT NOT NULL DEFAULT '',
    default_description TEXT NOT NULL DEFAULT '',
    default_analysis TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (section_id, item_key)
);

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period TEXT NOT NULL,
    template_id UUID NOT NULL REFERENCES evaluation_templates(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
    report_number TEXT NOT NULL DEFAULT '',
    report_date DATE,
    assignment_letter_number TEXT NOT NULL DEFAULT '',
    assignment_letter_date DATE,
    monitoring_date_range TEXT NOT NULL DEFAULT '',
    unit_code TEXT NOT NULL DEFAULT '',
    unit_location TEXT NOT NULL DEFAULT '',
    unit_address TEXT NOT NULL DEFAULT '',
    unit_eselon_i TEXT NOT NULL DEFAULT '',
    unit_leader_name TEXT NOT NULL DEFAULT '',
    team_coordinator TEXT NOT NULL DEFAULT '',
    team_lead TEXT NOT NULL DEFAULT '',
    team_members TEXT NOT NULL DEFAULT '',
    problems TEXT NOT NULL DEFAULT '',
    recommendations TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id),
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, period, template_id)
);

CREATE TABLE evaluation_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    template_section_id UUID REFERENCES evaluation_template_sections(id),
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    conclusion TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (evaluation_id, section_key)
);

CREATE TABLE evaluation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES evaluation_sections(id) ON DELETE CASCADE,
    template_item_id UUID REFERENCES evaluation_template_items(id),
    item_key TEXT NOT NULL,
    item_no TEXT NOT NULL,
    label TEXT NOT NULL,
    answer TEXT NOT NULL DEFAULT 'unset' CHECK (answer IN ('unset','yes','no')),
    condition TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    analysis TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (section_id, item_key)
);

CREATE INDEX idx_evaluations_org_period ON evaluations(organization_id, period);
CREATE INDEX idx_evaluations_status ON evaluations(status);
CREATE INDEX idx_evaluation_sections_evaluation ON evaluation_sections(evaluation_id);
CREATE INDEX idx_evaluation_items_section ON evaluation_items(section_id);

WITH tmpl AS (
    INSERT INTO evaluation_templates (template_key, name, version, status)
    VALUES ('monitoring_evaluation_kmk', 'Laporan Monitoring & Evaluasi MR - KMK', 1, 'active')
    RETURNING id
),
sections AS (
    INSERT INTO evaluation_template_sections (template_id, section_key, title, description, sort_order)
    SELECT tmpl.id, data.section_key, data.title, data.description, data.sort_order
    FROM tmpl
    CROSS JOIN (VALUES
        ('document_completeness', 'Kelengkapan dokumen pendukung pemantauan dan evaluasi penerapan manajemen risiko', '', 10),
        ('infrastructure_adequacy', 'Pengujian atas kecukupan infrastruktur / rancangan proses MR', '', 20),
        ('implementation_result', 'Pengujian atas hasil pelaksanaan manajemen risiko', '', 30),
        ('mitigation_monitoring', 'Format pemantauan pelaksanaan mitigasi risiko', '', 40)
    ) AS data(section_key, title, description, sort_order)
    RETURNING id, section_key
)
INSERT INTO evaluation_template_items (section_id, item_key, item_no, label, sort_order)
SELECT sections.id, item.item_key, item.item_no, item.label, item.sort_order
FROM sections
JOIN (VALUES
    ('document_completeness', 'policy_basis', '1', 'Kebijakan yang mendasari penerapan manajemen risiko', 10),
    ('document_completeness', 'risk_team_decree', '2', 'SK tim Penyelenggara Manajemen Risiko', 20),
    ('document_completeness', 'planning_document', '3', 'RAP untuk UPR-T.I, RAK/RSB untuk UPR-T.II', 30),
    ('document_completeness', 'annual_work_plan', '4', 'RKT untuk UPT, Renja K untuk Eselon II dan I (Awal dan Revisi)', 40),
    ('document_completeness', 'business_process', '5', 'Proses Bisnis / Strategi Maps', 50),
    ('document_completeness', 'risk_profile', '6', 'Profil Risiko UPR-T.I/UPR-T.II', 60),
    ('document_completeness', 'risk_communication', '7', 'Dokumen pengkomunikasian risiko kepada pihak terkait (contoh: pegawai, stakeholder dll)', 70),
    ('document_completeness', 'mitigation_evidence', '8', 'Dokumen Rencana Pengendalian/mitigasi dan bukti pelaksanaan', 80),
    ('document_completeness', 'periodic_mr_report', '9', 'Laporan Pelaksanaan Manajemen Risiko (Berkala)', 90),
    ('infrastructure_adequacy', 'leader_understanding', '1.a.1', 'Pemahaman pimpinan sebagai role model dan pemahaman pemilik risiko', 10),
    ('infrastructure_adequacy', 'risk_info_decision', '1.a.2', 'Menggunakan informasi terkait risiko dalam pengambilan keputusan', 20),
    ('infrastructure_adequacy', 'risk_culture', '1.a.3', 'Pimpinan mendorong penerapan MR dan budaya sadar risiko', 30),
    ('infrastructure_adequacy', 'competent_staff', '1.b.1', 'MR dikelola oleh pegawai yang berkompeten', 40),
    ('infrastructure_adequacy', 'capacity_building', '1.b.2', 'Pegawai mendapatkan kesempatan peningkatan kapasitas SDM dalam MR', 50),
    ('infrastructure_adequacy', 'training_program', '1.b.3', 'Memiliki program pelatihan/sertifikasi terkait MR', 60),
    ('infrastructure_adequacy', 'partnership_risk', '1.c', 'Kemitraan telah mengidentifikasi, menilai dan mengelola risiko terkait seluruh kemitraan', 70),
    ('infrastructure_adequacy', 'integrated_process', '1.d', 'Proses manajemen risiko telah terintegrasi dengan proses bisnis utama unit kerja', 80),
    ('infrastructure_adequacy', 'control_environment_weakness', '2.a', 'Identifikasi kelemahan lingkungan pengendalian', 90),
    ('infrastructure_adequacy', 'risk_assessment_done', '2.b', 'Penilaian Risiko telah dilakukan', 100),
    ('infrastructure_adequacy', 'mitigation_plan_done', '2.c', 'Rencana mitigasi risiko telah ditetapkan dan dilaksanakan', 110),
    ('infrastructure_adequacy', 'periodic_monitoring_done', '2.d', 'Pemantauan berkala pelaksanaan mitigasi telah dilakukan', 120),
    ('infrastructure_adequacy', 'periodic_report_done', '2.e', 'Laporan pemantauan berkala dan laporan akhir pelaksanaan manajemen risiko telah disusun', 130),
    ('implementation_result', 'mitigation_realized', '1.a', 'Aktivitas mitigasi risiko telah dijalankan atau direalisasikan sesuai dengan rencana', 10),
    ('implementation_result', 'post_mitigation_incident', '1.b', 'Terjadi kejadian risiko pasca penerapan mitigasi', 20),
    ('implementation_result', 'risk_level_below_tolerance', '1.c', 'Aktivitas mitigasi berhasil menurunkan level risiko di bawah garis toleransi risiko', 30),
    ('implementation_result', 'target_achieved', '2', 'Tujuan organisasi dan target kinerja organisasi tercapai', 40)
) AS item(section_key, item_key, item_no, label, sort_order)
ON item.section_key = sections.section_key;
