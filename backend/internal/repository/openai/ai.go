package openai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/sashabaranov/go-openai"
)

// aiRepository implements AIRepository using OpenAI API
type aiRepository struct {
	client   *openai.Client
	riskRepo repository.RiskRepository
}

// NewAIRepository creates a new OpenAI-based AI repository
func NewAIRepository(apiKey string, riskRepo repository.RiskRepository) repository.AIRepository {
	client := openai.NewClient(apiKey)
	return &aiRepository{
		client:   client,
		riskRepo: riskRepo,
	}
}

// GenerateFishbone generates root cause analysis using fishbone diagram
func (r *aiRepository) GenerateFishbone(ctx context.Context, req entity.AIRequest) (*entity.FishboneAnalysis, error) {
	if r.client == nil {
		return nil, fmt.Errorf("OpenAI client is not configured")
	}

	// Validate input
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Build prompt
	prompt := r.buildFishbonePrompt(req.Title, req.Description)

	// Call OpenAI API
	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis resiko profesional. Anda hanya merespons menggunakan JSON yang tersusun rapi dan valid.")
	if err != nil {
		return nil, err
	}

	// Parse response
	var analysis entity.FishboneAnalysis
	if err := json.Unmarshal([]byte(content), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return &analysis, nil
}

// GenerateImpact generates impact description for a risk
func (r *aiRepository) GenerateImpact(ctx context.Context, req entity.AIRequest) (string, error) {
	if r.client == nil {
		return "", fmt.Errorf("OpenAI client is not configured")
	}

	prompt := r.buildImpactPrompt(req.Title, req.Description)

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis resiko andal. Berikan respon sesuai instruksi secara langsung tanpa basa-basi.")
	if err != nil {
		return "", err
	}

	return content, nil
}

// GenerateMitigation generates mitigation action recommendations
func (r *aiRepository) GenerateMitigation(ctx context.Context, req entity.AIRequest) (entity.MitigationAction, error) {
	if r.client == nil {
		return nil, fmt.Errorf("OpenAI client is not configured")
	}

	prompt := r.buildMitigationPrompt(req.Title, req.Description, req.Cause, req.Impact)

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah pakar manajemen resiko. Anda hanya merespons menggunakan JSON array yang berisi 5 (lima) baris aksi mitigasi.")
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var actions entity.MitigationAction
	if err := json.Unmarshal([]byte(content), &actions); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return actions, nil
}

// GenerateMeetingMinutes generates structured meeting minutes from transcript
func (r *aiRepository) GenerateMeetingMinutes(ctx context.Context, transcript string) (*entity.MeetingMinutes, error) {
	if r.client == nil {
		return nil, fmt.Errorf("OpenAI client is not configured")
	}

	prompt := r.buildMinutesPrompt(transcript)

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah notulis profesional. Hanya merespons menggunakan JSON yang tersusun rapi.")
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var minutes entity.MeetingMinutes
	if err := json.Unmarshal([]byte(content), &minutes); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return &minutes, nil
}

// AnalyzeTranscript analyzes meeting transcript and extracts risk suggestions
func (r *aiRepository) AnalyzeTranscript(ctx context.Context, transcript string) (*entity.TranscriptAnalysis, error) {
	if r.client == nil {
		return nil, fmt.Errorf("OpenAI client is not configured")
	}

	prompt := r.buildTranscriptPrompt(transcript)

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis resiko. Hanya merespons menggunakan array JSON yang tersusun rapi.")
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var analysis entity.TranscriptAnalysis
	if err := json.Unmarshal([]byte(content), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return &analysis, nil
}

// GeneratePredictive generates predictive risk scoring based on historical data
func (r *aiRepository) GeneratePredictive(ctx context.Context, risks []entity.Risk) ([]entity.PredictiveRisk, error) {
	if r.client == nil {
		return nil, fmt.Errorf("OpenAI client is not configured")
	}

	// Limit to top 10 risks
	limit := 10
	if len(risks) < limit {
		limit = len(risks)
	}

	if limit == 0 {
		return []entity.PredictiveRisk{}, nil
	}

	prompt := r.buildPredictivePrompt(risks[:limit])

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis resiko AI. Hanya balas dengan valid array of JSON objects.")
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var predictions []entity.PredictiveRisk
	if err := json.Unmarshal([]byte(content), &predictions); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return predictions, nil
}

// GenerateRiskSuggestions generates unique risk suggestions different from existing ones
func (r *aiRepository) GenerateRiskSuggestions(ctx context.Context) (*entity.RiskSuggestions, error) {
	if r.client == nil {
		return nil, fmt.Errorf("OpenAI client is not configured")
	}

	// Fetch existing risks
	existingRisks, err := r.riskRepo.List(ctx, nil, "")
	if err != nil {
		// Continue even if we can't fetch existing risks
		existingRisks = []*entity.Risk{}
	}

	// Build list of existing titles
	existingTitles := make(map[string]bool)
	for _, risk := range existingRisks {
		existingTitles[strings.ToLower(strings.TrimSpace(risk.Title))] = true
	}

	// Create array of existing titles
	existingTitlesList := make([]string, 0, len(existingTitles))
	for title := range existingTitles {
		existingTitlesList = append(existingTitlesList, title)
	}

	existingTitlesJSON, _ := json.Marshal(existingTitlesList)

	// Build prompt
	prompt := r.buildRiskSuggestionPrompt(string(existingTitlesJSON))

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis risiko profesional di sektor kesehatan pemerintahan. Anda hanya merespons menggunakan JSON yang valid.")
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var suggestions entity.RiskSuggestions
	if err := json.Unmarshal([]byte(content), &suggestions); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return &suggestions, nil
}

// Helper methods

func (r *aiRepository) callOpenAI(ctx context.Context, prompt string, systemMessage string) (string, error) {
	resp, err := r.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model: openai.GPT3Dot5Turbo,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: systemMessage,
				},
				{
					Role:    openai.ChatMessageRoleUser,
					Content: prompt,
				},
			},
		},
	)

	if err != nil {
		return "", err
	}

	return resp.Choices[0].Message.Content, nil
}

func cleanMarkdown(content string) string {
	content = strings.TrimPrefix(content, "```json\n")
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```\n")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "\n```")
	content = strings.TrimSuffix(content, "```")
	return content
}

func (r *aiRepository) buildFishbonePrompt(title, description string) string {
	return fmt.Sprintf(`Sebagai analis risiko profesional di Kementerian Kesehatan, buatkan penjabaran akar masalah (Fishbone Diagram) untuk profil risiko di bawah ini.
Judul Risiko: %s
Deskripsi Risiko: %s

Gambarkan akar masalah dalam 5 kategori standar Ishikawa yaitu "manusia", "metode", "mesin", "material", dan "lingkungan".
Setiap kategori minimal 1 dan maksimal 3 penyebab spesifik (dalam Bahasa Indonesia format kalimat pendek).
Kembalikan respon hanya dalam bentuk JSON murni (pastikan valid) tanpa markdown atau backticks 'json' di awal/akhir dengan format berikut:
{
  "categories": {
    "manusia": ["Penyebab 1", "Penyebab 2"],
    "metode": ["Penyebab 1"],
    "mesin": [],
    "material": [],
    "lingkungan": []
  }
}
Pastikan hanya mengembalikan JSON tersebut dan jangan sertakan teks pembuka atau penutup apapun.`, title, description)
}

func (r *aiRepository) buildImpactPrompt(title, description string) string {
	return fmt.Sprintf(`Sebagai analis risiko profesional di pemerintahan / kesehatan, buatkan deskripsi dampak (impact) terukur dari profil risiko di bawah ini jika benar-benar terjadi.
Judul Risiko: %s
Deskripsi Risiko: %s

Sebutkan 3 - 4 kerugian konkrit (bisa berupa poin-poin). Usahakan dampaknya relevan dengan sektor kesehatan / instansi publik.
Kembalikan dalam bentuk teks biasa (plain text format) berupa list berurutan dengan menggunakan angka (1., 2., dst.).
Jangan sertakan teks pembuka maupun penutup, langsung berikan list dampaknya saja.`, title, description)
}

func (r *aiRepository) buildMitigationPrompt(title, description, cause, impact string) string {
	return fmt.Sprintf(`Sebagai analis risiko profesional, buatkan usulan tindakan mitigasi (treatment option) yang praktis, realistis, dan efektif untuk profil risiko berikut.
Judul Risiko: %s
Deskripsi Risiko: %s
Penyebab: %s
Dampak: %s

Berikan tepat 5 rekomendasi konkrit (dalam Bahasa Indonesia format kalimat aktif).
Kembalikan respon DALAM BENTUK JSON array of strings, contoh:
[
  "Menyusun SOP baru...",
  "Melakukan inspeksi rutin...",
  "Mengadakan pelatihan..."
]
Jangan sertakan teks penjelasan apapun selain JSON tersebut.`, title, description, cause, impact)
}

func (r *aiRepository) buildMinutesPrompt(transcript string) string {
	return fmt.Sprintf(`Sebagai asisten notulis ahli di pemerintahan, buatkan struktur Notulensi Rapat (Minutes of Meeting) berdasarkan transkrip berikut:
Transkrip: %s

Kembalikan respon HANYA dalam bentuk JSON yang sesuai dengan struktur berikut, tanpa awalan/akhiran apapun:
{
  "title": "...",
  "date": "YYYY-MM-DD",
  "participants": ["..."],
  "agenda": ["..."],
  "summary": "...",
  "decisions": ["..."],
  "actionItems": [
    { "task": "...", "pic": "...", "deadline": "YYYY-MM-DD", "priority": "High|Medium|Low" }
  ]
}`, transcript)
}

func (r *aiRepository) buildTranscriptPrompt(transcript string) string {
	return fmt.Sprintf(`Sebagai analis risiko handal, berikan saran pembaruan risiko (CREATE, UPDATE, atau DELETE) berdasarkan transkrip rapat berikut.
Transkrip: %s

Kembalikan respon HANYA dalam bentuk array of JSON dengan struktur berikut:
[
  {
    "id": "1",
    "action": "CREATE|UPDATE|DELETE",
    "title": "...",
    "description": "...",
    "quote": "Kutipan kalimat dari transkrip yang menjadi dasar...",
    "reasoning": "...",
    "prefilled": {
      "riskCode": "R-...",
      "source": "Internal|Eksternal",
      "probability": 3,
      "impact": 4,
      "mitigation": "..."
    }
  }
]`, transcript)
}

func (r *aiRepository) buildPredictivePrompt(risks []entity.Risk) string {
	riskSummary := ""
	for _, r := range risks {
		score := float64(r.Probability) * float64(r.Impact)
		lvl := "Rendah"
		if score >= 17 {
			lvl = "Ekstrem"
		} else if score >= 10 {
			lvl = "Tinggi"
		} else if score >= 5 {
			lvl = "Sedang"
		}
		riskSummary += fmt.Sprintf("ID: %s | Title: %s | Level: %s\n", r.Code, r.Title, lvl)
	}

	return fmt.Sprintf(`Sebagai AI Predictive Risk, berikan prediksi tren risiko (naik, turun, stabil) secara analitis dari daftar risiko berikut:
%s

Kembalikan HANYA array of JSON dengan struktur persis seperti ini:
[
  {
    "riskCode": "...",
    "title": "...",
    "currentLevel": "Rendah|Sedang|Tinggi|Ekstrem",
    "predictedLevel": "Rendah|Sedang|Tinggi|Ekstrem",
    "trend": "up|down|stable",
    "confidence": 85,
    "reasoning": "..."
  }
]`, riskSummary)
}

func (r *aiRepository) buildRiskSuggestionPrompt(existingTitlesJSON string) string {
	return fmt.Sprintf(`Sebagai analis risiko profesional di Kementerian Kesehatan Indonesia, buatkan 5 contoh risiko yang BERBEDA dan UNIK untuk organisasi kesehatan pemerintah.

Risiko yang SUDAH ADA di database (HINDARI risiko-risiko ini atau variasi yang mirip):
%s

Tugas:
1. Buat 5 risiko baru yang BERBEDA dari daftar di atas
2. Setiap risiko harus spesifik, realistis, dan relevan dengan konteks organisasi kesehatan/pemerintahan
3. Berikan judul risiko yang jelas dan deskripsi kronologi kejadian yang detail
4. Pastikan judul risiko unik dan tidak mirip dengan yang sudah ada
5. Variasi topik: SDM, infrastruktur, proses bisnis, keuangan, teknologi informasi, kepatuhan, dll.

Format respons JSON (hanya JSON, tanpa markdown):
{
  "suggestions": [
    {
      "title": "Judul Risiko Spesifik",
      "description": "Deskripsi kronologi kejadian risiko yang detail..."
    },
    ...
  ]
}

PENTING:
- Judul harus berbeda dari daftar yang sudah ada
- Jangan buat variasi kecil dari risiko yang sudah ada
- Berikan konteks yang spesifik dan realistis`, existingTitlesJSON)
}

// GenerateKRI generates KRI suggestions for a given risk
func (r *aiRepository) GenerateKRI(ctx context.Context, req entity.AIRequest) (*entity.KRISuggestions, error) {
	if r.client == nil {
		return nil, fmt.Errorf("OpenAI client is not configured")
	}

	if err := req.Validate(); err != nil {
		return nil, err
	}

	prompt := r.buildKRIPrompt(req.Title, req.Description)

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis risiko profesional di sektor kesehatan pemerintahan. Anda hanya merespons menggunakan JSON yang valid.")
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var suggestions entity.KRISuggestions
	if err := json.Unmarshal([]byte(content), &suggestions); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return &suggestions, nil
}

func (r *aiRepository) buildKRIPrompt(title, description string) string {
	return fmt.Sprintf(`Sebagai analis risiko profesional di Kementerian Kesehatan, buatkan 3 Key Risk Indicator (KRI) yang relevan untuk risiko berikut:

Judul Risiko: %s
Deskripsi Risiko: %s

Setiap KRI harus:
1. Memiliki nama indikator yang spesifik dan terukur
2. Memiliki deskripsi singkat tentang apa yang diukur
3. Memiliki satuan ukur (metric) yang jelas (contoh: %%, jumlah, hari, Rp)
4. Memiliki threshold min dan max yang realistis
5. Memiliki direction: "higher_worse" (semakin tinggi semakin buruk) atau "lower_worse" (semakin rendah semakin buruk)
6. Memiliki frequency: "harian", "mingguan", atau "bulanan"

Format respons JSON (hanya JSON, tanpa markdown):
{
  "suggestions": [
    {
      "name": "Nama KRI spesifik",
      "description": "Deskripsi singkat indikator",
      "metric": "satuan ukur",
      "thresholdMin": 0,
      "thresholdMax": 100,
      "direction": "higher_worse",
      "frequency": "bulanan"
    }
  ]
}

PENTING:
- Berikan tepat 3 KRI yang berbeda dan relevan
- threshold harus realistis dan masuk akal untuk konteks kesehatan
- thresholdMin harus lebih kecil dari thresholdMax
- Jangan sertakan teks pembuka atau penutup, hanya JSON`, title, description)
}
