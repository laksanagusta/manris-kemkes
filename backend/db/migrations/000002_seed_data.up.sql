-- Organizations
INSERT INTO organizations (id, name, parent_id) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Ditjen P2P', NULL),
    ('00000000-0000-0000-0000-000000000002', 'Dit. Surveilans dan Kekarantinaan Kesehatan', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000003', 'Dit. Pencegahan dan Pengendalian Penyakit Menular', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000004', 'Dit. Pencegahan dan Pengendalian Penyakit Tidak Menular', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000005', 'Sekretariat Ditjen P2P', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Default Super Admin (password: admin123)
INSERT INTO users (id, name, username, email, password_hash, role, organization_id) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Dika Laksana', 'admin', 'dika@p2p.kemkes.go.id',
     '$2a$10$CK3ePZRtLOZL5yIE9j.0veUiAcsFukGDqd2jPLzeop7oQ3Kgwe8Hy',
     'superadmin', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000002', 'Dr. Andi Pratama', 'andi', 'andi@p2p.kemkes.go.id',
     '$2a$10$CK3ePZRtLOZL5yIE9j.0veUiAcsFukGDqd2jPLzeop7oQ3Kgwe8Hy',
     'unit', '00000000-0000-0000-0000-000000000002'),
    ('10000000-0000-0000-0000-000000000003', 'Prof. Dr. Hendra', 'hendra', 'hendra@p2p.kemkes.go.id',
     '$2a$10$CK3ePZRtLOZL5yIE9j.0veUiAcsFukGDqd2jPLzeop7oQ3Kgwe8Hy',
     'pimpinan', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000004', 'Dr. Farah Indah', 'farah', 'farah@p2p.kemkes.go.id',
     '$2a$10$CK3ePZRtLOZL5yIE9j.0veUiAcsFukGDqd2jPLzeop7oQ3Kgwe8Hy',
     'reviewer', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Sample risks
INSERT INTO risks (id, code, title, description, status, organization_id, created_by, cause, risk_source, controllability, impact_description, existing_control, control_effectiveness, probability, impact, treatment_option, target_probability, target_impact) VALUES
    ('20000000-0000-0000-0000-000000000001', 'R-001', 'Keterlambatan distribusi vaksin ke wilayah terpencil',
     'Distribusi vaksin ke daerah terpencil sering mengalami keterlambatan akibat infrastruktur jalan yang kurang baik dan kurangnya armada pendingin.',
     'approved', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
     '{"Infrastruktur jalan rusak", "armada terbatas", "cuaca ekstrem"}', 'Internal & Eksternal', 'UC',
     '{"Kerusakan vaksin", "gagal target imunisasi", "risiko wabah"}', 'Koordinasi dengan Dinkes daerah',
     'tidak_efektif', 5, 4, 'mitigate', 2, 2),
    ('20000000-0000-0000-0000-000000000002', 'R-002', 'Kebocoran data pasien penyakit menular',
     'Data sensitif pasien TB dan HIV/AIDS berpotensi bocor karena praktik penyimpanan yang tidak aman di beberapa unit.',
     'approved', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
     '{"Shared drive tanpa proteksi", "password lemah"}', 'Internal', 'C',
     '{"Pelanggaran privasi pasien", "tuntutan hukum", "kepercayaan publik menurun"}', 'Kebijakan akses data dasar',
     'tidak_efektif', 4, 5, 'mitigate', 1, 2),
    ('20000000-0000-0000-0000-000000000003', 'R-003', 'Kurangnya tenaga terlatih penanggulangan wabah',
     'Jumlah tenaga kesehatan yang terlatih menangani wabah penyakit menular masih di bawah standar.',
     'final', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002',
     '{"Anggaran pelatihan terbatas", "turnover tinggi"}', 'Internal', 'C',
     '{"Respons lambat saat wabah", "korban meningkat"}', 'Pelatihan tahunan rutin',
     'efektif', 4, 4, 'mitigate', 2, 2),
    ('20000000-0000-0000-0000-000000000004', 'R-007', 'Kegagalan sistem informasi pelaporan penyakit',
     'Sistem SIHA sering mengalami downtime sehingga data surveilans tidak real-time.',
     'approved', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
     '{"Server usang", "tidak ada redundansi", "maintenance terlambat"}', 'Internal', 'C',
     '{"Data surveilans terlambat", "respons outbreak lambat"}', 'Kontrak maintenance tahunan',
     'tidak_efektif', 5, 4, 'mitigate', 2, 2),
    ('20000000-0000-0000-0000-000000000005', 'R-012', 'Inefisiensi anggaran program pengendalian penyakit',
     'Penyerapan anggaran tidak optimal, banyak kegiatan tertunda karena birokrasi pengadaan.',
     'draft', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002',
     '{"Proses pengadaan rumit", "SDM keuangan terbatas"}', 'Internal', 'C',
     '{"Target program tidak tercapai", "sisa anggaran besar"}', 'Rapat monitoring anggaran bulanan',
     'efektif', 3, 5, 'mitigate', 2, 3)
ON CONFLICT DO NOTHING;

-- Sample mitigations
INSERT INTO mitigations (id, risk_id, action, owner, due_date, frequency, sort_order) VALUES
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Menyusun SOP distribusi darurat vaksin', 'Dr. Andi', '2026-04-15', 'insidental', 1),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Menambah 2 vendor ekspedisi cadangan', 'Dr. Andi', '2026-05-01', 'insidental', 2),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000002', 'Implementasi DLP pada semua komputer', 'Ir. Gunawan', '2026-04-30', 'insidental', 1),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000003', 'Pelatihan rapid response team 34 provinsi', 'Dr. Citra', '2026-06-30', 'rutin', 1)
ON CONFLICT DO NOTHING;
