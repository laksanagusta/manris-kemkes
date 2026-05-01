-- Impact Criteria Matrix table per KMK BAB IV
CREATE TABLE IF NOT EXISTS impact_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('kebijakan','reputasi','fraud_korupsi','legal','kepatuhan','operasional')),
    upr_level TEXT NOT NULL CHECK (upr_level IN ('kementerian','upr_t1','upr_t2')),
    impact_level INTEGER NOT NULL CHECK (impact_level BETWEEN 1 AND 5),
    impact_label TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category, upr_level, impact_level, description)
);

CREATE INDEX IF NOT EXISTS idx_impact_criteria_category_level ON impact_criteria(category, upr_level);

-- Seed complete KMK impact criteria matrix (90 rows: 6 categories × 3 UPR levels × 5 impact levels)
-- Descriptions sourced from kmk.md Tabel 2: Kriteria Level Dampak

-- KEBIJAKAN
INSERT INTO impact_criteria (category, upr_level, impact_level, impact_label, description) VALUES
('kebijakan', 'kementerian', 1, 'Tidak Signifikan', 'Tidak berdampak pada pencapaian tujuan/sasaran/indikator kinerja secara umum; hanya berdampak pada satu pihak'),
('kebijakan', 'kementerian', 2, 'Kecil', 'Mengganggu pencapaian tujuan/sasaran/indikator kinerja meskipun tidak signifikan; berdampak pada 2 pihak'),
('kebijakan', 'kementerian', 3, 'Sedang', 'Mengganggu pencapaian tujuan/sasaran/indikator kinerja secara signifikan; berdampak pada 3 pihak'),
('kebijakan', 'kementerian', 4, 'Besar', 'Sebagian kecil tujuan/sasaran/indikator kinerja gagal dilaksanakan; berdampak pada 4 pihak'),
('kebijakan', 'kementerian', 5, 'Katastropik', 'Sebagian besar tujuan/sasaran/indikator kinerja gagal dilaksanakan; berdampak pada lebih dari 4 pihak'),
('kebijakan', 'upr_t1', 1, 'Tidak Signifikan', 'Tidak berdampak pada pencapaian tujuan/sasaran/indikator kinerja secara umum; hanya berdampak pada satu pihak'),
('kebijakan', 'upr_t1', 2, 'Kecil', 'Mengganggu pencapaian tujuan/sasaran/indikator kinerja meskipun tidak signifikan; berdampak pada 2 pihak'),
('kebijakan', 'upr_t1', 3, 'Sedang', 'Mengganggu pencapaian tujuan/sasaran/indikator kinerja secara signifikan; berdampak pada 3 pihak'),
('kebijakan', 'upr_t1', 4, 'Besar', 'Sebagian kecil tujuan/sasaran/indikator kinerja gagal dilaksanakan; berdampak pada 4 pihak'),
('kebijakan', 'upr_t1', 5, 'Katastropik', 'Sebagian besar tujuan/sasaran/indikator kinerja gagal dilaksanakan; berdampak pada lebih dari 4 pihak'),
('kebijakan', 'upr_t2', 1, 'Tidak Signifikan', 'Tidak berdampak pada pencapaian tujuan/sasaran/indikator kinerja secara umum'),
('kebijakan', 'upr_t2', 2, 'Kecil', 'Mengganggu pencapaian tujuan/sasaran/indikator kinerja meskipun tidak signifikan'),
('kebijakan', 'upr_t2', 3, 'Sedang', 'Mengganggu pencapaian tujuan/sasaran/indikator kinerja secara signifikan'),
('kebijakan', 'upr_t2', 4, 'Besar', 'Sebagian kecil tujuan/sasaran/indikator kinerja gagal dilaksanakan'),
('kebijakan', 'upr_t2', 5, 'Katastropik', 'Sebagian besar tujuan/sasaran/indikator kinerja gagal dilaksanakan'),

-- REPUTASI
('reputasi', 'kementerian', 1, 'Tidak Signifikan', 'Keluhan ≤ 20; investor/pemberi hibah ≥ 5; kepuasan = Sangat Baik'),
('reputasi', 'kementerian', 2, 'Kecil', 'Keluhan 21-30; investor/pemberi hibah ≥ 4; kepuasan = Baik'),
('reputasi', 'kementerian', 3, 'Sedang', 'Pemberitaan negatif masif di medsos; media massa lokal; investor ≤ 3; kepuasan = Kurang Baik'),
('reputasi', 'kementerian', 4, 'Besar', 'Pemberitaan negatif masif di medsos; media massa nasional; investor ≤ 2; kepuasan = Tidak Baik'),
('reputasi', 'kementerian', 5, 'Katastropik', 'Investor/pemberi hibah = 0; pemberitaan media massa internasional'),
('reputasi', 'upr_t1', 1, 'Tidak Signifikan', 'Keluhan ≤ 20; investor/pemberi hibah ≥ 5; kepuasan = Sangat Baik'),
('reputasi', 'upr_t1', 2, 'Kecil', 'Keluhan 21-30; investor/pemberi hibah ≤ 4; kepuasan = Baik'),
('reputasi', 'upr_t1', 3, 'Sedang', 'Pemberitaan negatif masif di medsos; media massa lokal; investor ≤ 3'),
('reputasi', 'upr_t1', 4, 'Besar', 'Pemberitaan negatif masif di medsos; media massa nasional; investor ≤ 2'),
('reputasi', 'upr_t1', 5, 'Katastropik', 'Investor/pemberi hibah = 0; pemberitaan media massa internasional'),
('reputasi', 'upr_t2', 1, 'Tidak Signifikan', 'Keluhan ≤ 20; investor/pemberi hibah ≥ 5; kepuasan = Sangat Baik'),
('reputasi', 'upr_t2', 2, 'Kecil', 'Keluhan 21-30; investor/pemberi hibah ≤ 4; kepuasan = Baik'),
('reputasi', 'upr_t2', 3, 'Sedang', 'Pemberitaan negatif masif di medsos; media massa lokal'),
('reputasi', 'upr_t2', 4, 'Besar', 'Pemberitaan negatif masif di medsos; media massa nasional'),
('reputasi', 'upr_t2', 5, 'Katastropik', 'Investor/pemberi hibah = 0; pemberitaan media massa internasional'),

-- FRAUD/KORUPSI
('fraud_korupsi', 'kementerian', 1, 'Tidak Signifikan', 'Kerugian Keuangan > Rp10 Juta - 20 Juta'),
('fraud_korupsi', 'kementerian', 2, 'Kecil', 'Kerugian Keuangan > 20 Juta - 100 Juta'),
('fraud_korupsi', 'kementerian', 3, 'Sedang', 'Kerugian Keuangan > 100 Juta - 1 Milyar'),
('fraud_korupsi', 'kementerian', 4, 'Besar', 'Kerugian Keuangan > 1 Milyar - 100 Milyar'),
('fraud_korupsi', 'kementerian', 5, 'Katastropik', 'Kerugian Keuangan > 100 Milyar'),
('fraud_korupsi', 'upr_t1', 1, 'Tidak Signifikan', 'Kerugian Keuangan > 5 Juta - 10 Juta'),
('fraud_korupsi', 'upr_t1', 2, 'Kecil', 'Kerugian Keuangan > Rp10 Juta - 20 Juta'),
('fraud_korupsi', 'upr_t1', 3, 'Sedang', 'Kerugian Keuangan > 20 Juta - 100 Juta'),
('fraud_korupsi', 'upr_t1', 4, 'Besar', 'Kerugian Keuangan > 100 Juta - 150 Juta'),
('fraud_korupsi', 'upr_t1', 5, 'Katastropik', 'Kerugian Keuangan > 150 Juta'),
('fraud_korupsi', 'upr_t2', 1, 'Tidak Signifikan', 'Kerugian Keuangan ≤ 1 - <5 Juta'),
('fraud_korupsi', 'upr_t2', 2, 'Kecil', 'Kerugian Keuangan > 5 Juta - 10 Juta'),
('fraud_korupsi', 'upr_t2', 3, 'Sedang', 'Kerugian Keuangan > 10 Juta - 20 Juta'),
('fraud_korupsi', 'upr_t2', 4, 'Besar', 'Kerugian Keuangan > 20 Juta - 100 Juta'),
('fraud_korupsi', 'upr_t2', 5, 'Katastropik', 'Kerugian Keuangan > 100 Juta'),

-- LEGAL
('legal', 'kementerian', 1, 'Tidak Signifikan', 'Perdata ≤ 100 juta; administratif: tergugat di bawah eselon II'),
('legal', 'kementerian', 2, 'Kecil', 'Perdata > 100 juta - 1 Milyar; administratif: tergugat eselon II'),
('legal', 'kementerian', 3, 'Sedang', 'Pidana ≤ 1 tahun; eselon II; Perdata > 1 Milyar - 10 Milyar'),
('legal', 'kementerian', 4, 'Besar', 'Pidana > 1-5 tahun; Eselon I; Perdata > 10 Milyar - 100 Milyar'),
('legal', 'kementerian', 5, 'Katastropik', 'Pidana > 5 tahun/Menteri; Perdata > 100 Miliar; Tergugat Menteri'),
('legal', 'upr_t1', 1, 'Tidak Signifikan', 'Perdata < 50 juta'),
('legal', 'upr_t1', 2, 'Kecil', 'Perdata 50-100 juta'),
('legal', 'upr_t1', 3, 'Sedang', 'Perdata > 100 juta - 1 Milyar; Pidana ≤ 1 tahun; eselon II'),
('legal', 'upr_t1', 4, 'Besar', 'Pidana > 1 tahun; Eselon I; Perdata > 1 Milyar - 10 Milyar'),
('legal', 'upr_t1', 5, 'Katastropik', 'Pidana > 5 tahun; Perdata > 10 Milyar - 100 Milyar; Tergugat Menteri'),
('legal', 'upr_t2', 1, 'Tidak Signifikan', 'Perdata ≤ 25 juta'),
('legal', 'upr_t2', 2, 'Kecil', 'Perdata > 25 juta - 50 juta'),
('legal', 'upr_t2', 3, 'Sedang', 'Perdata 50-100 juta; Pidana ≤ 1 tahun; di bawah eselon II'),
('legal', 'upr_t2', 4, 'Besar', 'Perdata > 100 juta - 1 Milyar; Pidana > 1 tahun; Eselon II'),
('legal', 'upr_t2', 5, 'Katastropik', 'Perdata > 1 Milyar'),

-- KEPATUHAN
('kepatuhan', 'kementerian', 1, 'Tidak Signifikan', 'Tidak berdampak pada pencapaian tujuan/sasaran secara umum; dapat ditangani rutin'),
('kepatuhan', 'kementerian', 2, 'Kecil', 'Mengganggu pencapaian tujuan/sasaran meskipun tidak signifikan; mengancam efisiensi beberapa aspek'),
('kepatuhan', 'kementerian', 3, 'Sedang', 'Mengganggu pencapaian tujuan/sasaran secara signifikan; mengganggu pelayanan secara signifikan'),
('kepatuhan', 'kementerian', 4, 'Besar', 'Sebagian kecil tujuan/sasaran gagal dilaksanakan; mengancam fungsi program'),
('kepatuhan', 'kementerian', 5, 'Katastropik', 'Sebagian besar tujuan/sasaran gagal dilaksanakan; mengancam tujuan strategis'),
('kepatuhan', 'upr_t1', 1, 'Tidak Signifikan', 'Tidak berdampak pada pencapaian tujuan program secara umum; dapat ditangani rutin'),
('kepatuhan', 'upr_t1', 2, 'Kecil', 'Mengganggu pencapaian tujuan program meskipun tidak signifikan'),
('kepatuhan', 'upr_t1', 3, 'Sedang', 'Mengganggu pencapaian tujuan program secara signifikan; mengganggu pelayanan'),
('kepatuhan', 'upr_t1', 4, 'Besar', 'Sebagian tujuan program gagal dilaksanakan; mengancam fungsi program'),
('kepatuhan', 'upr_t1', 5, 'Katastropik', 'Sebagian besar tujuan program gagal dilaksanakan; mengancam Program'),
('kepatuhan', 'upr_t2', 1, 'Tidak Signifikan', 'Tidak berdampak pada pencapaian tujuan kegiatan secara umum; dapat ditangani rutin'),
('kepatuhan', 'upr_t2', 2, 'Kecil', 'Mengganggu pencapaian tujuan kegiatan meskipun tidak signifikan'),
('kepatuhan', 'upr_t2', 3, 'Sedang', 'Mengganggu pencapaian tujuan kegiatan secara signifikan; mengganggu pelayanan'),
('kepatuhan', 'upr_t2', 4, 'Besar', 'Sebagian tujuan kegiatan gagal dilaksanakan; mengancam fungsi kegiatan'),
('kepatuhan', 'upr_t2', 5, 'Katastropik', 'Sebagian besar tujuan kegiatan gagal dilaksanakan; mengancam Pelaksanaan'),

-- OPERASIONAL
('operasional', 'kementerian', 1, 'Tidak Signifikan', 'Terganggungnya pelayanan kurang dari satu hari kerja'),
('operasional', 'kementerian', 2, 'Kecil', 'Terganggunya pelayanan lebih dari 1 hari kerja hingga 2 hari kerja'),
('operasional', 'kementerian', 3, 'Sedang', 'Terganggunya pelayanan lebih dari 2 hari kerja hingga 3 hari kerja'),
('operasional', 'kementerian', 4, 'Besar', 'Terganggunya pelayanan lebih dari 3 hari kerja hingga 5 hari kerja'),
('operasional', 'kementerian', 5, 'Katastropik', 'Terganggunya pelayanan lebih dari 5 hari kerja'),
('operasional', 'upr_t1', 1, 'Tidak Signifikan', 'Terganggungnya pelayanan kurang dari satu hari kerja'),
('operasional', 'upr_t1', 2, 'Kecil', 'Terganggunya pelayanan lebih dari 1 hari kerja hingga 2 hari kerja'),
('operasional', 'upr_t1', 3, 'Sedang', 'Terganggunya pelayanan lebih dari 2 hari kerja hingga 3 hari kerja'),
('operasional', 'upr_t1', 4, 'Besar', 'Terganggunya pelayanan lebih dari 3 hari kerja hingga 5 hari kerja'),
('operasional', 'upr_t1', 5, 'Katastropik', 'Terganggunya pelayanan lebih dari 5 hari kerja'),
('operasional', 'upr_t2', 1, 'Tidak Signifikan', 'Terganggungnya pelayanan kurang dari satu hari kerja'),
('operasional', 'upr_t2', 2, 'Kecil', 'Terganggunya pelayanan lebih dari 1 hari kerja hingga 2 hari kerja'),
('operasional', 'upr_t2', 3, 'Sedang', 'Terganggunya pelayanan lebih dari 2 hari kerja hingga 3 hari kerja'),
('operasional', 'upr_t2', 4, 'Besar', 'Terganggunya pelayanan lebih dari 3 hari kerja hingga 5 hari kerja'),
('operasional', 'upr_t2', 5, 'Katastropik', 'Terganggunya pelayanan lebih dari 5 hari kerja')
ON CONFLICT (category, upr_level, impact_level, description) DO NOTHING;

-- Add impact criteria fields to risks table
ALTER TABLE risks ADD COLUMN IF NOT EXISTS impact_criteria_id UUID REFERENCES impact_criteria(id);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS impact_justification TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_risks_impact_criteria_id ON risks(impact_criteria_id);