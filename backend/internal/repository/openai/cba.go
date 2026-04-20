package openai

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// cbaRepository implements CBARepository using OpenAI API
type cbaRepository struct {
	ai *aiRepository
}

// NewCBARepository creates a new CBA repository backed by OpenAI
func NewCBARepository(ai repository.AIRepository) repository.CBARepository {
	return &cbaRepository{
		ai: ai.(*aiRepository),
	}
}

// RecommendVariables generates CBA variable recommendations
func (r *cbaRepository) RecommendVariables(ctx context.Context, riskDescription string, orgContext string) (*entity.CBARecommendation, error) {
	if r.ai.client == nil {
		return nil, fmt.Errorf("OpenAI client is not configured")
	}

	if riskDescription == "" {
		return nil, fmt.Errorf("risk description is required")
	}

	prompt := r.buildRecommendPrompt(riskDescription)

	content, err := r.ai.callOpenAI(ctx, prompt, "Anda adalah ekonom kesehatan profesional yang ahli dalam Evaluasi Ekonomi Kesehatan (Health Economic Evaluation) menggunakan pendekatan Perspektif Sosial sesuai standar WHO. Anda hanya merespons menggunakan JSON yang valid.", "cba", orgContext)
	if err != nil {
		return nil, err
	}

	content = cleanMarkdown(content)

	var recommendation entity.CBARecommendation
	if err := json.Unmarshal([]byte(content), &recommendation); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	jsn, _ := json.Marshal(recommendation)
	fmt.Println(string(jsn))

	return &recommendation, nil
}

func (r *cbaRepository) buildRecommendPrompt(riskDescription string) string {
	return fmt.Sprintf(`Sebagai ekonom kesehatan yang menggunakan framework Evaluasi Ekonomi Kesehatan WHO dengan Perspektif Sosial, buatkan daftar variabel biaya untuk analisis Cost-Benefit Analysis (CBA) dari risiko kesehatan berikut:

Deskripsi Risiko: %s

Tugas:
1. Identifikasi variabel-variabel KERUGIAN (Cost of Inaction) dan kelompokkan ke dalam 3 kategori:
   - **Biaya Medis Langsung** (biayaMedis): biaya rawat inap, rawat jalan, obat, laboratorium, dll
   - **Biaya Operasional/Respons** (biayaOperasional): biaya surveilans, logistik, pelatihan petugas, mobilisasi tim, dll
   - **Biaya Produktivitas Sosial** (biayaProduktivitas): hilangnya hari kerja, kematian dini (DALY), beban caregiver, dll

2. Identifikasi variabel-variabel BIAYA INTERVENSI (Cost of Action) yang dibutuhkan untuk program pencegahan:
   - **Biaya Intervensi Program** (biayaIntervensi): vaksinasi, pelatihan petugas, pengadaan alat, kampanye edukasi, surveilans aktif, dll

3. Untuk setiap variabel, berikan:
   - name: Nama variabel yang spesifik dan terukur (dalam Bahasa Indonesia)
   - category: salah satu dari "biaya_medis", "biaya_operasional", "biaya_produktivitas", "biaya_intervensi"
   - unit: satuan ukur (contoh: "Rp/kasus", "Rp/hari", "hari/kasus", "Rp/orang")
   - multiplierType: tipe operasi pengalian yang logis ("per_case" untuk dikali estimasi kasus, "per_population" untuk dikali populasi, atau "fixed" untuk biaya tetap)
   - value: Estimasi nominal biaya satuan dalam bentuk angka (float/integer) tanpa simbol apapun, mengacu pada standar wajar di Indonesia (contoh: 5000000)
   - description: penjelasan singkat apa yang diukur
   - source: sumber standar asumsi (contoh: "Tarif INA-CBGs Kemenkes", "Data BPS", "Standar WHO CHOICE")

Berikan minimal 3 dan maksimal 5 variabel per kategori.

Format respons JSON (hanya JSON, tanpa markdown):
{
  "biayaMedis": [
    {
      "name": "Biaya Rawat Inap per Kasus",
      "category": "biaya_medis",
      "unit": "Rp/kasus",
      "multiplierType": "per_case",
      "value": 4500000,
      "description": "Rata-rata biaya rawat inap berdasarkan tarif INA-CBGs kelas 2",
      "source": "Tarif INA-CBGs Kemenkes"
    }
  ],
  "biayaOperasional": [...],
  "biayaProduktivitas": [...],
  "biayaIntervensi": [
    {
      "name": "Biaya Vaksinasi per Orang",
      "category": "biaya_intervensi",
      "unit": "Rp/orang",
      "multiplierType": "per_population",
      "value": 150000,
      "description": "Biaya vaksinasi lengkap termasuk logistik cold chain",
      "source": "Estimasi Standar Biaya Kemenkes"
    }
  ]
}

PENTING:
- Variabel harus spesifik dan relevan dengan risiko yang dideskripsikan
- multiplierType hanya boleh berisi "per_case", "per_population", atau "fixed"
- Nilai 'value' WAJIB diisi dengan estimasi angka wajar di Indonesia, bukan nol.
- biayaIntervensi harus berisi komponen biaya program pencegahan yang realistis
- Jangan sertakan teks pembuka atau penutup, hanya JSON`, riskDescription)
}
